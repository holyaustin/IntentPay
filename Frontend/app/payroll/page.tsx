"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  scheduleBatchPayments,
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
  const [txStatus, setTxStatus] = useState("");

  const totalToDistribute = recipients.reduce(
    (acc, r) => acc + (parseFloat(r.amount || "0") || 0),
    0
  );
  const remaining = parseFloat(totalAmount || "0") - totalToDistribute;

  // get wallet address
  useEffect(() => {
    (async () => {
      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());
      } catch {}
    })();
  }, []);

  // fetch balance when token/wallet changes
  useEffect(() => {
    (async () => {
      if (!walletAddress) return;
      try {
        if (isNative) {
          const provider = await getProvider();
          const bal = await provider.getBalance(walletAddress);
          setTokenBalance((Number(bal.toString()) / 1e18).toFixed(4));
        } else if (selectedToken) {
          const bal = await getTokenBalance(selectedToken, walletAddress);
          setTokenBalance(bal);
        }
      } catch (e) {
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

  // Schedule batch payments
  const handleSchedule = async () => {
    try {
      setLoading(true);
      setTxStatus("Scheduling batch payments...");

      // basic validation
      if (!recipients.length) throw new Error("Add at least one recipient");
      for (const r of recipients) {
        if (!r.address) throw new Error("All recipients must have an address");
        if (!r.amount || Number(r.amount) <= 0)
          throw new Error("All recipients must have an amount > 0");
      }

      // Prepare arrays
      const recipientsList = recipients.map((r) => r.address);
      const amountsList = recipients.map((r) => r.amount);
      const tokensList = recipients.map(() =>
        isNative ? "0x0000000000000000000000000000000000000000" : selectedToken
      );
      const chainIds = recipients.map(() => 296); // Hedera Testnet

      // If ERC20, first approve the payroll contract for the sum (respecting token decimals)
      if (!isNative && selectedToken) {
        const tokenMeta = Object.values(TESTNET_TOKENS).find(
          (t) => t.address.toLowerCase() === selectedToken.toLowerCase()
        );
        const decimals = tokenMeta ? tokenMeta.decimals : 18;
        await approveERC20(selectedToken, totalAmount, decimals);
      }

      // Call the batch schedule (sends msg.value if isNative)
      await scheduleBatchPayments(
        recipientsList,
        tokensList,
        amountsList,
        chainIds,
        isNative
      );

      setTxStatus("✅ Batch scheduled successfully!");
      setStep(2);
    } catch (err: any) {
      setTxStatus(`❌ ${err?.reason || err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Execute all payments (sequentially)
  const handleExecute = async () => {
    try {
      setLoading(true);
      setTxStatus("Executing payments...");

      const readOnly = await getPayrollReadOnly();
      const countBN = await readOnly.getPaymentsCount();
      const count = Number(countBN);

      if (count === 0) {
        setTxStatus("ℹ️ No scheduled payments found");
        setLoading(false);
        return;
      }

      await executeAllPayments(count);

      setTxStatus("✅ Executed payments!");
      setStep(3);
    } catch (err: any) {
      setTxStatus(`❌ ${err?.reason || err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Deposit remaining to yield vault
  const handleYield = async () => {
    try {
      setLoading(true);
      setTxStatus("Sending remainder to yield vault...");
      if (remaining > 0) {
        await sendToYield(
          isNative ? "0x0000000000000000000000000000000000000000" : selectedToken,
          remaining.toString(),
          "Deposit remainder to yield"
        );
      } else {
        setTxStatus("ℹ️ No remainder to deposit");
        setLoading(false);
        return;
      }
      setTxStatus("✅ Deposited to yield vault");
    } catch (err: any) {
      setTxStatus(`❌ ${err?.reason || err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  /* ------------------------
     Stepper visual component
     ------------------------ */
  const Step = ({
    index,
    label,
  }: {
    index: number;
    label: string;
  }) => {
    const active = step === index;
    const done = step > index;
    return (
      <div className="flex-1 relative flex items-center">
        {/* Connecting line */}
        {index !== 1 && (
          <div className={`absolute left-0 top-1/2 w-full h-0.5 transform -translate-y-1/2 z-0`}>
            <div
              className={`h-0.5 ${done ? "bg-blue-600" : "bg-gray-300"}`}
              style={{
                width: "100%",
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              done ? "bg-blue-600 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
            }`}
          >
            {index}
          </div>
          <div className="text-sm">
            <div className={`font-medium ${active ? "text-blue-600" : "text-gray-700"}`}>{label}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-6">Payroll</h1>

      {/* Stepper */}
      <div className="w-full max-w-2xl bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex items-center gap-6 relative">
          <Step index={1} label="Schedule Payment" />
          <Step index={2} label="Execute Payment" />
          <Step index={3} label="Deposit Balance to Yield Vault" />
        </div>
      </div>

      {txStatus && (
        <div className="w-full max-w-lg mb-4">
          <p className="mb-3 text-sm text-gray-700 bg-gray-200 px-3 py-2 rounded">
            {txStatus}
          </p>
        </div>
      )}

      {/* Step 1: Schedule */}
      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <div className="mb-4">
            <label className="font-medium">Payment Type</label>
            <select
              className="w-full p-2 border rounded mt-1"
              value={isNative ? "native" : "erc20"}
              onChange={(e) => setIsNative(e.target.value === "native")}
            >
              <option value="native">Native (HBAR)</option>
              <option value="erc20">ERC20 Token</option>
            </select>
          </div>

          {!isNative && (
            <div className="mb-4">
              <label className="font-medium">Select ERC20 Token</label>
              <select
                className="w-full p-2 border rounded mt-1"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                <option value="">-- Choose Token --</option>
                {Object.entries(TESTNET_TOKENS).map(([k, v]) => (
                  <option key={k} value={v.address}>
                    {v.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="or paste custom token address"
                className="w-full p-2 border mt-2 rounded"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="font-medium">Total Amount to Distribute</label>
            <input
              type="number"
              placeholder="0.0"
              className="w-full p-2 border rounded mt-1"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          <div className="mb-2 text-sm text-gray-600">
            Balance: {tokenBalance} {isNative ? "HBAR" : "TOKEN"}
          </div>

          <hr className="my-3" />

          {recipients.map((r, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                placeholder="Recipient Address"
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

          <div className="flex justify-between items-center mb-4">
            <button onClick={handleAddRecipient} className="text-blue-600 underline">
              + Add Recipient
            </button>
            <div className="text-sm text-gray-600">
              Total to Distribute: <b>{totalToDistribute}</b>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">Remaining: {remaining > 0 ? remaining : 0}</p>

          <button
            disabled={loading}
            onClick={handleSchedule}
            className="bg-blue-600 text-white px-6 py-2 rounded w-full"
          >
            {loading ? "Processing..." : "Schedule Batch Payment"}
          </button>
        </motion.div>
      )}

      {/* Step 2: Execute */}
      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <h2 className="text-lg font-semibold mb-3">Review Recipients ({recipients.length})</h2>
          {recipients.map((r, i) => (
            <div key={i} className="text-sm text-gray-700 mb-1">
              • {r.address} → {r.amount}
            </div>
          ))}

          <div className="flex justify-between mt-6">
            <button onClick={handleBack} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">
              Back
            </button>
            <button onClick={handleExecute} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
              {loading ? "Executing..." : "Execute Payments"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Yield */}
      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-xl p-6 shadow"
        >
          <h2 className="text-lg font-semibold mb-4">Deposit Balance to Yield Vault</h2>
          <p className="mb-4 text-sm">
            Remaining balance:{" "}
            <b>
              {remaining > 0 ? remaining.toFixed(4) : "0"} {isNative ? "HBAR" : "TOKEN"}
            </b>
          </p>

          {remaining > 0 ? (
            <button onClick={handleYield} disabled={loading} className="bg-purple-600 text-white px-6 py-2 rounded w-full">
              {loading ? "Sending..." : "Send Balance to Yield Vault"}
            </button>
          ) : (
            <button onClick={() => (window.location.href = "/transactions")} className="bg-blue-600 text-white px-6 py-2 rounded w-full">
              Finish
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
