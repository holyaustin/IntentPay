// test/PayrollManager.vitest.ts
import hardhat from "hardhat";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("PayrollManager (ERC20 & Native support)", () => {
  let viem: any;
  let publicClient: any;
  let owner: any;
  let user: any;
  let recipient: any;

  let payroll: any;
  let token: any;

  const PAYROLL_QNAME = "contracts/PayrollManager.sol:PayrollManager";
  const MOCKERC20_QNAME = "contracts/MockERC20.sol:MockERC20";

  beforeEach(async () => {
    const connection = await hardhat.network.connect();
    viem = connection.viem;
    publicClient = await viem.getPublicClient();

    const wallets = await viem.getWalletClients();
    [owner, user, recipient] = wallets;

    // Deploy token and payroll
    const tokenDeployment = await viem.deployContract(MOCKERC20_QNAME);
    token = await viem.getContract({
      address: tokenDeployment.address,
      abi: (await hardhat.artifacts.readArtifact("MockERC20")).abi,
      client: { wallet: owner },
    });

    const payrollDeployment = await viem.deployContract(PAYROLL_QNAME);
    payroll = await viem.getContract({
      address: payrollDeployment.address,
      abi: (await hardhat.artifacts.readArtifact("PayrollManager")).abi,
      client: { wallet: owner },
    });
  });

  it("ERC20: schedule and execute (standard token)", async () => {
    const mintAmount = 1_000n * 10n ** 18n;
    // Mint to user
    await token.write.mint([user.account.address, mintAmount]);

    // token as user
    const tokenAsUser = token.withAccount(user.account);
    await tokenAsUser.write.approve([payroll.address, 500n * 10n ** 18n]);

    const payrollAsUser = payroll.withAccount(user.account);
    const chainId = BigInt(await publicClient.getChainId());

    // Schedule a payment: token address, no value
    await payrollAsUser.write.schedulePayment([
      recipient.account.address,
      token.address,
      100n * 10n ** 18n,
      chainId,
    ]);

    // Execute payment
    await payrollAsUser.write.executePayment([0n]);

    // Check recipient balance
    const bal = await token.read.balanceOf([recipient.account.address]);
    assert.equal(bal, 100n * 10n ** 18n);
  });

  it("Native: schedule (send value) and execute", async () => {
    const nativeAmount = 1n * 10n ** 18n;

    // user schedules a native payment: pass token=address(0) and send value
    const payrollAsUser = payroll.withAccount(user.account);
    const chainId = BigInt(await publicClient.getChainId());

    // send schedulePayment with value
    const txHash = await payrollAsUser.write.schedulePayment(
      [recipient.account.address, "0x0000000000000000000000000000000000000000", nativeAmount, chainId],
      { account: user.account, value: nativeAmount } // passes native Ether
    );

    // execute payment
    await payrollAsUser.write.executePayment([0n]);

    // check recipient native balance using publicClient.getBalance
    const recipientBal = await publicClient.getBalance({ address: recipient.account.address });
    // recipientBal is bigint
    assert(recipientBal >= nativeAmount);
  });
});
