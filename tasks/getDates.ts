import { task } from "hardhat/config";

import { Treasury } from "../typechain-types";

task("get-dates", "Display dates of Treasury contract").setAction(
  async ({}, { ethers }) => {
    const treasury = (await ethers.getContract("Treasury")) as Treasury;
    const openingTime = await treasury.openingTime();
    const closingTime = await treasury.closingTime();
    const listingTime = await treasury.listingTime();
    console.log({
      isOpen: await treasury.isOpen(),
      openingTime: new Date(openingTime.toNumber() * 1000),
      closingTime: new Date(closingTime.toNumber() * 1000),
      listingTime: new Date(listingTime.toNumber() * 1000),
    });
  }
);
