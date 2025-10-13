/// <reference types="mocha" />

import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";
import { publicClient, testClient, walletClient } from "./utils/clients.js";

describe("PayrollManager (Viem Client)", function () {
  this.timeout(120_000);

  it("should schedule and execute a payment", async function () {
    // --- Load PayrollManager artifact ---
    const PayrollManagerArtifact = await hre.artifacts.readArtifact("PayrollManager");

    // --- Load or fallback MockERC20 artifact ---
    let MockERC20Artifact;
    try {
      MockERC20Artifact = await hre.artifacts.readArtifact("MockERC20");
    } catch {
      // fallback minimal ERC20 mock
      MockERC20Artifact = {
        abi: [
          {
            type: "constructor",
            inputs: [
              { name: "_name", type: "string" },
              { name: "_symbol", type: "string" },
              { name: "_decimals", type: "uint8" },
            ],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "mint",
            inputs: [
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "approve",
            inputs: [
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "balanceOf",
            inputs: [{ name: "owner", type: "address" }],
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
          },
        ],
        bytecode:
          "0x6080604052348015600f57600080fd5b5060405161011c38038061011c83398101604081905261002f91610040565b6001600160a01b0381166100a15760405162461bcd60e51b815260206004820152601060248201527f496e76616c696420636f6e7374727563746f720000000000000000000000000060448201526064015b60405180910390fd5b6000815190506100b7816100f4565b92915050565b6000602082840312156100d157600080fd5b60006100df848285016100ac565b91505092915050565b6100f1816100f4565b82525050565b600060208201905061010c60008301846100e8565b9291505056fea2646970667358221220dff4f4a1f11b81d0c6a0d97784a4dbbe8cf6e45071a0aaf5e3dfdcbfa98df2c164736f6c634300081c0033",
      };
    }

    // --- Accounts ---
    const [deployer, admin, recipient] = await walletClient.getAddresses();

    // --- Deploy MockERC20 ---
    const usdcHash = await walletClient.deployContract({
      abi: MockERC20Artifact.abi,
      bytecode: MockERC20Artifact.bytecode as `0x${string}`,
      args: ["Mock USDC", "USDC", 6],
      account: deployer,
    });

    const { contractAddress: usdcAddress } = await publicClient.waitForTransactionReceipt({
      hash: usdcHash,
    });

    // --- Deploy PayrollManager ---
    const payrollHash = await walletClient.deployContract({
      abi: PayrollManagerArtifact.abi,
      bytecode: PayrollManagerArtifact.bytecode as `0x${string}`,
      account: deployer,
    });

    const { contractAddress: payrollAddress } = await publicClient.waitForTransactionReceipt({
      hash: payrollHash,
    });

    // --- Add admin ---
    await walletClient.writeContract({
      address: payrollAddress!,
      abi: PayrollManagerArtifact.abi,
      functionName: "addAdmin",
      args: [admin],
      account: deployer,
    });

    // --- Mint tokens ---
    await walletClient.writeContract({
      address: usdcAddress!,
      abi: MockERC20Artifact.abi,
      functionName: "mint",
      args: [admin, parseUnits("1000", 6)],
      account: deployer,
    });

    // --- Approve PayrollManager ---
    await walletClient.writeContract({
      address: usdcAddress!,
      abi: MockERC20Artifact.abi,
      functionName: "approve",
      args: [payrollAddress!, parseUnits("1000", 6)],
      account: admin,
    });

    // --- Schedule Payment ---
    await walletClient.writeContract({
      address: payrollAddress!,
      abi: PayrollManagerArtifact.abi,
      functionName: "schedulePayment",
      args: [recipient, usdcAddress!, parseUnits("1000", 6), 1],
      account: admin,
    });

    // --- Execute Payment ---
    await walletClient.writeContract({
      address: payrollAddress!,
      abi: PayrollManagerArtifact.abi,
      functionName: "executePayment",
      args: [0n],
      account: admin,
    });

    // --- Validate result ---
    const payment: any = await publicClient.readContract({
      address: payrollAddress!,
      abi: PayrollManagerArtifact.abi,
      functionName: "payments",
      args: [0n],
    });

    expect(payment[0]).to.equal(recipient); // recipient
    expect(payment[4]).to.equal(true);      // executed
  });
});
