const BCUBEToken = artifacts.require("BCUBEToken");
const CONSTANTS = require("./constants");

module.exports = function (deployer) {
  deployer.deploy(
    BCUBEToken,
    "b-cube.ai Token",
    "BCUBE",
    "18",
    "0",
    "50000000000000000000000000",
    { gas: 6720000, overwrite: false }
  );
};
