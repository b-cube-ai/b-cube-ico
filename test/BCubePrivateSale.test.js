const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe("BCUBE Private Sale tests with boundaries bought in ETH", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    ethToBuyBcube,
    finalUsdtAmt,
    stageOneEth,
    stage2Eth,
    stage3Eth,
    stage4Eth,
    stageEndEth,
    stage1Usdt,
    stage2Usdt,
    stage3Usdt,
    stage4Usdt;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
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
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 3; i <= 24; i++) {
      await bcubePS.methods.addWhitelisted(accounts[i]).send({
        from: accounts[0],
      });
    }
    await web3.eth.sendTransaction({
      from: accounts[23],
      to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      value: web3.utils.toWei("5", "ether"),
    });
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
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

  it("should check if removeWhitelisted() works", async function () {
    await bcubePS.methods.removeWhitelisted(accounts[2]).send({
      from: accounts[0],
    });
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[2],
        value: web3.utils.toWei("1", "ether"),
      }),
      "WhitelistedRole: caller does not have the Whitelisted role"
    );
  });

  it("stage1 reverts for contribution range at $900 ETH", async function () {
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 90000000000 / ethPrice.toNumber();
    await bcubePS.methods.addWhitelisted(accounts[2]).send({
      from: accounts[0],
    });
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[2],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage1 reverts for contribution range at $26k ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2600000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[2],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage1 reverts for contribution range at $900 USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[2],
    });
    await usdt.methods.transfer(accounts[2], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 90000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[2],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage1 reverts for contribution range at $26k USDT", async function () {
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2600000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[2],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("buys $BCUBE @ $0.04 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[2],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[3],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[4],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[4]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(ethDollars.times(100).div(4).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stageOneEth = 100 + ethToBuyBcube * 3;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stageOneEth.toString()
    );
  });

  it("buys $BCUBE @ $0.04 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[5],
    });
    await usdt.methods.transfer(accounts[5], "21000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2000000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[5]).call();
    usdtDollars = new BigNumber(20000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(usdtDollars.times(100).div(4).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage1Usdt = finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage1Usdt / 1000000).toString()
    );
  });

  it("boundary buys $BCUBE @ $0.04 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 1000000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[6],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[6]).call();
    ethDollarsOne = new BigNumber(5000);
    ethDollarsTwo = new BigNumber(5000);
    nextStageAllocation = ethDollarsTwo.times(1000).div(45);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      ethDollarsOne.times(100).div(4).plus(nextStageAllocation).toFixed()
    );
  });
  it("should test previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stageEndEth = stageOneEth + ethToBuyBcube;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stageEndEth.toString()
    );
  });

  it("stage2 reverts for contribution range at $400 ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 40000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[7],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage2 reverts for contribution range at $26k ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2600000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[7],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage2 reverts for contribution range at $400 USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[7],
    });
    await usdt.methods.transfer(accounts[7], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 40000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[7],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage2 reverts for contribution range at $26k USDT", async function () {
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2600000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[7],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("buys $BCUBE @ $0.045 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[7],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[8],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[9],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[9]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(ethDollars.times(1000).div(45).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stage2Eth = stageEndEth + ethToBuyBcube * 3;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stage2Eth.toString()
    );
  });

  it("buys $BCUBE @ $0.045 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[10],
    });
    await usdt.methods.transfer(accounts[10], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2500000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[10],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[10]).call();
    usdtDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(usdtDollars.times(1000).div(45).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage2Usdt = stage1Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage2Usdt / 1000000).toString()
    );
  });

  it("boundary buys $BCUBE @ $0.045 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 1000000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[11],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[11]).call();
    ethDollarsOne = new BigNumber(7500);
    ethDollarsTwo = new BigNumber(2500);
    nextStageAllocation = ethDollarsTwo.times(100).div(5);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      ethDollarsOne.times(1000).div(45).plus(nextStageAllocation).toFixed()
    );
  });
  it("should test previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stageEndEth = stage2Eth + ethToBuyBcube;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stageEndEth.toString()
    );
  });

  it("stage3 reverts for contribution range at $200 ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 20000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[12],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage3 reverts for contribution range at $26k ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2600000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[12],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage3 reverts for contribution range at $200 USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[12],
    });
    await usdt.methods.transfer(accounts[12], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 20000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[12],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage3 reverts for contribution range at $26k USDT", async function () {
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2600000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[12],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("buys $BCUBE @ $0.05 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[12],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[13],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[14],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[15],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[15]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(ethDollars.times(100).div(5).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stage3Eth = stageEndEth + ethToBuyBcube * 4;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stage3Eth.toString()
    );
  });

  it("buys $BCUBE @ $0.05 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[16],
    });
    await usdt.methods.transfer(accounts[16], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2000000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[16],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[16]).call();
    usdtDollars = new BigNumber(20000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(usdtDollars.times(100).div(5).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage3Usdt = stage2Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage3Usdt / 1000000).toString()
    );
  });

  it("boundary buys $BCUBE @ $0.05 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 1000000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[17],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[17]).call();
    ethDollarsOne = new BigNumber(2500);
    ethDollarsTwo = new BigNumber(7500);
    nextStageAllocation = ethDollarsTwo.times(1000).div(55);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      ethDollarsOne.times(100).div(5).plus(nextStageAllocation).toFixed()
    );
  });
  it("should test previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stageEndEth = stage3Eth + ethToBuyBcube;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stageEndEth.toString()
    );
  });

  it("stage4 reverts for contribution range at $90 ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 9000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[18],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage4 reverts for contribution range at $26k ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2600000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[18],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage4 reverts for contribution range at $90 USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[18],
    });
    await usdt.methods.transfer(accounts[18], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 9000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[18],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("stage4 reverts for contribution range at $26k USDT", async function () {
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2600000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[18],
        gasLimit: 6000000,
      }),
      "Contribution range for this round exceeded"
    );
  });

  it("buys $BCUBE @ $0.055 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[18],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[18]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(ethDollars.times(1000).div(55).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await web3.eth.getBalance(team);
    stage4Eth = stageEndEth + ethToBuyBcube;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed()).to.equal(
      stage4Eth.toString()
    );
  });

  it("buys $BCUBE @ $0.055 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[19],
    });
    await usdt.methods.transfer(accounts[19], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2500000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[19],
      gasLimit: 6000000,
    });
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[19]).call();
    usdtDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(usdtDollars.times(1000).div(55).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage4Usdt = stage3Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage4Usdt / 1000000).toString()
    );
  });

  it("reverts for Hard cap exceeded", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[20],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[21],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[22],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
    ethToBuyBcube6k = 600000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[23],
        value: web3.utils.toWei(ethToBuyBcube6k.toString(), "ether"),
      }),
      "Hard cap exceeded"
    );
  });

  it("reverts for Contribution upper limit exceeded, for ETH", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 300000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[23],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
    ethToBuyBcube23k = 2300000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[23],
        value: web3.utils.toWei(ethToBuyBcube23k.toString(), "ether"),
      }),
      "Contribution upper limit exceeded"
    );
  });

  it("reverts for Contribution upper limit exceeded, for USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[23],
    });
    await usdt.methods.transfer(accounts[23], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2300000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[23],
        gasLimit: 6000000,
      }),
      "Contribution upper limit exceeded"
    );
  });

  it("reverts for All tokens allocaated or Hard cap exceeded, for ETH at 99.99% BCUBE allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 200000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[23],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ethToBuyBcube1k = 100000000000 / ethPrice.toNumber();
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[23],
        value: web3.utils.toWei(ethToBuyBcube1k.toString(), "ether"),
      }),
      "Hard cap exceeded"
    );
  });

  it("reverts for All tokens allocaated or Hard cap exceeded, for USDT at 99.99% BCUBE allocation", async function () {
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 100000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
    await truffleAssert.reverts(
      bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[23],
        gasLimit: 6000000,
      }),
      "Hard cap exceeded"
    );
  });
});

describe("BCUBE Private Sale tests with boundaries bought in USDT", function () {
  this.timeout(3600000);
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  let bcubeDeployed,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    ethToBuyBcube,
    finalUsdtAmt,
    stage1Usdt,
    stage2Usdt,
    stage3Usdt,
    stage4Usdt;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
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
    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 2; i <= 19; i++) {
      await bcubePS.methods.addWhitelisted(accounts[i]).send({
        from: accounts[0],
      });
    }
    await web3.eth.sendTransaction({
      from: accounts[23],
      to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      value: web3.utils.toWei("5", "ether"),
    });
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("checks if deployer is WhitelistAdmin", async function () {
    flag = await bcubePS.methods.isWhitelistAdmin(accounts[0]).call();
    expect(flag).to.equal(true);
  });

  it("checks if accounts[1] is wallet() i.e. team's address", async function () {
    teamAddress = await bcubePS.methods.wallet().call();
    expect(teamAddress).to.equal(accounts[1]);
  });

  it("checks if token() is deployed BCUBE address", async function () {
    bcubeAddress = await bcubePS.methods.token().call();
    expect(bcubeAddress).to.equal(bcubeDeployed.address);
  });

  it("reverts for non-whitelistAdmin calling setETHPriceFeed()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods
        .setETHPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[1],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTPriceFeed()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods
        .setUSDTPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[2],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTInstance()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods
        .setUSDTInstance("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[3],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling extendClosingTime()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods.extendClosingTime("2246400").send({
        from: accounts[4],
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("changes USDT instance in contract", async function () {
    await bcubePS.methods
      .setUSDTInstance("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: accounts[0],
      });
    newInstance = await bcubePS.methods.usdt().call();
    expect(newInstance).to.equal("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  });

  it("changes ETH price feed in contract (ignore-worthy test)", async function () {
    await bcubePS.methods
      .setETHPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: accounts[0],
      });
    await bcubePS.methods
      .setETHPriceFeed("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
      .send({
        from: accounts[0],
      });
  });

  it("changes USDT price feed in contract (ignore-worthy test)", async function () {
    await bcubePS.methods
      .setUSDTPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: accounts[0],
      });
    await bcubePS.methods
      .setUSDTPriceFeed("0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46")
      .send({
        from: accounts[0],
      });
  });

  it("buys $BCUBE @ $0.04 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await bcubePS.methods.setUSDTInstance(CONSTANTS.TETHER_ADDRESS).send({
      from: accounts[0],
    });
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    ethToBuyBcube20 = 2000000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[2],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[3],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[4],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[5],
      value: web3.utils.toWei(ethToBuyBcube20.toString(), "ether"),
    });
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[6],
    });
    await usdt.methods.transfer(accounts[6], "21000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 1000000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[6],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[6]).call();
    usdtDollarsOne = new BigNumber(5000);
    usdtDollarsTwo = new BigNumber(5000);
    nextStageAllocation = usdtDollarsTwo.times(1000).div(45);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      usdtDollarsOne.times(100).div(4).plus(nextStageAllocation).toFixed()
    );
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage1Usdt = finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage1Usdt / 1000000).toString()
    );
  });

  it("extends private sale closing time", async function () {
    newClosingTime = closingTime + 6912000;
    await bcubePS.methods.extendClosingTime(newClosingTime).send({
      from: accounts[0],
    });
    nCTFromContract = await bcubePS.methods.closingTime().call();
    expect(nCTFromContract).to.equal(newClosingTime.toString());
  });

  it("buys $BCUBE @ $0.045 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[7],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[8],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[9],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[10],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[11],
    });
    await usdt.methods.transfer(accounts[11], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 1000000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[11],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[11]).call();
    usdtDollarsOne = new BigNumber(7500);
    usdtDollarsTwo = new BigNumber(2500);
    nextStageAllocation = usdtDollarsTwo.times(100).div(5);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      usdtDollarsOne.times(1000).div(45).plus(nextStageAllocation).toFixed()
    );
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage2Usdt = stage1Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage2Usdt / 1000000).toString()
    );
  });

  it("buys $BCUBE @ $0.05 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    ethToBuyBcube20 = 2000000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[12],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[13],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[14],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[15],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[16],
      value: web3.utils.toWei(ethToBuyBcube20.toString(), "ether"),
    });
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[17],
    });
    await usdt.methods.transfer(accounts[17], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 1000000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[17],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[17]).call();
    usdtDollarsOne = new BigNumber(2500);
    usdtDollarsTwo = new BigNumber(7500);
    nextStageAllocation = usdtDollarsTwo.times(1000).div(55);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(
      usdtDollarsOne.times(100).div(5).plus(nextStageAllocation).toFixed()
    );
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage3Usdt = stage2Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage3Usdt / 1000000).toString()
    );
  });

  it("buys $BCUBE @ $0.055 calling buyBcubeUsingETH() after boundary USDT buy, checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePS.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[18],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[18]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(ethDollars.times(1000).div(55).toFixed());
  });

  it("buys $BCUBE @ $0.055 calling buyBcubeUsingUSDT() after boundary USDT buy, checking allocation", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[19],
    });
    await usdt.methods.transfer(accounts[19], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    usdtAmt = 2500000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[19],
      gasLimit: 6000000,
    });
    ret = await bcubePS.methods.bcubeAllocationRegistry(accounts[19]).call();
    usdtDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcube).div(eighteenZeroes).toFixed()
    ).to.equal(usdtDollars.times(1000).div(55).toFixed());
  });
  it("tests previous buy, checking team's _wallet()", async function () {
    team = await bcubePS.methods.wallet().call();
    bal = await usdt.methods.balanceOf(team).call();
    stage4Usdt = stage3Usdt + finalUsdtAmt;
    expect((bal / 1000000).toString()).to.equal(
      (stage4Usdt / 1000000).toString()
    );
  });
});
