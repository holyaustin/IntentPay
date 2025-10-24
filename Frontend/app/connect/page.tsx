"use client";
import { useEffect, useState } from "react";
import { connectWallet, getActiveAccount } from "@/lib/onboard";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const [addr, setAddr] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    async function g() {
      const a = await getActiveAccount();
      if (a) {
        setAddr(a.address);
        router.push("/payroll");
      }
    }
    g();
  }, [router]);

  const handleConnect = async () => {
    const res = await connectWallet();
    if (res?.address) {
      router.push("/payroll");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-16 text-center">
      <h2 className="text-2xl font-semibold">Connect your wallet</h2>
      <p className="mt-2 text-gray-700">Use MetaMask or another EVM wallet configured for Hedera Testnet.</p>
      <button onClick={handleConnect} className="mt-6 px-6 py-3 bg-intent-500 text-white rounded-md">
        Connect Wallet
      </button>
    </div>
  );
}
