const Staking = artifacts.require("Staking");
const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = async function (deployer) {
  await deployer.deploy(Staking, BCUBEToken.networks[4].address);
};
