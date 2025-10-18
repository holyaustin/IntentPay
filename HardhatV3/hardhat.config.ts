import type { HardhatUserConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    baseSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://base-sepolia.api.onfinality.io/public", //https://sepolia.base.org/
      accounts: [configVariable("PRIVATE_KEY")],
    },
    hederaTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://testnet.hashio.io/api",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    arcologyDevNet: {
            type: "http",
      chainType: "l1",
      url: "https://devnet.arcology.network",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
}; 

export default config;
