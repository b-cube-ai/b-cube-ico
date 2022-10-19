import { task } from "hardhat/config";

task("accounts", "Display account addresses and their balance").setAction(
  async ({}, { ethers, getNamedAccounts }) => {
    const accounts = await getNamedAccounts();
    for (const [name, address] of Object.entries(accounts)) {
      const balance = await ethers.provider.getBalance(address);
      console.log(`Account: ${name} (${address})`);
      console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
    }
  }
);
