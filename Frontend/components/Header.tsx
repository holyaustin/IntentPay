// components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { connectWallet, disconnectWallet, getActiveAccount } from "../lib/onboard";

export default function Header() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const a = await getActiveAccount();
      setAccount(a?.address ?? null);
    }
    init();
    // listen to window events (onboard will emit)
    window.addEventListener("wallet:changed", init);
    return () => window.removeEventListener("wallet:changed", init);
  }, []);

  const handleConnect = async () => {
    const res = await connectWallet();
    if (res?.address) {
      setAccount(res.address);
      // let other code know
      window.dispatchEvent(new CustomEvent("wallet:changed"));
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setAccount(null);
    window.dispatchEvent(new CustomEvent("wallet:changed"));
  };

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            {/* logo */}
            <div className="rounded-md p-2 bg-gradient-to-br from-intent-300 to-intent-500">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 3v18" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-intent-700">IntentPay</span>
          </Link>
          <nav className="hidden md:flex gap-4 items-center text-sm text-gray-700">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/payroll" className="hover:underline">Payroll</Link>
            <Link href="/yield" className="hover:underline">Yield</Link>
            <Link href="/admin" className="hover:underline">Admin</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/connect" className="hidden md:inline-block text-sm text-gray-600 hover:underline">Connect</Link>

          {account ? (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-700 bg-intent-50 px-3 py-1 rounded-md">
                {account.slice(0, 6)}…{account.slice(-4)}
              </div>
              <button
                onClick={handleDisconnect}
                className="rounded-md px-3 py-1 bg-accent-500 text-white text-sm shadow-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-md px-4 py-2 bg-intent-500 text-white hover:bg-intent-600"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
