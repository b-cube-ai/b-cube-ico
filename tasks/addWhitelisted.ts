import { task, types } from "hardhat/config";

task("add-whitelisted", "Add a whitelisted address")
  .addParam("address", "Address to whitelist", null, types.string)
  .setAction(async ({ address }, { deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { execute } = deployments;

    await execute(
      "Treasure",
      { from: deployer, log: true },
      "addWhitelisted",
      address
    );
  });
