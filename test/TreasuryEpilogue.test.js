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

describe("Setting the stage for Treasury's tests", async function () {
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
    // bcubeDeployed = await BCUBEToken.new(
    //   "b-cube.ai Token",
    //   "BCUBE",
    //   "18",
    //   "1000000000000000000000",
    //   "50000000000000000000000000"
    // );
    // bcubePSDeployed = await BCubePrivateSale.new(
    //   accounts[1],
    //   bcubeDeployed.address,
    //   openingTime,
    //   closingTime,
    //   "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    //   "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
    //   "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    // );
    // treasuryDeployed = await Treasury.new(
    //   accounts[1],
    //   bcubeDeployed.address,
    //   openingTime,
    //   closingTime,
    //   "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    //   "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
    //   "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    //   closingTime + 6912000
    // );
    // CONSTANTS.TREASURY_ADDRESS = treasuryDeployed.address;
    // CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    // CONSTANTS.BPS_ADDRESS = "0xba86f59035cc97c426c26cf94e835f6e54ca890a";
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 2; i <= 24; i++) {
      await bcubePS.methods.addWhitelisted(accounts[i]).send({
        from: accounts[0],
      });
    }
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(
      await bcubePS.methods.fetchETHPrice().call()
    ).toNumber();
    usdtPrice = new BigNumber(await bcubePS.methods.fetchUSDTPrice().call());
    for (let i = 1; i <= 4; i++) {
      let j;
      if (i == 1) j = 5;
      else if (i == 2) j = 10;
      else if (i == 3) j = 16;
      else j = 19;
      await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
        from: accounts[j],
      });
      await usdt.methods.transfer(accounts[j], "31000000000").send({
        from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      });
    }
    for (let i = 2; i <= 4; i++) {
      await bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
      });
    }
    finalUsdtAmt = Math.floor((2000000000000 / usdtPrice) * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[6],
      value: web3.utils.toWei((1000000000000 / ethPrice).toString(), "ether"),
    });
    for (let i = 7; i <= 9; i++) {
      await bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
      });
    }
    finalUsdtAmt = Math.floor((2500000000000 / usdtPrice) * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[10],
      gasLimit: 6000000,
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[11],
      value: web3.utils.toWei((1000000000000 / ethPrice).toString(), "ether"),
    });
    for (let i = 12; i <= 15; i++) {
      await bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
      });
    }
    finalUsdtAmt = Math.floor((2000000000000 / usdtPrice) * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[16],
      gasLimit: 6000000,
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[17],
      value: web3.utils.toWei((1000000000000 / ethPrice).toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[18],
      value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
    });
    finalUsdtAmt = Math.floor((2500000000000 / usdtPrice) * 1000000);
    await bcubePS.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[19],
      gasLimit: 6000000,
    });
    for (let i = 20; i <= 22; i++) {
      await bcubePS.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
      });
    }
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[23],
      value: web3.utils.toWei((300000000000 / ethPrice).toString(), "ether"),
    });
    await bcubePS.methods.buyBcubeUsingETH().send({
      from: accounts[23],
      value: web3.utils.toWei((200000000000 / ethPrice).toString(), "ether"),
    });
    nAB = new BigNumber(await bcubePS.methods.netAllocatedBcube().call())
      .div(eighteenZeroes)
      .toFixed();
    console.log("NAB", nAB);
  });

  // after(async function () {
  //   await timeMachine.revertToSnapshot(snapshotId);
  // });

  it("should revert when calling rate()", async function () {
    await truffleAssert.reverts(
      bcubePS.methods.rate().call(),
      "BCubePrivateSale: rate() called"
    );
  });
});
