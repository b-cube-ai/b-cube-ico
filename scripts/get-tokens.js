const { ethers, BigNumber } = require('ethers');
const CONSTANTS = require("../constants");

const TREASURY_ADDRESS = '0x3C128B35705A5f0Ec1ACFaac77677b3EB19F881F';
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

const provider = new ethers.providers.InfuraProvider('rinkeby', INFURA_PROJECT_ID);

const getTokens = async () => {
  const contract = new ethers.Contract(TREASURY_ADDRESS, CONSTANTS.TREASURY_ABI, provider);
  const allocation = await contract.bcubeAllocationRegistry('0x0545dAfDB31E991c04fE288057ab3833E3E968CE');
  console.log(`dollarUnitsPayed: ${allocation.dollarUnitsPayed.toNumber() / 100_000_000}`);
  console.log(`allocatedBcube: ${allocation.allocatedBcube.div(BigNumber.from('1000000000000000000'))}`);
};

getTokens()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });