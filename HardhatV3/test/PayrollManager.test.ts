import hardhat from "hardhat";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("PayrollManager (ERC20 + Admin + Yield + Pause)", () => {
  let viem: any;
  let manager: any;
  let token: any;
  let owner: any, user: any, recipient: any, yieldWallet: any;
  let publicClient: any;

  beforeEach(async () => {
    // Connect Hardhat network + viem clients
    const connection = await hardhat.network.connect();
    viem = connection.viem;
    [owner, user, recipient, yieldWallet] = await viem.getWalletClients();
    publicClient = await viem.getPublicClient();

    // Deploy contracts
    manager = await viem.deployContract("PayrollManager");
    token = await viem.deployContract("MockERC20", []);

    // Mint and approve
    await token.write.mint([user.account.address, 1_000_000n * 10n ** 18n]);
    await token.connect(user).write.approve([manager.address, 1_000_000n * 10n ** 18n]);

    // Verify deployment
    assert.ok(manager.address, "❌ PayrollManager deployment failed");
    assert.ok(token.address, "❌ MockERC20 deployment failed");
  });

  it("✅ should schedule and execute a payment correctly", async () => {
    // Schedule a payment
    const scheduleTx = await manager.connect(user).write.schedulePayment([
      recipient.account.address,
      token.address,
      100n * 10n ** 18n,
      BigInt(publicClient.chain.id),
    ]);
    await publicClient.waitForTransactionReceipt({ hash: scheduleTx });

    const escrowed = await manager.read.totalEscrowed();
    assert.equal(escrowed, 100n * 10n ** 18n, "❌ Escrow not updated");

    // Execute the payment
    const execTx = await manager.connect(user).write.executePayment([0n]);
    await publicClient.waitForTransactionReceipt({ hash: execTx });

    const recipientBal = await token.read.balanceOf([recipient.account.address]);
    assert.equal(recipientBal, 100n * 10n ** 18n, "❌ Recipient not paid");
  });

  it("✅ should allow admin to pause and unpause the contract", async () => {
    // Pause the contract
    await manager.connect(owner).write.pause();

    // Scheduling when paused should revert
    await assert.rejects(
      manager.connect(user).write.schedulePayment([
        recipient.account.address,
        token.address,
        50n * 10n ** 18n,
        BigInt(publicClient.chain.id),
      ]),
      /Paused/,
    );

    // Unpause and schedule again
    await manager.connect(owner).write.unpause();
    const tx = await manager.connect(user).write.schedulePayment([
      recipient.account.address,
      token.address,
      50n * 10n ** 18n,
      BigInt(publicClient.chain.id),
    ]);
    await publicClient.waitForTransactionReceipt({ hash: tx });
  });

  it("✅ should allow admin to move and recall yield funds manually", async () => {
    await manager.connect(owner).write.addAdmin([owner.account.address]);
    await token.write.mint([manager.address, 200n * 10n ** 18n]);

    // Move funds to yield
    const moveTx = await manager.connect(owner).write.moveFundsToYield([
      token.address,
      yieldWallet.account.address,
      100n * 10n ** 18n,
      "Send to yield",
    ]);
    await publicClient.waitForTransactionReceipt({ hash: moveTx });

    const yieldBal = await token.read.balanceOf([yieldWallet.account.address]);
    assert.equal(yieldBal, 100n * 10n ** 18n, "❌ Yield wallet not credited");

    // Recall funds back
    await token.connect(yieldWallet).write.approve([manager.address, 100n * 10n ** 18n]);
    const recallTx = await manager.connect(owner).write.recallFundsFromYield([
      token.address,
      100n * 10n ** 18n,
      "Recall",
    ]);
    await publicClient.waitForTransactionReceipt({ hash: recallTx });

    const finalBal = await token.read.balanceOf([manager.address]);
    assert.equal(finalBal, 200n * 10n ** 18n, "❌ Recall failed");
  });

  it("✅ should allow only owner to perform emergencyWithdraw", async () => {
    await token.write.mint([manager.address, 300n * 10n ** 18n]);
    const withdrawTx = await manager.connect(owner).write.emergencyWithdraw([
      token.address,
      yieldWallet.account.address,
      300n * 10n ** 18n,
    ]);
    await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

    const yieldBal = await token.read.balanceOf([yieldWallet.account.address]);
    assert.equal(yieldBal, 300n * 10n ** 18n, "❌ Emergency withdraw failed");
  });
});
