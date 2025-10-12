import { assert } from "chai";
import { deployContract, getContractAt } from "viem/actions";
import { publicClient, testClient, walletClient } from "./utils/clients";

describe("PayrollManager", () => {
  it("Should schedule and execute a payment", async () => {
    const usdc = await deployContract({
      abi: [
        "function initialize(string memory name, string memory symbol, uint8 decimals)" as const,
        "function mint(address to, uint256 amount)" as const,
        "function approve(address spender, uint256 amount)" as const,
      ],
      bytecode: "0x...mock_usdc_bytecode...", // In practice, use a real mock or fork
    });

    const payroll = await deployContract({
      abi: await hre.artifacts.readArtifact("PayrollManager"),
      bytecode: (await hre.artifacts.readArtifact("PayrollManager")).bytecode.object,
    });

    const [admin] = await walletClient.getAddresses();

    // Add admin
    await walletClient.writeContract({
      address: payroll,
      abi: await hre.artifacts.readArtifact("PayrollManager"),
      functionName: "addAdmin",
      args: [admin],
    });

    // Mint and approve USDC
    await walletClient.writeContract({
      address: usdc,
      abi: [
        "function mint(address to, uint256 amount)" as const,
      ],
      functionName: "mint",
      args: [admin, 1000],
    });

    await walletClient.writeContract({
      address: usdc,
      abi: ["function approve(address spender, uint256 amount)" as const],
      functionName: "approve",
      args: [payroll, 1000],
    });

    // Schedule payment
    await walletClient.writeContract({
      address: payroll,
      abi: await hre.artifacts.readArtifact("PayrollManager"),
      functionName: "schedulePayment",
      args: [admin, usdc, 1000, 1],
    });

    // Execute
    await walletClient.writeContract({
      address: payroll,
      abi: await hre.artifacts.readArtifact("PayrollManager"),
      functionName: "executePayment",
      args: [0],
    });

    const payment = await publicClient.readContract({
      address: payroll,
      abi: await hre.artifacts.readArtifact("PayrollManager"),
      functionName: "payments",
      args: [0],
    });

    assert.equal(payment.executed, true);
  });
});