// lib/contract.ts
"use client";

import { BrowserProvider, Contract, formatEther, parseUnits } from "ethers";
import artifact from "@/lib/artifact.json"; // ✅ your compiled PayrollManager artifact

// ✅ Replace with your deployed address
export const PAYROLL_CONTRACT_ADDRESS =
  "0xa2aea35523a71eff81283e32f52151f12d5cbb7f";

// ✅ Get provider from browser wallet
export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new BrowserProvider(window.ethereum);
}

// ✅ Get signer (no args in ethers v6)
export async function getSigner() {
  const provider = await getProvider();
  return await provider.getSigner();
}

// ✅ Get contract instance (write)
export async function getPayrollContract() {
  const signer = await getSigner();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, signer);
}

// ✅ Get contract for read-only (no signer)
export async function getPayrollReadOnly() {
  const provider = await getProvider();
  return new Contract(PAYROLL_CONTRACT_ADDRESS, artifact.abi, provider);
}

// ✅ Utility for ERC20 approvals
export async function approveERC20(
  tokenAddress: string,
  spender: string,
  amount: string
) {
  const signer = await getSigner();
  const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
  ];
  const erc20 = new Contract(tokenAddress, erc20Abi, signer);
  const tx = await erc20.approve(spender, parseUnits(amount, 18));
  await tx.wait();
  return tx.hash;
}

// ✅ Get token balance helper
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
