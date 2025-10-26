// app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { connectWallet, getActiveAccount } from "@/lib/onboard";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      const active = await getActiveAccount();
      if (active?.address) {
        setAccount(active.address);
        router.push("/payroll"); // auto-redirect if already connected
      }
    })();
  }, [router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    const wallet = await connectWallet();
    if (wallet?.address) {
      router.push("/payroll");
    }
    setIsConnecting(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-7xl font-extrabold text-intent-700 max-w-3xl mb-6">
        Welcome to IntentPay
      </h1>
      <p className="text-xl text-gray-800 max-w-2xl mb-8">
        Automate cross-chain payroll & yield optimization with no code.
      </p>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-yellow-300 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-colors"
      >
        {isConnecting ? "Connecting…" : "Schedule Pay"}
      </button>
    </div>
  );
}
