// lib/contract.ts
"use client";

import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import artifact from "@/lib/artifact.json";

export const PAYROLL_CONTRACT_ADDRESS = "0x7b954082151f7a44b2e42ef9225393ea4f16c482";

// ✅ Token metadata for Hedera Testnet
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

// ✅ Approve ERC20
export async function approveERC20(tokenAddress: string, amount: string, decimals = 18) {
  const signer = await getSigner();
  const erc20 = new Contract(
    tokenAddress,
    ["function approve(address spender, uint256 amount) public returns (bool)"],
    signer
  );
  const tx = await erc20.approve(PAYROLL_CONTRACT_ADDRESS, parseUnits(amount, decimals));
  await tx.wait();
  return tx.hash;
}

// ✅ Get ERC20 balance
export async function getTokenBalance(tokenAddress: string, wallet: string, decimals = 18) {
  const provider = await getProvider();
  const erc20 = new Contract(
    tokenAddress,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const bal = await erc20.balanceOf(wallet);
  return formatUnits(bal, decimals);
}

/**
 * ✅ schedulePayments - Correctly handles HBAR (8 decimals) vs ERC20
 */
export async function schedulePayments(
  recipients: string[],
  tokens: string[],
  amounts: string[],
  chainIds: number[]
) {
  const signer = await getSigner();
  const contract = new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);

  const parsedAmounts: bigint[] = [];
  let totalNative = 0n; // sum of native (HBAR) amounts in tinybars

  for (let i = 0; i < amounts.length; i++) {
    const amountStr = amounts[i];
    const token = tokens[i];
    const isNative = !token || token === "0x0000000000000000000000000000000000000000";

    let parsed: bigint;
    let decimals: number;

    if (isNative) {
      // HBAR uses 8 decimals: convert "1.5" → 150000000
      decimals = 8;
      parsed = parseUnits(amountStr, 8);
      totalNative += parsed;
    } else {
      // ERC20: use token-specific decimals
      const meta = Object.values(TESTNET_TOKENS).find(
        (t) => t.address.toLowerCase() === token.toLowerCase()
      );
      decimals = meta ? meta.decimals : 18;
      parsed = parseUnits(amountStr, decimals);
    }

    parsedAmounts.push(parsed);
  }

  // Only include { value } if sending native HBAR
  const txOverrides = totalNative > 0 ? { value: totalNative } : {};

  console.log("📦 Sending schedulePayments", {
    recipients,
    tokens,
    amounts,
    parsedAmounts,
    chainIds,
    value: txOverrides.value?.toString() || "0",
    formattedValue: totalNative > 0 ? formatUnits(totalNative, 8) + " HBAR" : "0",
  });

  // ✅ Correct: txOverrides is last argument
  const tx = await contract.schedulePayments(
    recipients,
    tokens,
    parsedAmounts,
    chainIds,
    txOverrides
  );

  await tx.wait();
  return tx.hash;
}

// ✅ Execute single payment
export async function executePayment(id: number) {
  const contract = await getPayrollContract();
  const tx = await contract.executePayment(id);
  await tx.wait();
  return tx.hash;
}

// ✅ Execute all
export async function executeAllPayments(paymentCount: number) {
  const hashes: string[] = [];
  for (let i = 0; i < paymentCount; i++) {
    try {
      const tx = await executePayment(i);
      hashes.push(tx);
    } catch (err: any) {
      console.warn(`Failed to execute payment ${i}:`, err.message);
    }
  }
  return hashes;
}

// ✅ Move to yield
export async function sendToYield(token: string, amount: string, note = "Yield Deposit") {
  const signer = await getSigner();
  const contract = new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);

  const isNative = token === "0x0000000000000000000000000000000000000000";
  const decimals = isNative ? 8 : (
    Object.values(TESTNET_TOKENS).find(t => t.address === token)?.decimals || 18
  );

  const tx = await contract.moveFundsToYield(
    token,
    await signer.getAddress(),
    parseUnits(amount, decimals),
    note
  );
  await tx.wait();
  return tx.hash;
}