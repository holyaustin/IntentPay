import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
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
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    evvmSepolia: {
      type: "http",
      chainType: "l1",
      url: "https://rpc.sepolia-evm.evvm.dev",
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    hederaTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://testnet.hashio.io/api",
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    arcologyDevNet: {
            type: "http",
      chainType: "l1",
      url: "https://devnet.arcology.network",
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
