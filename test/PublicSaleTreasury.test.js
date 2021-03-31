const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
const PublicSaleTreasury = artifacts.require("PublicSaleTreasury");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe("Treasury tests without private sale", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    psTreasury,
    deployerWallet,
    adminWallet,
    teamWallet;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    listingTime = closingTime + 6912000;
    twentySixWeeks = 15724800;
    accounts = await web3.eth.getAccounts();
    deployerWallet = accounts[0];
    adminWallet = accounts[1];
    teamWallet = accounts[2];
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "0",
      "50000000000000000000000000"
    );
    bcubePrivateSaleDeployed = await BCubePrivateSale.new(
      teamWallet,
      bcubeDeployed.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    );
    treasuryDeployed = await PublicSaleTreasury.new(
      teamWallet,
      adminWallet,
      bcubeDeployed.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      bcubePrivateSaleDeployed.address,
      closingTime + 6912000
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.PUBLIC_SALE_TREASURY_ADDRESS = treasuryDeployed.address;
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    psTreasury = new web3.eth.Contract(
      CONSTANTS.PUBLIC_SALE_TREASURY_ABI,
      CONSTANTS.PUBLIC_SALE_TREASURY_ADDRESS
    );
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await bcube.methods
      .mint(CONSTANTS.PUBLIC_SALE_TREASURY_ADDRESS, "15000000000000000000000000")
      .send({
        from: deployerWallet,
      });
    console.log(
      "TREASURY_BCUBE",
      await bcube.methods.balanceOf(CONSTANTS.PUBLIC_SALE_TREASURY_ADDRESS).call()
    );

    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 5; i <= 9; i++) {
      await psTreasury.methods.addWhitelisted(accounts[i]).send({
        from: adminWallet,
      });
    }
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(
      await psTreasury.methods.fetchETHPrice().call()
    ).toNumber();
    usdtPrice = new BigNumber(await psTreasury.methods.fetchUSDTPrice().call());
    await usdt.methods
      .approve(CONSTANTS.PUBLIC_SALE_TREASURY_ADDRESS, "1000000000000")
      .send({
        from: accounts[8],
      });
    await usdt.methods.transfer(accounts[8], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 5; i <= 7; i++) {
      await psTreasury.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((8000000000000 / ethPrice).toString(), "ether"),
        gasLimit: 6000000,
      });
    }
    finalUsdtAmt = Math.floor((1600000000000 / usdtPrice) * 1000000);
    await psTreasury.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[8],
      gasLimit: 6000000,
    });
    await psTreasury.methods.buyBcubeUsingETH().send({
      from: accounts[9],
      value: web3.utils.toWei((8000000000000 / ethPrice).toString(), "ether"),
      gasLimit: 6000000,
    });
    bal5 = (await psTreasury.methods.bcubeAllocationRegistry(accounts[5]).call())
      .allocatedBcube;
    bal6 = (await psTreasury.methods.bcubeAllocationRegistry(accounts[6]).call())
      .allocatedBcube;
    bal7 = (await psTreasury.methods.bcubeAllocationRegistry(accounts[7]).call())
      .allocatedBcube;
    bal8 = (await psTreasury.methods.bcubeAllocationRegistry(accounts[8]).call())
      .allocatedBcube;
    bal9 = (await psTreasury.methods.bcubeAllocationRegistry(accounts[9]).call())
      .allocatedBcube;
    for (let i = 5; i < 10; i++) {
      console.log(
        "[" + i + "]",
        new BigNumber((await psTreasury.methods.bcubeAllocationRegistry(accounts[i]).call()).allocatedBcube).div(1e18).toFixed(0)
      );
    }
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("reverts for non-whitelistAdmin calling setListingTime()", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.setListingTime(closingTime + 691200 + 86400).send({
        from: deployerWallet,
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("increases listingTime by 1 day", async function () {
    await psTreasury.methods.setListingTime(closingTime + 691200 + 86400).send({
      from: adminWallet,
    });
    newLT = await psTreasury.methods.listingTime().call();
    expect(newLT).to.equal((closingTime + 691200 + 86400).toString());
  });

  it("reverts for 5 calling publicSaleShareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(bal5).send({
        from: accounts[5],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for admin calling setListingTime() after listing", async function () {
    // listingTime arrives: 180 days ahead of openingTime + 1000
    // then 1 more day ahead due to above increase listingTime
    await timeMachine.advanceTimeAndBlock(twentySixWeeks + 86400);
    await truffleAssert.reverts(
      psTreasury.methods.setListingTime(closingTime + 691200 + 96400).send({
        from: adminWallet
      }),
      "listingTime unchangable after listing"
    );
  });

  it("disallows 5 to more than his balance after listing", async function () {
    const withraw = new BigNumber(bal5).plus(10e18);
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(withraw).send({
        from: accounts[5],
      }),
      "Insufficient allocatedBcube"
    );
  });

  it("allows 5 to withdraw all tokens after listing", async function () {
    await psTreasury.methods.publicSaleShareWithdraw(bal5).send({
      from: accounts[5],
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal).to.equal(bal5);
  });

  it("disallows non-participant to withdraw after listing", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw("1000000000000000000").send({
        from: accounts[12],
      }),
      "!publicSaleParticipant || 0 BCUBE allocated"
    );
  });

  
  it("allows 8 (USDT buyer) to withdraw in two steps listing", async function () {
    const half = new BigNumber(bal8).div(2);
    await psTreasury.methods.publicSaleShareWithdraw(half).send({
      from: accounts[8],
    });
    await psTreasury.methods.publicSaleShareWithdraw(half).send({
      from: accounts[8],
    });
    bal = await bcube.methods.balanceOf(accounts[8]).call();
    expect(bal).to.equal(bal8);
  });

  it("disallows 9 to withdraw >100%", async function () {
    const first = new BigNumber('10000').times(1e18);
    await psTreasury.methods.publicSaleShareWithdraw(first).send({
      from: accounts[9],
    });
    const second = new BigNumber('90000').times(1e18);
    await psTreasury.methods.publicSaleShareWithdraw(second).send({
      from: accounts[9],
    });
    const last = new BigNumber(bal9).minus(first).minus(second);
    await psTreasury.methods.publicSaleShareWithdraw(last).send({
      from: accounts[9],
    });
    bal = await bcube.methods.balanceOf(accounts[9]).call();
    expect(bal).to.equal(bal9);
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw("1000000000000000000").send({
        from: accounts[9],
      }),
      "Insufficient allocatedBcube"
    );
  });
});