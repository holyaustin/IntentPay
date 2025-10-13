/// <reference types="mocha" />

import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";
import { publicClient, testClient, walletClient } from "./utils/clients.js"; // <-- note .js extension

describe("PayrollManager", function () {
  this.timeout(60_000);

  it("should schedule and execute a payment", async function () {
    // 🧱 Load PayrollManager artifact
    const PayrollManagerArtifact = await hre.artifacts.readArtifact("PayrollManager");

    // Get funded accounts
    const accounts = await walletClient.getAddresses();
    const deployer = accounts[0];
    const admin = accounts[1];
    const recipient = accounts[2];

    // 🪙 Deploy a minimal MockERC20
    const mockERC20Abi = [
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
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
        ],
        outputs: [],
      },
      {
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ];

    // ⚙️ Deploy MockERC20 (assumes you compiled it separately)
    const usdcBytecode = "0x6080604052..."; // optional stub, or use artifact if compiled
    const usdcHash = await walletClient.deployContract({
      abi: mockERC20Abi,
      bytecode: usdcBytecode,
      args: ["Mock USDC", "USDC", 6],
      account: deployer,
    });

    const usdcReceipt = await testClient.waitForTransactionReceipt({ hash: usdcHash });
    const usdcAddress = usdcReceipt.contractAddress!;

    // 👮 Deploy PayrollManager
    const payrollHash = await walletClient.deployContract({
      abi: PayrollManagerArtifact.abi,
      bytecode: PayrollManagerArtifact.bytecode as `0x${string}`,
      account: deployer,
    });

    const payrollAddress = (await testClient.waitForTransactionReceipt({ hash: payrollHash })).contractAddress!;

    // Add admin
    await walletClient.writeContract({
      address: payrollAddress,
      abi: PayrollManagerArtifact.abi,
      functionName: "addAdmin",
      args: [admin],
      account: deployer,
    });

    // Mint USDC to admin
    await walletClient.writeContract({
      address: usdcAddress,
      abi: mockERC20Abi,
      functionName: "mint",
      args: [admin, parseUnits("1000", 6)],
      account: deployer,
    });

    // Approve payroll to spend
    await walletClient.writeContract({
      address: usdcAddress,
      abi: mockERC20Abi,
      functionName: "approve",
      args: [payrollAddress, parseUnits("1000", 6)],
      account: admin,
    });

    // Schedule payment
    await walletClient.writeContract({
      address: payrollAddress,
      abi: PayrollManagerArtifact.abi,
      functionName: "schedulePayment",
      args: [recipient, usdcAddress, parseUnits("1000", 6), 1],
      account: admin,
    });

    // Execute payment
    await walletClient.writeContract({
      address: payrollAddress,
      abi: PayrollManagerArtifact.abi,
      functionName: "executePayment",
      args: [0],
      account: admin,
    });

    // Verify payment executed
    const payment = await publicClient.readContract({
      address: payrollAddress,
      abi: PayrollManagerArtifact.abi,
      functionName: "payments",
      args: [0],
    });

    expect(payment[0]).to.equal(recipient); // recipient in tuple
    expect(payment[4]).to.equal(true); // executed == true
  });
});
