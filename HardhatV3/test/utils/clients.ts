import { createPublicClient, createTestClient, createWalletClient, http } from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ⚙️ Example local test accounts (from Hardhat or Anvil)
const account = privateKeyToAccount("0x59c6995e998f97a5a004497e5f4d1cfa5cf9f42b4d9a2f62cdb4bcb1e7baf8e5");

export const publicClient = createPublicClient({
  chain: foundry,
  transport: http(),
});

export const testClient = createTestClient({
  chain: foundry,
  mode: "anvil",
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: foundry,
  transport: http(),
});
