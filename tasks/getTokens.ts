import { BigNumber } from "ethers";
import { task, types } from "hardhat/config";
import { Treasury } from "../typechain-types";

task("get-tokens", "Get tokens of a given address")
  .addParam("address", "Address to look at", null, types.string)
  .setAction(async ({ address }, { ethers, deployments, getNamedAccounts }) => {
    const treasury = (await ethers.getContract("Treasury")) as Treasury;

    const allocation = await treasury.bcubeAllocationRegistry(address);
    console.log(
      `dollarUnitsPayed: ${
        allocation.dollarUnitsPayed.toNumber() / 100_000_000
      }`
    );
    console.log(
      `allocatedBcube: ${allocation.allocatedBcube.div(
        BigNumber.from("1000000000000000000")
      )}`
    );
  });
