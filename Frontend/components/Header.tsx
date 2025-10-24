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

  // Detect active wallet
  useEffect(() => {
    (async () => {
      const active = await getActiveAccount();
      if (active?.address) {
        setAccount(active.address);
        setLabel(active.label);
      }
    })();
  }, []);

  // Connect wallet
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
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

  // Disconnect wallet
  const handleDisconnect = async () => {
    await disconnectWallet();
    setAccount(null);
    setLabel(null);
    router.push("/connect");
  };

  const NavLinks = () => (
    <>
      <button
        onClick={() => router.push("/about")}
        className="hover:text-yellow-300 transition-colors"
      >
        About
      </button>
      <button
        onClick={() => router.push("/connect")}
        className="hover:text-yellow-300 transition-colors"
      >
        Connect
      </button>
      <button
        onClick={() => router.push("/transactions")}
        className="hover:text-yellow-300 transition-colors"
      >
        Transactions
      </button>
    </>
  );

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-green-600 text-white shadow-lg">
      {/* Logo */}
      <div
        className="flex items-center space-x-3 cursor-pointer"
        onClick={() => router.push("/")}
      >
        <img
          src="https://via.placeholder.com/48x48.png?text=IP"
          alt="IntentPay Logo"
          className="w-10 h-10 rounded-full"
        />
        <span className="text-2xl font-semibold tracking-wide">IntentPay</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-6 text-white font-medium">
        <NavLinks />
      </nav>

      {/* Wallet Button */}
      <div className="hidden md:block">
        {account ? (
          <button
            onClick={handleDisconnect}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {label} — {account.slice(0, 6)}…{account.slice(-4)} (Disconnect)
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>

      {/* Mobile Menu Icon */}
      <div className="md:hidden">
        <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-green-700 text-white flex flex-col items-center space-y-4 py-6 md:hidden">
          <NavLinks />
          {account ? (
            <button
              onClick={handleDisconnect}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
