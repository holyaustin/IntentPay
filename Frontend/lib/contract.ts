// lib/contract.ts
import { BrowserProvider, Contract } from "ethers";
import PayrollManagerArtifact from "./artifact.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYROLL_MANAGER!;

/**
 * Returns a connected PayrollManager contract instance
 */
export async function getPayrollContract() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new Contract(CONTRACT_ADDRESS, PayrollManagerArtifact.abi, signer);
}
