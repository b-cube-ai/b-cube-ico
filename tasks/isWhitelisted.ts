import { task, types } from "hardhat/config";

task("is-whitelisted", "Check if an address is whitelisted")
  .addParam("address", "Address to check", null, types.string)
  .setAction(async ({ address }, { deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { execute } = deployments;

    await execute(
      "Treasure",
      { from: deployer, log: true },
      "isWhitelisted",
      address
    );
  });
