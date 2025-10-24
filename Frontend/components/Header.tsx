"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, disconnectWallet, getActiveAccount } from "@/lib/onboard";
import { Menu, X } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const active = await getActiveAccount();
      if (active?.address) {
        setAccount(active.address);
        setLabel(active.label);
      }
    })();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const wallet = await connectWallet();
      if (wallet?.address) {
        setAccount(wallet.address);
        setLabel(wallet.label);
        router.push("/payroll");
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setAccount(null);
    setLabel(null);
    router.push("/");
  };

  const NavLinks = () => (
    <>
      <button
        onClick={() => router.push("/about")}
        className="hover:text-yellow-300 text-xl transition-colors font-semibold"
      >
        About
      </button>
      <button
        onClick={() => router.push("/transactions")}
        className="hover:text-yellow-300 text-xl transition-colors font-semibold"
      >
        Transactions
      </button>
    </>
  );

  return (
    <header className="bg-green-700 text-white shadow-md px-14 sticky top-0 z-50">
      <div className="flex items-center justify-between py-4">
        {/* Logo and Title */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <img
            src="/logoyellow.png"
            alt="IntentPay Logo"
            className="w-28 h-auto object-contain" // rectangular logo
          />
          <span className="text-2xl font-extrabold tracking-wide text-yellow-300">
            IntentPay
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-10">
          <NavLinks />
        </nav>

        {/* Wallet Button */}
        <div className="hidden md:block">
          {account ? (
            <button
              onClick={handleDisconnect}
              className="bg-yellow-300 hover:bg-yellow-500 text-black px-5 py-2 rounded-lg font-semibold transition-colors"
            >
              {label} — {account.slice(0, 6)}…{account.slice(-4)} (Disconnect)
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-yellow-300 hover:bg-yellow-500 text-black px-5 py-2 rounded-lg font-semibold transition-colors"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-green-800 text-white flex flex-col space-y-4 py-4 px-6">
          <NavLinks />
          {account ? (
            <button
              onClick={handleDisconnect}
              className="bg-yellow-300 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-yellow-300 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
