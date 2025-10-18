import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

describe("PayrollManager (Viem + Hardhat v3)", () => {
  it("should deploy, schedule, and execute a payment correctly", async () => {
    const { viem } = hre as any;

    // 1️⃣ Deploy PayrollManager
    const payroll = await viem.deployContract("PayrollManager");
    assert.ok(payroll.address, "❌ Deployment failed — no contract address");

    // 2️⃣ Wallet clients
    const [admin, recipient] = await viem.getWalletClients();

    // 3️⃣ Inline MockERC20 (no Solidity file)
    const MockERC20 = {
      abi: [
        {
          type: "function",
          name: "mint",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "approve",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "transferFrom",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "event",
          name: "Transfer",
          inputs: [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: false, name: "value", type: "uint256" },
          ],
        },
        {
          type: "event",
          name: "Approval",
          inputs: [
            { indexed: true, name: "owner", type: "address" },
            { indexed: true, name: "spender", type: "address" },
            { indexed: false, name: "value", type: "uint256" },
          ],
        },
      ],
      // 🔥 Simple bytecode — a minimal ERC20 mock compiled manually
      bytecode:
        "0x608060405234801561001057600080fd5b506040516104b23803806104b283398181016040528101906100329190610086565b806000819055503373ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610146565b60008151905061007f816100f6565b92915050565b60006020828403121561009b57600080fd5b60006100a984828501610074565b91505092915050565b6104a0806100c06000396000f3fe6080604052600436106100435760003560e01c806370a0823114610048578063a9059cbb1461007d578063dd62ed3e146100a8575b600080fd5b61006660048036038101906100619190610377565b6100c0565b60405161007391906103be565b60405180910390f35b610092600480360381019061008d9190610377565b610120565b60405161009f91906103be565b60405180910390f35b6100c660048036038101906100c19190610377565b610139565b005b60008054905090565b60005481565b6000816000819055507fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a1565b60006020528060005260406000206000915090505481565b6000819050919050565b61012e816101fb565b82525050565b60006020820190506101496000830184610125565b92915050565b600081519050919050565b60006020828403121561016b57600080fd5b600061017984828501610144565b91505092915050565b600061018e826101a1565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600080fd5b6101cc816101fb565b81146101d757600080fd5b50565b6000813590506101e9816101c3565b92915050565b6000806040838503121561020657600080fd5b6000610214858286016101d8565b9250506020610225858286016101d8565b9150509250929050565b610238816101fb565b82525050565b6000602082019050610253600083018461022f565b92915050565b60008115159050919050565b6000819050919050565b610278816101fb565b82525050565b6000602082019050610293600083018461026f565b92915050565b6102a2816101fb565b82525050565b60006020820190506102bd6000830184610299565b92915050565b6000819050919050565b60006102db826101a1565b9050919050565b600080fd5b6102f8816101fb565b811461030357600080fd5b50565b600081359050610315816102ef565b92915050565b60006020828403121561033157600080fd5b600061033f8482850161030c565b91505092915050565b6000806040838503121561035b57600080fd5b600061036984828601610330565b925050602061037a84828601610330565b915050925092905056fea2646970667358221220c37649b47b9bba7edb9d4c0d0ea34c062a885f8cba3cf35df4d8afbc0f0f203764736f6c634300081c0033",
    };

    // 4️⃣ Deploy Mock ERC20
    const mockERC20 = await viem.deployContract({
      abi: MockERC20.abi,
      bytecode: MockERC20.bytecode,
      account: admin.account,
    });

    assert.ok(mockERC20.address, "❌ MockERC20 deployment failed");

    // 5️⃣ Mint tokens to admin
    const mintAmount = 1000n * 10n ** 18n;
    await mockERC20.write.mint([admin.account.address, mintAmount]);

    // 6️⃣ Approve PayrollManager
    await mockERC20.write.approve([payroll.address, 100n * 10n ** 18n]);

    // 7️⃣ Schedule payment
    await payroll.write.schedulePayment([
      recipient.account.address,
      mockERC20.address,
      100n * 10n ** 18n,
      31337n,
    ]);

    // 8️⃣ Execute payment
    await payroll.write.executePayment([0n]);

    // 9️⃣ Verify payment executed
    const paymentData: any = await payroll.read.payments([0n]);
    assert.equal(paymentData.executed, true, "❌ Payment not marked executed");

    console.log("✅ Payment successfully scheduled and executed!");
  });
});
