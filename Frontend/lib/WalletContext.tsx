"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { connectWallet, disconnectWallet, getActiveAccount } from "@/lib/onboard";

interface WalletContextType {
  account: string | null;
  label: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  label: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      const active = await getActiveAccount();
      if (active?.address) {
        setAccount(active.address);
        setLabel(active.label);
      }
    })();
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const wallet = await connectWallet();
      if (wallet?.address) {
        setAccount(wallet.address);
        setLabel(wallet.label);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await disconnectWallet();
    setAccount(null);
    setLabel(null);
  };

  return (
    <WalletContext.Provider value={{ account, label, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
