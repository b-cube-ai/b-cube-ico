const { ethers } = require('ethers');
const CONSTANTS = require("../constants");

const TREASURY_ADDRESS = '0x069E922765a2f8b6d019b70b1af8c36328a6cFA1';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

if(process.argv.length <= 2){
  console.error('Missing `userAddress` argument');
  process.exit(1);
}

const userAddress = process.argv[2];

const provider = new ethers.providers.InfuraProvider('rinkeby', INFURA_PROJECT_ID);
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY).connect(provider);

const whitelist = async () => {
  console.log(`Whitelist address ${userAddress} on network ${provider.network.name} using admin address ${adminWallet.address}`);
  const contract = new ethers.Contract(TREASURY_ADDRESS, CONSTANTS.TREASURY_ABI, adminWallet);
  const { hash, wait } = await contract.addWhitelisted(userAddress);
  console.log(`Transaction hash: ${hash} - wait for mining...`);
  await wait();
  console.log(`Transaction mined!`);
};

whitelist()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });