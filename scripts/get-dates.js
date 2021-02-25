const { ethers } = require('ethers');
const CONSTANTS = require("../constants");

const TREASURY_ADDRESS = '0x3C128B35705A5f0Ec1ACFaac77677b3EB19F881F';
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

const provider = new ethers.providers.InfuraProvider('rinkeby', INFURA_PROJECT_ID);

const getDates = async () => {
  const contract = new ethers.Contract(TREASURY_ADDRESS, CONSTANTS.TREASURY_ABI, provider);
  const isOpen = await contract.isOpen();
  console.log(`IspOpen: ${isOpen}`);
  const openDate = await contract.openingTime();
  console.log(`OpeningTime: ${new Date(openDate * 1000)}`);
  const closingDate = await contract.closingTime();
  console.log(`ClosingTime: ${new Date(closingDate * 1000)}`);
  const listingDate = await contract.listingTime();
  console.log(`ListingTime: ${new Date(listingDate * 1000)}`);
};

getDates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });