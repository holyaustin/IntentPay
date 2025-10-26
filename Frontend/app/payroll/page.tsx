// app/payroll/page.tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, CheckCircle } from "lucide-react";
import {
  schedulePayments,
  executeAllPayments,
  sendToYield,
  approveERC20,
  TESTNET_TOKENS,
  getProvider,
  getTokenBalance,
  getPayrollReadOnly,
} from "@/lib/contract";

export default function PayrollPage() {
  const [step, setStep] = useState(1);
  const [isNative, setIsNative] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState("");
  const [recipients, setRecipients] = useState([{ address: "", amount: "" }]);
  const [walletAddress, setWalletAddress] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  // sum of recipient amounts (number)
  const totalToDistribute = recipients.reduce(
    (acc, r) => acc + (parseFloat(r.amount || "0") || 0),
    0
  );
  // remaining is optional UI metric; we don't use it to compute msg.value
  const remaining = parseFloat(totalAmount || "0") - totalToDistribute;

  // load wallet address
  useEffect(() => {
    (async () => {
      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());
      } catch {
        // ignore
      }
    })();
  }, []);

  // fetch token balance for display
  useEffect(() => {
    (async () => {
      if (!walletAddress) return;
      try {
        if (isNative) {
          const provider = await getProvider();
          const bal = await provider.getBalance(walletAddress);
          setTokenBalance((Number(bal.toString()) / 1e18).toFixed(4));
        } else if (selectedToken) {
          const meta = Object.values(TESTNET_TOKENS).find(
            (t) => t.address.toLowerCase() === selectedToken.toLowerCase()
          );
          const decs = meta ? meta.decimals : 18;
          const bal = await getTokenBalance(selectedToken, walletAddress, decs);
          setTokenBalance(bal);
        }
      } catch {
        setTokenBalance("0");
      }
    })();
  }, [walletAddress, selectedToken, isNative]);

  const handleAddRecipient = () =>
    setRecipients([...recipients, { address: "", amount: "" }]);

  const handleChange = (idx: number, field: string, value: string) => {
    const updated = [...recipients];
    (updated[idx] as any)[field] = value;
    setRecipients(updated);
  };

  // Helper: compute native total (BigNumber-like via string sum)
  const computeNativeSum = () => {
    // sum only recipient amounts (all recipients considered native when isNative=true)
    // return string value (decimal) e.g. "1.25"
    const sum = recipients.reduce((acc, r) => acc + (parseFloat(r.amount || "0") || 0), 0);
    // return as decimal string with up to 18 decimals if needed
    return sum.toString();
  };

  // Schedule batch payments
  const handleSchedule = async () => {
    try {
      // local validation
      if (recipients.length === 0) {
        toast.error("Add at least one recipient", { duration: 8000 });
        return;
      }
      for (const r of recipients) {
        if (!r.address) {
          toast.error("Every recipient must have an address", { duration: 8000 });
          return;
        }
        if (!r.amount || Number(r.amount) <= 0) {
          toast.error("Every recipient must have amount > 0", { duration: 8000 });
          return;
        }
      }

      // prepare arrays
      const recs = recipients.map((r) => r.address);
      const toks = recipients.map(() =>
        isNative ? "0x0000000000000000000000000000000000000000" : selectedToken
      );
      const amts = recipients.map((r) => r.amount);
      const cids = recipients.map(() => 296);

      // If ERC20, approve contract to spend the total sum (respect token decimals)
      if (!isNative && selectedToken) {
        // try detect decimals from TESTNET_TOKENS
        const meta = Object.values(TESTNET_TOKENS).find(
          (t) => t.address.toLowerCase() === selectedToken.toLowerCase()
        );
        const decimals = meta ? meta.decimals : 18;
        await approveERC20(selectedToken, amts.reduce((acc, a) => acc + Number(a), 0).toString(), decimals);
      }

      // If native, compute total native sum from recipients and ensure > 0
      if (isNative) {
        const nativeTotal = computeNativeSum();
        if (!nativeTotal || Number(nativeTotal) <= 0) {
          toast.error("Native total must be > 0", { duration: 8000 });
          return;
        }
        // UI shows toast to user for confirmation
        toast.loading(`Sending ${nativeTotal} HBAR as msg.value...`, { duration: 8000 });
      }

      setLoading(true);
      toast.loading("Scheduling payments (on-chain)...", { duration: 8000 });

      // call helper — helper will compute overrides.value correctly from recipients & tokens
      await schedulePayments(recs, toks, amts, cids, isNative);

      toast.success("✅ Payments scheduled", { duration: 8000 });
      setStep(2);
    } catch (err: any) {
      // show revert reason clearly and keep longer duration
      const message = err?.data?.message || err?.message || String(err);
      toast.error(String(message), { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  // Execute payments
  const handleExecute = async () => {
    try {
      setLoading(true);
      toast.loading("Executing payments...", { duration: 8000 });

      // Get payments count for attempts
      const readOnly = await getPayrollReadOnly();
      const countBn = await readOnly.getPaymentsCount();
      const count = Number(countBn);

      if (count === 0) {
        toast.error("No payments found to execute", { duration: 8000 });
        setLoading(false);
        return;
      }

      await executeAllPayments(count);

      toast.success("✅ Payments executed", { duration: 8000 });
      setStep(3);
    } catch (err: any) {
      const message = err?.data?.message || err?.message || String(err);
      toast.error(String(message), { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  // Deposit remainder to yield vault
  const handleYield = async () => {
    try {
      const nativeTotal = computeNativeSum();
      // If remaining <=0, show finish
      const remainingNum = parseFloat(totalAmount || "0") - totalToDistribute;
      if (remainingNum <= 0) {
        toast.error("No remaining balance to deposit", { duration: 8000 });
        return;
      }

      setLoading(true);
      toast.loading("Depositing to yield...", { duration: 8000 });
      await sendToYield(isNative ? "0x0000000000000000000000000000000000000000" : selectedToken, remainingNum.toString());
      toast.success("✅ Deposited to yield", { duration: 8000 });
    } catch (err: any) {
      const message = err?.data?.message || err?.message || String(err);
      toast.error(String(message), { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  // Stepper UI (green theme)
  const StepItem = ({ i, label }: { i: number; label: string }) => {
    const idx = i;
    const active = step === idx;
    const done = step > idx;
    return (
      <div className="flex items-center cursor-pointer" onClick={() => setStep(idx)}>
        <div className="flex flex-col items-center mr-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${done || active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}>
            {done ? <CheckCircle size={16} /> : idx}
          </div>
          <div className={`mt-2 text-sm ${active ? "text-green-600" : "text-gray-700"}`}>{label}</div>
        </div>
        {i < 3 && <div className={`h-1 w-24 ${done ? "bg-green-600" : "bg-gray-200"} mr-4`} />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-6">Payroll</h1>

      <div className="w-full max-w-3xl bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between">
          <StepItem i={1} label="Schedule Payment" />
          <StepItem i={2} label="Execute Payment" />
          <StepItem i={3} label="Deposit to Yield" />
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg bg-white rounded-xl p-6 shadow">
          <div className="mb-4">
            <label className="font-medium">Payment Type</label>
            <select className="w-full p-2 border rounded mt-1" value={isNative ? "native" : "erc20"} onChange={(e) => setIsNative(e.target.value === "native")}>
              <option value="native">Native (HBAR)</option>
              <option value="erc20">ERC20 Token</option>
            </select>
          </div>

          {!isNative && (
            <div className="mb-4">
              <label className="font-medium">Select ERC20 Token</label>
              <select className="w-full p-2 border rounded mt-1" value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
                <option value="">-- Choose Token --</option>
                {Object.entries(TESTNET_TOKENS).map(([k, v]) => (
                  <option key={k} value={v.address}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="font-medium">Total Amount (optional)</label>
            <input type="number" placeholder="0.0" className="w-full p-2 border rounded mt-1" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
            <p className="text-sm text-gray-600 mt-1">Balance: {tokenBalance} {isNative ? "HBAR" : "TOKEN"}</p>
          </div>

          <hr className="my-3" />

          {recipients.map((r, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input placeholder="Recipient Address" value={r.address} onChange={(e) => handleChange(idx, "address", e.target.value)} className="w-2/3 p-2 border rounded" />
              <input placeholder="Amount" value={r.amount} onChange={(e) => handleChange(idx, "amount", e.target.value)} className="w-1/3 p-2 border rounded" />
            </div>
          ))}

          {/* Smaller but bold Add more recipient button */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleAddRecipient} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded text-base font-bold hover:bg-green-700">
              <PlusCircle size={18} /> Add more recipient
            </button>

            <div className="text-sm text-gray-600">Total to Distribute: <b>{totalToDistribute}</b></div>
          </div>

          <p className="text-sm text-gray-500 mb-4">Remaining: {remaining > 0 ? remaining : 0}</p>

          <button disabled={loading} onClick={handleSchedule} className="w-full bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">{loading ? "Processing..." : "Schedule Payments"}</button>
        </motion.div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg bg-white rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Review Recipients ({recipients.length})</h2>
          {recipients.map((r, i) => (
            <div key={i} className="text-sm text-gray-700 mb-1">• {r.address} → {r.amount}</div>
          ))}

          <div className="flex justify-between mt-6">
            <button onClick={handleBack} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Back</button>
            <button onClick={handleExecute} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">{loading ? "Executing..." : "Execute Payments"}</button>
          </div>
        </motion.div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg bg-white rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Deposit to Yield</h2>
          <p className="mb-4 text-sm">Remaining balance: <b>{remaining > 0 ? remaining.toFixed(4) : "0"} {isNative ? "HBAR" : "TOKEN"}</b></p>

          {remaining > 0 ? (
            <button onClick={handleYield} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">{loading ? "Sending..." : "Deposit to Yield"}</button>
          ) : (
            <button onClick={() => (window.location.href = "/transactions")} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Finish</button>
          )}
        </motion.div>
      )}
    </div>
  );
}
