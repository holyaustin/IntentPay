// lib/contract.ts
"use client";

import {
  BrowserProvider,
  Contract,
  parseUnits,
  formatEther,
} from "ethers";
import artifact from "@/lib/artifact.json"; // ✅ compiled PayrollManager artifact

// ✅ Updated contract address (Hedera Testnet)
export const PAYROLL_CONTRACT_ADDRESS =
  "0xfb69d0fb9c892f3565d66bca92360ca19b8d9780";

// ✅ Get provider from user's browser wallet
export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new BrowserProvider(window.ethereum);
}

// ✅ Get signer for transactions
export async function getSigner() {
  const provider = await getProvider();
  return await provider.getSigner();
}

// ✅ Payroll contract (write-enabled)
export async function getPayrollContract() {
  const signer = await getSigner();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);
}

// ✅ Read-only Payroll contract
export async function getPayrollReadOnly() {
  const provider = await getProvider();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, provider);
}

// ✅ ERC20 approval helper
export async function approveERC20(
  tokenAddress: string,
  spender: string,
  amount: string
) {
  const signer = await getSigner();
  const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
  ];
  const token = new Contract(tokenAddress, erc20Abi, signer);
  const tx = await token.approve(spender, parseUnits(amount, 18));
  await tx.wait();
  return tx.hash;
}

// ✅ ERC20 balance checker
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
) {
  const provider = await getProvider();
  const erc20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
  ];
  const token = new Contract(tokenAddress, erc20Abi, provider);
  const bal = await token.balanceOf(walletAddress);
  return formatEther(bal);
}

// ✅ Schedule Payment (ERC20 or Native)
export async function schedulePayment(
  recipient: string,
  tokenAddress: string | null,
  amount: string,
  chainId: number
) {
  const contract = await getPayrollContract();

  // ERC20 Payment
  if (tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000") {
    const tx = await contract.schedulePayment(recipient, tokenAddress, parseUnits(amount, 18), chainId);
    await tx.wait();
    return tx.hash;
  }

  // Native Payment (ETH, HBAR, etc.)
  const tx = await contract.schedulePayment(recipient, "0x0000000000000000000000000000000000000000", parseUnits(amount, 18), chainId, {
    value: parseUnits(amount, 18),
  });
  await tx.wait();
  return tx.hash;
}

// ✅ Execute Payment by ID
export async function executePayment(paymentId: number) {
  const contract = await getPayrollContract();
  const tx = await contract.executePayment(paymentId);
  await tx.wait();
  return tx.hash;
}
