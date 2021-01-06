const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
// const moment = require("moment");
const truffleAssert = require("truffle-assertions");
const BN = require("big-number");
const timeMachine = require("ganache-time-traveler");

describe("BCUBE Private Sale tests", function () {
  this.timeout(3600000);
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  let openingTime, closingTime, currentTimestamp;
  before(async function () {
    currentTimestamp = Math.floor(Date.now() / 1000);
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "1000000000000000000000",
      "50000000000000000000000000"
    );
    bcubePSDeployed = await BCubePrivateSale.new(
      accounts[1],
      bcubeDeployed.address,
      openingTime,
      closingTime
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.BPS_ADDRESS = bcubePSDeployed.address;
    // CONSTANTS.BCUBE_ADDRESS = "0x0fef71ba53077ee0a67424fa7560c84a4bb618af";
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
  });

  it("should revert when calling rate()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods.rate().call(),
      "BCubePrivateSale: rate() called"
    );
  });

  it("should revert when calling buyTokens()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods.buyTokens().call(),
      "BCubePrivateSale: buyTokens() called"
    );
  });

  it("should revert when calling buyBcubeUsingETH() with non-whitelisted address", async function () {
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[2],
        value: web3.utils.toWei("1", "ether"),
      }),
      "WhitelistedRole: caller does not have the Whitelisted role"
    );
  });

  it("should revert for whitelisted address calling buyBcubeUsingETH() before start time", async function () {
    await bcubePS.methods.addWhitelisted(accounts[2]).send({
      from: accounts[0],
    });
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[2],
        value: web3.utils.toWei("1", "ether"),
      }),
      "TimedCrowdsale: not open"
    );
  });

  it("should be able to buy $BCUBE using buyBcubeUsingETH() by checking team's _wallet()", async function () {
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    pr = await bcubePS.methods.fetchETHPrice().call();
    console.log("PR", pr);
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[2],
      value: web3.utils.toWei("1", "ether"),
    });
    // du = await bcubePS.methods.buyBcubeUsingETH().call();
    // console.log("DU", du);
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    console.log("BAL", bal);
    expect(bal).to.equal(web3.utils.toWei("1", "ether"));
  });
});
