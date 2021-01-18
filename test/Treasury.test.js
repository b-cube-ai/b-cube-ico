const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
const Treasury = artifacts.require("Treasury");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe("Treasury tests", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    finalUsdtAmt;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    treasury = new web3.eth.Contract(
      CONSTANTS.TREASURY_ABI,
      CONSTANTS.TREASURY_ADDRESS
    );
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("should revert when calling rate()", async function () {
    ret = await treasury.methods.bcubeAllocationRegistry(accounts[2]).call();
    console.log("RET", ret);
  });
});
