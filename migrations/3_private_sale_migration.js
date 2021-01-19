const CONSTANTS = require("../constants");
// let accounts = require("../getAcc");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = async function (deployer) {
  accounts = await web3.eth.getAccounts();
  currentTimestamp = Math.floor(Date.now() / 1000);
  openingTime = currentTimestamp + 2246400;
  closingTime = openingTime + 6912000;
  // console.log("TEAM_PS_MIGRA", accounts);
  await deployer.deploy(
    BCubePrivateSale,
    accounts[1],
    BCUBEToken.networks[4447].address,
    openingTime,
    closingTime,
    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    ,
    { gas: 6720000, overwrite: false }
  );
};
