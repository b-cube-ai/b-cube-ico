const Staking = artifacts.require("Staking");
const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = async function (deployer) {
  await deployer.deploy(Staking, 
    // '0xcf58d4666F9b717B7055B77d04025E84b2Ca98dD',
    BCUBEToken.networks[4447].address,
  );
};
