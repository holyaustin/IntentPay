// Deploy with viem
import { network } from "hardhat";

async function main() {
  // ✅ Connect to current network
  const { viem } = await network.connect();

  // ✅ Get wallet clients from Hardhat accounts
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying contracts with:", deployer.account.address);

  // ✅ Deploy PayrollManager contract
  const payrollManager = await viem.deployContract("PayrollManager", [], {
    client: {
      wallet: deployer,
    },
  });

  console.log("PayrollManager deployed at:", payrollManager.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
