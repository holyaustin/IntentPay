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
import { HermesClient } from "@pythnetwork/hermes-client";

export default function PayrollPage() {
  // ---------------- STATE ----------------
  const [step, setStep] = useState(1);
  const [useNative, setUseNative] = useState(true);
  const [selectedToken, setSelectedToken] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [recipients, setRecipients] = useState([{ address: "", amount: "" }]);
  const [walletAddress, setWalletAddress] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [hbarPrice, setHbarPrice] = useState<string>("Loading...");

  const totalToDistribute = recipients.reduce(
    (acc, r) => acc + (parseFloat(r.amount || "0") || 0),
    0
  );
  const remaining = parseFloat(totalAmount || "0") - totalToDistribute;

  // ---------------- FETCH HBAR PRICE ----------------
  useEffect(() => {
    const fetchPythPrice = async () => {
      try {
        const client = new HermesClient("https://hermes.pyth.network", {});
        const priceIds = [
          // HBAR/USD feed ID from Pyth docs
          "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd",
        ];

        const priceUpdates = await client.getLatestPriceUpdates(priceIds);

        console.log("✅ Pyth priceUpdates:", priceUpdates);

        if (priceUpdates?.parsed?.length > 0) {
          const entry = priceUpdates.parsed[0];
          const raw = entry.price.price;
          const expo = entry.price.expo;
          const adjusted = raw * Math.pow(10, expo);

          setHbarPrice(`$${adjusted.toFixed(6)} USD / HBAR`);
        } else {
          setHbarPrice("Unavailable");
        }
      } catch (err) {
        console.error("❌ Pyth price fetch failed:", err);
        setHbarPrice("Unavailable");
      }
    };

    fetchPythPrice();
    const interval = setInterval(fetchPythPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // ---------------- CONNECT WALLET ----------------
  useEffect(() => {
    (async () => {
      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());
      } catch (err) {
        console.error("Wallet not found:", err);
        toast.error("Connect your wallet");
      }
    })();
  }, []);

  // ---------------- FETCH BALANCE ----------------
  useEffect(() => {
    (async () => {
      if (!walletAddress) return;
      try {
        if (useNative) {
          const provider = await getProvider();
          const bal = await provider.getBalance(walletAddress);
          // HBAR has 8 decimals
          setTokenBalance((Number(bal.toString()) / 1e8).toFixed(4));
        } else if (selectedToken) {
          const meta = Object.values(TESTNET_TOKENS).find(
            (t) => t.address.toLowerCase() === selectedToken.toLowerCase()
          );
          const decimals = meta ? meta.decimals : 18;
          const bal = await getTokenBalance(
            selectedToken,
            walletAddress,
            decimals
          );
          setTokenBalance(bal);
        }
      } catch (err) {
        console.error("Balance fetch error:", err);
        setTokenBalance("0");
      }
    })();
  }, [walletAddress, selectedToken, useNative]);

  // ---------------- RECIPIENT HANDLERS ----------------
  const handleAddRecipient = () =>
    setRecipients([...recipients, { address: "", amount: "" }]);

  const handleChange = (idx: number, field: string, value: string) => {
    const updated = [...recipients];
    (updated[idx] as any)[field] = value;
    setRecipients(updated);
  };

  // ---------------- SCHEDULE ----------------
  const handleSchedule = async () => {
    try {
      if (recipients.length === 0) {
        toast.error("Add at least one recipient");
        return;
      }

      for (const r of recipients) {
        if (!r.address) {
          toast.error("Every recipient must have an address");
          return;
        }
        if (!r.amount || isNaN(Number(r.amount)) || Number(r.amount) <= 0) {
          toast.error("Amount must be greater than zero");
          return;
        }
      }

      const recs = recipients.map((r) => r.address);
      const toks = recipients.map(() =>
        useNative
          ? "0x0000000000000000000000000000000000000000"
          : selectedToken
      );
      const amts = recipients.map((r) => r.amount);
      const cids = recipients.map(() => 296); // Hedera testnet = 296

      // Approve ERC20 if needed
      if (!useNative && selectedToken) {
        const meta = Object.values(TESTNET_TOKENS).find(
          (t) => t.address === selectedToken
        );
        const decimals = meta?.decimals || 18;
        const totalERC20 = amts.reduce((acc, a) => acc + Number(a), 0);
        await approveERC20(selectedToken, totalERC20.toString(), decimals);
      }

      console.log("🚀 schedulePayments sending:", {
        recipients: recs,
        tokens: toks,
        amounts: amts,
        chainIds: cids,
      });

      setLoading(true);
      toast.loading("Scheduling payments...");
      await schedulePayments(recs, toks, amts, cids);
      toast.success("✅ Payments scheduled!");
      setStep(2);
    } catch (err: any) {
      console.error("Schedule failed:", err);
      toast.error(err?.reason || err?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- EXECUTE ----------------
  const handleExecute = async () => {
    try {
      setLoading(true);
      toast.loading("Executing...");
      const readOnly = await getPayrollReadOnly();
      const count = Number(await readOnly.getPaymentsCount());
      if (count === 0) {
        toast.error("No payments to execute");
        setLoading(false);
        return;
      }

      console.log("🚀 executeAllPayments with count:", count);
      await executeAllPayments(count);
      toast.success("✅ Executed!");
      setStep(3);
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- YIELD ----------------
  const handleYield = async () => {
    if (remaining <= 0) {
      toast.error("No balance to deposit");
      return;
    }
    try {
      setLoading(true);
      toast.loading("Depositing...");
      const tokenAddr = useNative
        ? "0x0000000000000000000000000000000000000000"
        : selectedToken;

      console.log("🚀 sendToYield:", { tokenAddr, remaining });
      await sendToYield(tokenAddr, remaining.toString());
      toast.success("✅ Deposited to yield!");
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Yield failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- STEPS ----------------
  const StepItem = ({ i, label }: { i: number; label: string }) => {
    const active = step === i;
    const done = step > i;
    return (
      <div
        className="flex items-center cursor-pointer"
        onClick={() => setStep(i)}
      >
        <div className="flex flex-col items-center mr-4">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
              done || active
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {done ? <CheckCircle size={16} /> : i}
          </div>
          <div
            className={`mt-2 text-sm ${
              active ? "text-green-600" : "text-gray-700"
            }`}
          >
            {label}
          </div>
        </div>
        {i < 3 && (
          <div
            className={`h-1 w-24 ${
              done ? "bg-green-600" : "bg-gray-200"
            } mr-4`}
          />
        )}
      </div>
    );
  };

  // ---------------- RENDER ----------------
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-2">Payroll</h1>

      {/* ✅ HBAR/USD PRICE LABEL */}
      <div className="mb-6 text-center bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 font-semibold shadow-sm">
        HBAR/USD Price: {hbarPrice}
      </div>

      <div className="w-full max-w-3xl bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex items-center justify-between">
          <StepItem i={1} label="Schedule Payment" />
          <StepItem i={2} label="Execute Payment" />
          <StepItem i={3} label="Deposit to Yield" />
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <div className="mb-4">
            <label className="font-medium">Payment Type</label>
            <select
              className="w-full p-2 border rounded mt-1"
              value={useNative ? "native" : "erc20"}
              onChange={(e) => setUseNative(e.target.value === "native")}
            >
              <option value="native">Native (HBAR)</option>
              <option value="erc20">ERC20 Token</option>
            </select>
          </div>

          {!useNative && (
            <div className="mb-4">
              <label className="font-medium">Select Token</label>
              <select
                className="w-full p-2 border rounded mt-1"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                <option value="">-- Choose --</option>
                {Object.entries(TESTNET_TOKENS).map(([k, v]) => (
                  <option key={k} value={v.address}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="font-medium">Total Amount</label>
            <input
              type="number"
              placeholder="0.0"
              className="w-full p-2 border rounded mt-1"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              Balance: {tokenBalance} {useNative ? "HBAR" : "TOKEN"}
            </p>
          </div>

          <hr className="my-3" />

          {recipients.map((r, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                placeholder="Address"
                value={r.address}
                onChange={(e) => handleChange(idx, "address", e.target.value)}
                className="w-2/3 p-2 border rounded"
              />
              <input
                placeholder="Amount"
                value={r.amount}
                onChange={(e) => handleChange(idx, "amount", e.target.value)}
                className="w-1/3 p-2 border rounded"
              />
            </div>
          ))}

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleAddRecipient}
              className="flex items-center gap-2 bg-green-600 text-white px-2 py-1.5 rounded text-sm font-semibold hover:bg-green-700"
            >
              <PlusCircle size={16} /> Add Recipient
            </button>
            <div className="text-sm text-gray-600">
              Total: <b>{totalToDistribute.toFixed(6)}</b>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Remaining: {remaining > 0 ? remaining.toFixed(6) : 0}
          </p>

          <button
            disabled={loading}
            onClick={handleSchedule}
            className="w-full bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            {loading ? "Processing..." : "Schedule Payments"}
          </button>
        </motion.div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <h2 className="text-lg font-semibold mb-3">
            Review ({recipients.length})
          </h2>
          {recipients.map((r, i) => (
            <div key={i} className="text-sm text-gray-700 mb-1">
              • {r.address} → {r.amount}
            </div>
          ))}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
            >
              Back
            </button>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {loading ? "Executing..." : "Execute"}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Deposit to Yield</h2>
          <p className="mb-4 text-sm">
            Remaining:{" "}
            <b>
              {remaining.toFixed(6)} {useNative ? "HBAR" : "TOKEN"}
            </b>
          </p>
          {remaining > 0 ? (
            <button
              onClick={handleYield}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              {loading ? "Sending..." : "Deposit"}
            </button>
          ) : (
            <button
              onClick={() => (window.location.href = "/")}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Finish
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
