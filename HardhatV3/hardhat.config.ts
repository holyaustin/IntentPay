// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-toolbox-viem"; 
import { configVariable } from "hardhat/config";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import 'dotenv/config'

if (!process.env.ETHERSCAN_API_KEY) {
  console.warn("⚠️  Missing ETHERSCAN_API_KEY in .env");
}

const config: HardhatUserConfig = {
  plugins: [hardhatViem,
  hardhatVerify,
  hardhatKeystore, // Add this plugin to your array,
  hardhatNodeTestRunner],
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
      chainId: 296, // Hedera Testnet Chain ID
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

verify: {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },

  blockscout: {
      enabled: false,
    },
  
  },

}; 

export default config;
