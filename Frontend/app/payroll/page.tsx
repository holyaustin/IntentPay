"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getPayrollContract,
  approveERC20,
  PAYROLL_CONTRACT_ADDRESS,
} from "@/lib/contract";
import { parseUnits } from "ethers";

export default function PayrollPage() {
  const [step, setStep] = useState(1);
  const [total, setTotal] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState([{ address: "", amount: "" }]);
  const [txStatus, setTxStatus] = useState("");
  const [remaining, setRemaining] = useState("");

  const addRecipient = () =>
    setRecipients([...recipients, { address: "", amount: "" }]);

  const handleChangeRecipient = (i: number, field: string, value: string) => {
    const updated = [...recipients];
    // @ts-ignore
    updated[i][field] = value;
    setRecipients(updated);
  };

  const totalToDistribute = recipients.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );
  const balanceLeft =
    Number(total || 0) - (isNaN(totalToDistribute) ? 0 : totalToDistribute);

  // ✅ Step 1: Approve ERC20
  async function handleApprove() {
    if (!tokenAddress) {
      setTxStatus("Please enter ERC20 token address (native not supported yet).");
      return;
    }
    setTxStatus("Approving ERC20...");
    try {
      await approveERC20(tokenAddress, PAYROLL_CONTRACT_ADDRESS, total);
      setTxStatus("Approved successfully ✅");
      setStep(2);
    } catch (err: any) {
      console.error("Approval Error:", err);
      setTxStatus(`Approval failed ❌ ${err?.message || ""}`);
    }
  }

  // ✅ Step 2: Schedule + Execute
  async function handleExecute() {
    try {
      setTxStatus("Scheduling and Executing...");
      const contract = await getPayrollContract();

      console.log("Recipients:", recipients);

      for (const r of recipients) {
        const tx = await contract.schedulePayment(
          r.address,
          tokenAddress,
          parseUnits(r.amount, 18),
          296 // chainId
        );
        await tx.wait();
      }

      for (let i = 0; i < recipients.length; i++) {
        const tx2 = await contract.executePayment(i);
        await tx2.wait();
      }

      setTxStatus("Payments executed ✅");
      setRemaining(balanceLeft.toString());
      setStep(3);
    } catch (err: any) {
      console.error("Execution Error:", err);
      setTxStatus(`Transaction failed ❌ ${err?.message || ""}`);
    }
  }

  function handleYield() {
    if (Number(remaining) > 0) {
      alert(`Depositing ${remaining} tokens into yield vault...`);
    } else {
      alert("No remaining funds to yield ✅");
    }
  }

  const steps = ["Schedule", "Execute", "Yield"];

  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-6 text-green-700">Payroll Manager</h1>

      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8 relative">
        {steps.map((label, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm font-bold z-10 ${
                step === index + 1
                  ? "bg-green-600 text-white border-green-600"
                  : step > index + 1
                  ? "bg-green-400 text-white border-green-400"
                  : "bg-gray-200 border-gray-300 text-gray-600"
              }`}
            >
              {index + 1}
            </div>
            <p
              className={`text-xs mt-2 ${
                step >= index + 1 ? "text-green-700" : "text-gray-500"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
        <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 -z-0">
          <motion.div
            className="h-1 bg-green-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${((step - 1) / (steps.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow p-6"
          >
            <h2 className="text-2xl font-semibold mb-4">
              Step 1 – Schedule Payment
            </h2>
            <input
              type="number"
              placeholder="Total Amount to Send"
              className="mb-3 w-full border p-2 rounded"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
            <input
              type="text"
              placeholder="ERC20 Token Address"
              className="mb-3 w-full border p-2 rounded"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
            {recipients.map((r, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Recipient Wallet"
                  className="flex-1 border p-2 rounded"
                  value={r.address}
                  onChange={(e) =>
                    handleChangeRecipient(i, "address", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="Amount"
                  className="md:w-32 border p-2 rounded"
                  value={r.amount}
                  onChange={(e) =>
                    handleChangeRecipient(i, "amount", e.target.value)
                  }
                />
              </div>
            ))}
            <button
              onClick={addRecipient}
              className="bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded mb-3"
            >
              ➕ Add Recipient
            </button>
            <p className="text-gray-600 mb-3">
              Total to distribute: <b>{totalToDistribute}</b>
            </p>
            <button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded w-full"
            >
              Next → Execute
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow p-6"
          >
            <h2 className="text-2xl font-semibold mb-4">
              Step 2 – Execute Payment
            </h2>
            {recipients.map((r, i) => (
              <p key={i} className="text-gray-700 mb-1">
                {r.address} → {r.amount}
              </p>
            ))}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-2 rounded"
              >
                ← Back
              </button>
              <button
                onClick={handleExecute}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
              >
                Execute Payments
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow p-6"
          >
            <h2 className="text-2xl font-semibold mb-4">Step 3 – Yield</h2>
            <p className="mb-4">
              Remaining balance: <b>{remaining}</b>
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-2 rounded"
              >
                ← Back
              </button>
              <button
                onClick={handleYield}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded"
              >
                {Number(remaining) > 0 ? "Send to Yield" : "Finish"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {txStatus && <p className="mt-6 text-gray-700">{txStatus}</p>}
    </div>
  );
}
