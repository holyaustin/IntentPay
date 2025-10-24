// lib/onboard.ts
import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";

const injected = injectedModule();

let onboard: ReturnType<typeof Onboard> | null = null;

export function getOnboard() {
  if (!onboard) {
    onboard = Onboard({
      wallets: [injected],
      chains: [
        {
          id: "0x128", // 296 decimal → Hedera Testnet (EVM)
          token: "HBAR",
          label: "Hedera Testnet",
          rpcUrl: process.env.NEXT_PUBLIC_HEDERA_RPC || "https://testnet.hashio.io/api",
        },
      ],
      appMetadata: {
        name: "IntentPay",
        icon: "https://via.placeholder.com/64", // ✅ single icon instead of icons[]
        description: "Cross-chain payroll + yield automation",
        recommendedInjectedWallets: [
          { name: "MetaMask", url: "https://metamask.io" },
          { name: "Coinbase", url: "https://www.coinbase.com/wallet" },
        ],
      },
    });
  }
  return onboard;
}

export async function connectWallet() {
  const ob = getOnboard();
  const wallets = await ob.connectWallet();
  const connected = wallets[0];
  if (!connected) return null;
  return {
    address: connected.accounts?.[0]?.address ?? null,
    label: connected.label,
  };
}

export async function disconnectWallet() {
  const ob = getOnboard();
  const connected = (await ob.state.get())?.wallets ?? [];
  if (connected.length === 0) return;
  await ob.disconnectWallet({ label: connected[0].label });
}

export async function getActiveAccount() {
  const ob = getOnboard();
  const state = await ob.state.get();
  const wallet = state?.wallets?.[0];
  if (!wallet) return null;
  return { address: wallet.accounts[0].address, label: wallet.label };
}
