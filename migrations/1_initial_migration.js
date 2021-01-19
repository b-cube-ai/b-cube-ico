const Migrations = artifacts.require("Migrations");

module.exports = function (deployer) {
  deployer.deploy(Migrations
    , { gas: 6720000, overwrite: false }
    );
};
