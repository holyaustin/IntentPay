import hardhat from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("PayrollManager with MockERC20", () => {
  it("should schedule and execute a payment correctly", async () => {
    // 🔹 Connect Hardhat network and viem helper
    const { viem } = await hardhat.network.connect();
    const [admin, recipient] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    // 1️⃣ Deploy PayrollManager (no need for { client } override)
    const payroll = await viem.deployContract("PayrollManager");
    assert.ok(payroll.address, "❌ PayrollManager deployment failed");

    // 2️⃣ Deploy MockERC20
    const token = await viem.deployContract("MockERC20");
    assert.ok(token.address, "❌ MockERC20 deployment failed");

    // 3️⃣ Mint tokens to admin
    const mintAmount = 1_000n * 10n ** 18n;
    const mintTx = await token.write.mint(
      [admin.account.address, mintAmount],
      { account: admin.account } // ✅ pass account, not client
    );
    await publicClient.waitForTransactionReceipt({ hash: mintTx });

    // 4️⃣ Approve PayrollManager to spend tokens
    const approveAmount = 200n * 10n ** 18n;
    const approveTx = await token.write.approve(
      [payroll.address, approveAmount],
      { account: admin.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // 5️⃣ Schedule payment
    const chainId = Number(publicClient.chain.id);
    const scheduleTx = await payroll.write.schedulePayment(
      [recipient.account.address, token.address, approveAmount, BigInt(chainId)],
      { account: admin.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: scheduleTx });

    // 6️⃣ Execute payment
    const executeTx = await payroll.write.executePayment([0n], {
      account: admin.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: executeTx });

    // 7️⃣ Verify payment data
    const payment = (await payroll.read.payments([0n])) as {
      recipient: string;
      token: string;
      amount: bigint;
      chainId: bigint;
      executed: boolean;
    };
    assert.equal(payment.executed, true, "❌ Payment not executed");

    console.log("✅ PayrollManager payment test passed successfully!");
  });
});
