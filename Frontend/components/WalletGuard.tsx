// components/WalletGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveAccount } from "../lib/onboard";

export default function WalletGuard({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const a = await getActiveAccount();
      if (!a) {
        router.push("/connect");
      } else {
        setConnected(true);
      }
    }
    check();
  }, [router]);

  if (!connected) {
    return <div className="text-center py-20">Redirecting to connect…</div>;
  }

  return <>{children}</>;
}
