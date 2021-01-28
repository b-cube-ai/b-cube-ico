const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const Staking = artifacts.require("Staking");
const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = async function (deployer) {
  accounts = await web3.eth.getAccounts();
  currentTimestamp = Math.floor(Date.now() / 1000);
  openingTime = currentTimestamp + 2246400;
  closingTime = openingTime + 6912000;
  await deployer.deploy(Staking, BCUBEToken.networks[4447].address);
};
