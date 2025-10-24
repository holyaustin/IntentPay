"use client";

import { useEffect, useState } from "react";
import { getActiveAccount } from "@/lib/onboard";

export default function PayrollPage() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const active = await getActiveAccount();
      if (active?.address) setAccount(active.address);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-md mt-8">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        Payroll Dashboard
      </h1>

      {account ? (
        <div className="mb-6">
          <p className="text-gray-700">
            Connected wallet:{" "}
            <span className="font-semibold text-green-700">{account}</span>
          </p>
        </div>
      ) : (
        <p className="text-red-500">No wallet connected.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Payment scheduled successfully!");
        }}
        className="space-y-4"
      >
        <div>
          <label className="block font-semibold text-gray-800 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            placeholder="0xRecipient..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-800 mb-1">
            Amount (USDC)
          </label>
          <input
            type="number"
            placeholder="100"
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-800 mb-1">
            Chain
          </label>
          <select className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option>Base</option>
            <option>Arbitrum</option>
            <option>Optimism</option>
            <option>Hedera</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Schedule & Optimize Payment
        </button>
      </form>
    </div>
  );
}
