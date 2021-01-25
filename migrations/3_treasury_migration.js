const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const Treasury = artifacts.require("Treasury");
const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = async function (deployer) {
  accounts = await web3.eth.getAccounts();
  currentTimestamp = Math.floor(Date.now() / 1000);
  openingTime = currentTimestamp + 2246400;
  closingTime = openingTime + 6912000;
  await deployer.deploy(
    Treasury,
    accounts[1],
    BCUBEToken.networks[4447].address,
    openingTime,
    closingTime,
    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    closingTime + 6912000
  );
};