const { expect } = require("chai");
const CONSTANTS = require("./constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = require("./build/contracts/BCUBEToken.json");
const Treasury = require("./build/contracts/Treasury.json");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");
// const { web3 } = require("../b-cube-dex-engine/engine-server/config/web3");

let accounts;
currentTimestamp = Math.floor(Date.now() / 1000);
// 26 days from today
openingTime = currentTimestamp + 2246400;
closingTime = openingTime + 6912000;
bcube = new web3.eth.Contract(
  CONSTANTS.TOKEN_ABI,
  BCUBEToken.networks[4447].address
);
treasury = new web3.eth.Contract(
  CONSTANTS.TREASURY_ABI,
  Treasury.networks[4447].address
);
usdt = new web3.eth.Contract(CONSTANTS.TETHER_ABI, CONSTANTS.TETHER_ADDRESS);
async function getAcc() {
  accounts = await web3.eth.getAccounts();
  await bcube.methods.mint(accounts[0], "1000000000000000000000000").send({
    from: accounts[0],
  });
  await bcube.methods
    .transfer(
      "0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5",
      "500000000000000000000"
    )
    .send({
      from: accounts[0],
    });
  await web3.eth.sendTransaction({
    from: accounts[0],
    to: "0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5",
    value: web3.utils.toWei("5", "ether"),
  });
  await treasury.methods
    .addWhitelisted("0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5")
    .send({
      from: accounts[0],
    });
  await timeMachine.advanceTimeAndBlock(2246400 + 10000);
  await usdt.methods
    .approve(Treasury.networks[4447].address, "1000000000000")
    .send({
      from: "0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5",
    });
  await usdt.methods
    .transfer("0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5", "21000000000")
    .send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
}
// async function mint() {
//   await bcube.methods.mint("1000000000000000000000000", accounts[0]);
//   await bcube.methods
//     .transfer(
//       "0xdECB169ebf4A1D5c98066ADa1b9A7069F87CAeB5",
//       "500000000000000000000"
//     )
//     .send({
//       from: accounts[0],
//     });
// }

getAcc();
// mint();
