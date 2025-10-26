import { ethers } from 'ethers';
import PythAbi from '@pythnetwork/pyth-sdk-solidity/abis/IPyth.json' assert { type: 'json' };

// Hedera Testnet
const contractAddress = '0xa2aa501b19aff244d90cc15a4cf739d2725b5729';
const provider = ethers.getDefaultProvider('https://testnet.hashio.io/api');
const contract = new ethers.Contract(contractAddress, PythAbi, provider);

const priceId = '0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd';
const age = 60;
const [price, conf, expo, timestamp] = await contract.getPriceNoOlderThan(priceId, age);



// SDK Pyth provides a typescript SDK for Hermes to fetch price updates. The HermesClient class in this SDK connects to Hermes to fetch and stream price updates.

const connection = new HermesClient("https://hermes.pyth.network", {});
 
const priceIds = [
  // You can find the ids of prices at https://docs.pyth.network/price-feeds/price-feeds
  "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd", // HBAR/USD price id

];
 
// Get price feeds
// You can also fetch price feeds for other assets by specifying the asset name and asset class.
const priceFeeds = await connection.getPriceFeeds("hbar", "crypto");
console.log(priceFeeds);
 
// Latest price updates
const priceUpdates = await connection.getLatestPriceUpdates(priceIds);
console.log(priceUpdates);