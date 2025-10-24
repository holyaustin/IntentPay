"use client";
import { useState } from "react";
import { ethers, Contract, parseUnits, ZeroAddress } from "ethers";
import PayrollManagerArtifact from "@/lib/artifact.json"; // assuming you placed it here

export default function AdminPage() {
  const [status, setStatus] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [yieldWallet, setYieldWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYROLL_MANAGER!;

  async function handleMoveFunds() {
    try {
      if (!window.ethereum) throw new Error("No wallet found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(CONTRACT_ADDRESS, PayrollManagerArtifact.abi, signer);
      const tx = await contract.moveFundsToYield(
        tokenAddress,
        yieldWallet,
        parseUnits(amount, 18),
        note
      );

      setStatus("Transaction sent: " + tx.hash);
      await tx.wait();
      setStatus("✅ Funds moved successfully!");
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  }

  async function handleRecallFunds() {
    try {
      if (!window.ethereum) throw new Error("No wallet found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(CONTRACT_ADDRESS, PayrollManagerArtifact.abi, signer);
      const tx = await contract.recallFundsFromYield(tokenAddress, parseUnits(amount, 18), note);

      setStatus("Transaction sent: " + tx.hash);
      await tx.wait();
      setStatus("✅ Funds recalled successfully!");
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">Admin Dashboard</h1>

      <div className="space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Token Address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Yield Wallet"
          value={yieldWallet}
          onChange={(e) => setYieldWallet(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-4">
          <button
            onClick={handleMoveFunds}
            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded"
          >
            Move Funds to Yield
          </button>
          <button
            onClick={handleRecallFunds}
            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded"
          >
            Recall Funds
          </button>
        </div>
      </div>

      {status && <p className="mt-4 text-center text-sm text-gray-300">{status}</p>}
    </div>
  );
}
