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
  let openingTime, closingTime, currentTimestamp, usdt;
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
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.BPS_ADDRESS = bcubePSDeployed.address;
    // CONSTANTS.BCUBE_ADDRESS = "0x0fef71ba53077ee0a67424fa7560c84a4bb618af";
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
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

  it("should revert for whitelisted address calling buyBcubeUsingETH() before sale start time", async function () {
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

  it("should be able to buy $BCUBE @ $0.04 using 1 ETH by buyBcubeUsingETH() by checking team's _wallet()", async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    // pr = await bcubePS.methods.fetchETHPrice().call();
    // console.log("PR", pr);
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[2],
      value: web3.utils.toWei("1", "ether"),
    });
    // du = await bcubePS.methods.buyBcubeUsingETH().call();
    // console.log("DU", du);
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    // console.log("BAL", bal);
    expect(bal).to.equal(web3.utils.toWei("101", "ether"));
  });

  it("should test if participant was allocated correct $BCUBE after calling buyBcubeUsingETH()", async function () {
    ethPrice = new BN(await bcubePS.methods.fetchETHPrice().call());
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[2]).call();
    // console.log("ret", ret);
    expect(ret.allocatedBcube).to.equal(
      ethPrice
        .multiply(100)
        .divide(4)
        .multiply(new BN(10000000000))
        .number.reverse()
        .join("")
    );
  });

  it("should be able to buy $BCUBE @ $0.04 using 1000 USDT by buyBcubeUsingUSDT() by checking team's _wallet()", async function () {
    // await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    await bcubePS.methods.addWhitelisted(accounts[3]).send({
      from: accounts[0],
    });
    pr = await bcubePS.methods.fetchUSDTPrice().call();
    console.log("PR_USDT", pr);
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[3],
    });
    await usdt.methods.transfer(accounts[3], "50000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    await bcubePS.methods.buyBcubeUsingUSDT("2000000000").send({
      from: accounts[3],
      gasLimit: 6000000,
    });
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    // console.log("BAL", bal);
    expect(bal).to.equal("2000000000");
  });

  it("should test if participant was allocated correct $BCUBE after calling buyBcubeUsingUSDT()", async function () {
    usdtPrice = new BN(await bcubePS.methods.fetchUSDTPrice().call());
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[3]).call();
    // console.log("ret", ret);
    // await timeMachine.revertToSnapshot(snapshotId);
    expect(ret.allocatedBcube).to.equal(
      usdtPrice
        .multiply(2000)
        .multiply(100)
        .divide(4)
        .multiply(new BN(10000000000))
        .number.reverse()
        .join("")
    );
  });

  it("should be able to buy $BCUBE @ $0.045 using 1 ETH by buyBcubeUsingETH() by checking team's _wallet()", async function () {
    await bcubePS.methods.addWhitelisted(accounts[4]).send({
      from: accounts[0],
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[2],
      value: web3.utils.toWei("98", "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[4],
      value: web3.utils.toWei("1", "ether"),
    });
    // du = await bcubePS.methods.buyBcubeUsingETH().call();
    // console.log("DU", du);
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    // console.log("BAL", bal);
    expect(bal).to.equal(web3.utils.toWei("200", "ether"));
  });

  it("should test if participant was allocated correct $BCUBE @ $0.045 after calling buyBcubeUsingETH()", async function () {
    ethPrice = new BN(await bcubePS.methods.fetchETHPrice().call());
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[4]).call();
    console.log("ret", ret);
    expect(ret.allocatedBcube).to.equal(
      ethPrice
        .multiply(1000)
        .divide(45)
        .multiply(new BN(10000000000))
        .number.reverse()
        .join("")
    );
  });
});

// require(
//   (minDollarUnits <= dollarUnits) && (dollarUnits <= 25000_0000_0000),
//   "Contribution range for this round exceeded"
// );
// netUserDollarUnits = bcubeAllocationRegistry[_msgSender()]
//   .dollarUnitsPayed
//   .add(dollarUnits);
// require(
//   netUserDollarUnits <= 25000_0000_0000,
//   "Contribution upper limit exceeded"
// );
