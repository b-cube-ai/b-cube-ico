const BCUBEToken = artifacts.require("BCUBEToken");

module.exports = function (deployer) {
  deployer.deploy(
    BCUBEToken,
    "b-cube.ai Token",
    "BCUBE",
    "18",
    "0",
    "50000000000000000000000000"
  );
};
