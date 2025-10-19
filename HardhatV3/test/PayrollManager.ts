import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { deployContract } from "viem/actions";
import { getContract } from "viem"; // ✅ correct import

describe("PayrollManager (Hardhat + Viem inline ERC20 mock)", () => {
  it("should deploy PayrollManager and execute ERC20 payment correctly", async () => {
    const { viem } = await network.connect();

    const payroll = await viem.deployContract("PayrollManager");
    assert.ok(payroll.address, "❌ PayrollManager deployment failed");

    const [admin, recipient] = await viem.getWalletClients();

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
      ],
      // ✅ ensure bytecode is correctly typed
      bytecode: `0x608060405234801561001057600080fd5b506040516104b23803806104b283398181016040528101906100329190610086565b806000819055503373ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610146565b60008151905061007f816100f6565b92915050565b60006020828403121561009b57600080fd5b60006100a984828501610074565b91505092915050565b6104a0806100c06000396000f3fe6080604052600436106100435760003560e01c806370a0823114610048578063a9059cbb1461007d578063dd62ed3e146100a8575b600080fd5b61006660048036038101906100619190610377565b6100c0565b60405161007391906103be565b60405180910390f35b610092600480360381019061008d9190610377565b610120565b60405161009f91906103be565b60405180910390f35b6100c660048036038101906100c19190610377565b610139565b005b60008054905090565b60005481565b6000816000819055507fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a1565b60006020528060005260406000206000915090505481565b6000819050919050565b61012e816101fb565b82525050565b60006020820190506101496000830184610125565b92915050565b600081519050919050565b60006020828403121561016b57600080fd5b600061017984828501610144565b91505092915050565b600061018e826101a1565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600080fd5b6101cc816101fb565b81146101d757600080fd5b50565b6000813590506101e9816101c3565b92915050565b6000806040838503121561020657600080fd5b6000610214858286016101d8565b9250506020610225858286016101d8565b915050925092905056fea2646970667358221220c37649b47b9bba7edb9d4c0d0ea34c062a885f8cba3cf35df4d8afbc0f0f203764736f6c634300081c0033` as `0x${string}`,
    };

    // ✅ cast bytecode literal to satisfy type system
    const mockERC20Address = await deployContract(admin, {
      abi: MockERC20.abi,
      bytecode: MockERC20.bytecode as `0x${string}`,
    });

    // ✅ correct getContract import & usage
    const mockERC20 = getContract({
      address: mockERC20Address,
      abi: MockERC20.abi,
      client: { wallet: admin },
    });

    const mintAmount = 1000n * 10n ** 18n;
    await mockERC20.write.mint([admin.account.address, mintAmount]);
    await mockERC20.write.approve([payroll.address, 100n * 10n ** 18n]);

    await payroll.write.schedulePayment([
      recipient.account.address,
      mockERC20Address,
      100n * 10n ** 18n,
      31337n,
    ]);

    await payroll.write.executePayment([0n]);

    // ✅ assert type manually
    const payment = (await payroll.read.payments([0n])) as {
      recipient: string;
      token: string;
      amount: bigint;
      unlockBlock: bigint;
      executed: boolean;
    };

    assert.equal(payment.executed, true, "❌ Payment not marked executed");
    console.log("✅ Payment executed successfully!");
  });
});
