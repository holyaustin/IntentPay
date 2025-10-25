"use client";

import React, { useState } from "react";
import {
  schedulePayment,
  executePayment,
  approveERC20,
  PAYROLL_CONTRACT_ADDRESS,
} from "@/lib/contract";
import { parseUnits } from "ethers";

export default function PayrollPage() {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [isNative, setIsNative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleSchedule = async () => {
    try {
      setLoading(true);
      setTxHash("");

      const chainId = 296; // ✅ Hedera Testnet Chain ID (use your own if different)
      if (!recipient || !amount) throw new Error("Missing recipient or amount");

      if (!isNative && tokenAddress) {
        await approveERC20(tokenAddress, PAYROLL_CONTRACT_ADDRESS, amount);
      }

      const hash = await schedulePayment(
        recipient,
        isNative ? null : tokenAddress,
        amount,
        chainId
      );

      setTxHash(hash);
      setStep(2);
    } catch (err: any) {
      alert(`Error scheduling payment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      setLoading(true);
      setTxHash("");

      const hash = await executePayment(0); // ✅ Replace 0 with actual payment index logic if needed
      setTxHash(hash);
      setStep(3);
    } catch (err: any) {
      alert(`Transaction failed ❌: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        💰 Payroll Manager
      </h1>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 text-center">
            <div
              className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full ${
                step >= n ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
              }`}
            >
              {n}
            </div>
            <div className="text-sm mt-2">
              {n === 1 && "Schedule"}
              {n === 2 && "Execute"}
              {n === 3 && "Done"}
            </div>
            {n < 3 && (
              <div
                className={`h-1 mt-2 ${
                  step > n ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Schedule */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="font-medium">Recipient Address</span>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0xRecipient..."
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <label className="block">
            <span className="font-medium">Amount</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 1.5"
              className="w-full mt-1 p-2 border rounded"
            />
          </label>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isNative}
                onChange={() => setIsNative(!isNative)}
              />
              Native (HBAR/ETH)
            </label>

            {!isNative && (
              <input
                type="text"
                placeholder="ERC20 Token Address"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
            )}
          </div>

          <button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded mt-4"
          >
            {loading ? "Scheduling..." : "Schedule Payment"}
          </button>
        </div>
      )}

      {/* Step 2 — Execute */}
      {step === 2 && (
        <div className="text-center space-y-4">
          <p>Payment scheduled successfully ✅</p>
          {txHash && (
            <p className="text-sm text-gray-600">
              Tx: <a
                href={`https://hashscan.io/testnet/tx/${txHash}`}
                target="_blank"
                className="text-blue-600 underline"
              >{txHash.slice(0, 10)}...</a>
            </p>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              ← Back
            </button>

            <button
              onClick={handleExecute}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Executing..." : "Execute Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="text-center">
          <p className="text-lg font-semibold">✅ Payment executed!</p>
          {txHash && (
            <p className="text-sm text-gray-600 mt-2">
              Tx:{" "}
              <a
                href={`https://hashscan.io/testnet/tx/${txHash}`}
                target="_blank"
                className="text-blue-600 underline"
              >
                {txHash.slice(0, 10)}...
              </a>
            </p>
          )}

          <button
            onClick={() => setStep(1)}
            className="bg-blue-500 text-white px-4 py-2 rounded mt-6"
          >
            New Payment
          </button>
        </div>
      )}
    </div>
  );
}
