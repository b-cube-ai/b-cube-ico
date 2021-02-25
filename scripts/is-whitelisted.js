const { ethers } = require('ethers');
const CONSTANTS = require("../constants");

const TREASURY_ADDRESS = '0x3C128B35705A5f0Ec1ACFaac77677b3EB19F881F';
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

if(process.argv.length <= 2){
  console.error('Missing `userAddress` argument');
  process.exit(1);
}

const userAddress = process.argv[2];

const provider = new ethers.providers.InfuraProvider('rinkeby', INFURA_PROJECT_ID);

const check = async () => {
  console.log(`Check whitelist status of address ${userAddress} on network ${provider.network.name}`);
  const contract = new ethers.Contract(TREASURY_ADDRESS, CONSTANTS.TREASURY_ABI, provider);
  const status = await contract.isWhitelisted(userAddress);
  console.log(`Address whitelisted: ${status}`);
};

check()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });