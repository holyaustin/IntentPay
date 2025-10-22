import { network, artifacts } from "hardhat";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("PayrollManager (Viem-native tests)", () => {
  let viem: any;
  let publicClient: any;
  let owner: any;
  let user: any;
  let recipient: any;
  let yieldWallet: any;

  let payroll: any;
  let token: any;

  beforeEach(async () => {
    // Connect to Hardhat network with viem support
    const { viem: hhViem } = await network.connect();
    viem = hhViem;

    publicClient = await viem.getPublicClient();

    // Wallets
    const wallets = await viem.getWalletClients();
    [owner, user, recipient, yieldWallet] = wallets;

    // Deploy MockERC20
    const tokenContract = await viem.deployContract("MockERC20", [], {
      client: { wallet: owner },
    });
    assert.ok(tokenContract.address, "MockERC20 deploy failed");
    token = tokenContract;

    // Deploy PayrollManager
    const payrollContract = await viem.deployContract("PayrollManager", [], {
      client: { wallet: owner },
    });
    assert.ok(payrollContract.address, "PayrollManager deploy failed");
    payroll = payrollContract;
  });

  it("schedules and executes a payment correctly", async () => {
    const mintAmount = 1_000n * 10n ** 18n;

    // Mint to user
    await token.write.mint([user.account.address, mintAmount]);

    // Rebind contracts for each account
    const tokenAsUser = await viem.getContractAt("MockERC20", token.address, {
      client: { wallet: user },
    });
    const payrollAsUser = await viem.getContractAt(
      "PayrollManager",
      payroll.address,
      { client: { wallet: user } }
    );

    const approveAmount = 200n * 10n ** 18n;
    await tokenAsUser.write.approve([payroll.address, approveAmount]);

    const chainId = BigInt(await publicClient.getChainId());

    await payrollAsUser.write.schedulePayment([
      recipient.account.address,
      token.address,
      100n * 10n ** 18n,
      chainId,
    ]);

    const escrowed = await payroll.read.totalEscrowed();
    assert.equal(escrowed, 100n * 10n ** 18n, "escrow mismatch after schedule");

    // Execute the payment
    await payrollAsUser.write.executePayment([0n]);

    const payment = await payroll.read.payments([0n]);
    const executed = payment.executed ?? !!payment[4];
    assert.ok(executed, "Payment not executed");

    const recipientBal = await token.read.balanceOf([recipient.account.address]);
    assert.equal(recipientBal, 100n * 10n ** 18n);
  });

  it("pauses/unpauses correctly and blocks scheduling while paused", async () => {
    const payrollAsOwner = await viem.getContractAt(
      "PayrollManager",
      payroll.address,
      { client: { wallet: owner } }
    );
    const payrollAsUser = await viem.getContractAt(
      "PayrollManager",
      payroll.address,
      { client: { wallet: user } }
    );

    await payrollAsOwner.write.pause();

    await assert.rejects(
      payrollAsUser.write.schedulePayment([
        recipient.account.address,
        token.address,
        10n * 10n ** 18n,
        BigInt(await publicClient.getChainId()),
      ]),
      /paused/i
    );

    await payrollAsOwner.write.unpause();

    await payrollAsUser.write.schedulePayment([
      recipient.account.address,
      token.address,
      10n * 10n ** 18n,
      BigInt(await publicClient.getChainId()),
    ]);
  });

  it("moves funds to yield wallet and recalls successfully", async () => {
    const payrollAsOwner = await viem.getContractAt(
      "PayrollManager",
      payroll.address,
      { client: { wallet: owner } }
    );

    // Mint to contract
    await token.write.mint([payroll.address, 300n * 10n ** 18n]);

    // Move to yield wallet
    await payrollAsOwner.write.moveFundsToYield([
      token.address,
      yieldWallet.account.address,
      100n * 10n ** 18n,
      "send to yield",
    ]);

    const yieldBal = await token.read.balanceOf([yieldWallet.account.address]);
    assert.equal(yieldBal, 100n * 10n ** 18n);

    // Recall back (approve first)
    const tokenAsYield = await viem.getContractAt("MockERC20", token.address, {
      client: { wallet: yieldWallet },
    });
    await tokenAsYield.write.approve([payroll.address, 100n * 10n ** 18n]);

    await payrollAsOwner.write.recallFundsFromYield([
      token.address,
      100n * 10n ** 18n,
      "recall",
    ]);

    const contractBal = await token.read.balanceOf([payroll.address]);
    assert.equal(contractBal, 200n * 10n ** 18n);
  });

  it("allows owner to emergencyWithdraw", async () => {
    const payrollAsOwner = await viem.getContractAt(
      "PayrollManager",
      payroll.address,
      { client: { wallet: owner } }
    );

    await token.write.mint([payroll.address, 400n * 10n ** 18n]);

    await payrollAsOwner.write.emergencyWithdraw([
      token.address,
      recipient.account.address,
      400n * 10n ** 18n,
    ]);

    const recipientBal = await token.read.balanceOf([recipient.account.address]);
    assert.equal(recipientBal, 400n * 10n ** 18n);
  });
});
