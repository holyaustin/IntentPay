"use client";

import { BrowserProvider, Contract, parseUnits, formatUnits } from "ethers";
import artifact from "@/lib/artifact.json";

export const PAYROLL_CONTRACT_ADDRESS = "0x7b954082151f7a44b2e42ef9225393ea4f16c482";

export const TESTNET_TOKENS = {
  USDC: {
    name: "USDC (Testnet)",
    symbol: "USDC",
    address: "0x00000000000000000000000000000000006cca73",
    decimals: 6,
  },
  DAI: {
    name: "TEST Protocol (Testnet)",
    symbol: "TEST",
    address: "0x00000000000000000000000000000000006cca68",
    decimals: 18,
  },
  WHBAR: {
    name: "Wrapped HBAR",
    symbol: "WHBAR",
    address: "0x00000000000000000000000000000000006cca74",
    decimals: 8,
  },
};

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum)
    throw new Error("MetaMask not found");
  return new BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = await getProvider();
  return await provider.getSigner();
}

export async function getPayrollContract() {
  const signer = await getSigner();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);
}

export async function getPayrollReadOnly() {
  const provider = await getProvider();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, provider);
}

export async function approveERC20(tokenAddress: string, amount: string, decimals = 18) {
  const signer = await getSigner();
  const erc20 = new Contract(
    tokenAddress,
    ["function approve(address spender, uint256 amount) public returns (bool)"],
    signer
  );
  const tx = await erc20.approve(
    PAYROLL_CONTRACT_ADDRESS,
    parseUnits(amount, decimals)
  );
  await tx.wait();
  return tx.hash;
}

export async function getTokenBalance(tokenAddress: string, wallet: string) {
  const provider = await getProvider();
  const erc20 = new Contract(
    tokenAddress,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const bal = await erc20.balanceOf(wallet);
  return formatUnits(bal, 18);
}

/**
 * ✅ Corrected native-value handling and function name
 */
export async function scheduleBatchPayments(
  recipients: string[],
  tokens: string[],
  amounts: string[],
  chainIds: number[],
  isNative = false
) {
  const signer = await getSigner();
  const contract = new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);

  // Convert all amounts to BigInt with 18 decimals
  const parsed = amounts.map((a) => parseUnits(a, 18));

  // Calculate the total msg.value for native token
  const totalNative = isNative
    ? parsed.reduce((sum, v) => sum + v, BigInt(0))
    : BigInt(0);

  const overrides = isNative ? { value: totalNative } : {};

  const tx = await contract.scheduleBatchPayments(
    recipients,
    tokens,
    parsed,
    chainIds,
    overrides
  );
  await tx.wait();
  return tx.hash;
}

export async function executeAllPayments(paymentCount: number) {
  const signer = await getSigner();
  const contract = new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);

  const hashes = [];
  for (let i = 0; i < paymentCount; i++) {
    try {
      const tx = await contract.executePayment(i);
      await tx.wait();
      hashes.push(tx.hash);
    } catch (err: any) {
      console.warn(`Skipping payment ${i}: ${err.message}`);
    }
  }
  return hashes;
}

export async function sendToYield(token: string, amount: string, note = "Yield Deposit") {
  const signer = await getSigner();
  const contract = new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);
  const tx = await contract.moveFundsToYield(
    token,
    await signer.getAddress(),
    parseUnits(amount, 18),
    note
  );
  await tx.wait();
  return tx.hash;
}
