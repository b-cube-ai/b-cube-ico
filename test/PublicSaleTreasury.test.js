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
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    listingTime = closingTime + 6912000;
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
      listingTime
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
    for (let i = 5; i <= 19; i++) {
      await psTreasury.methods.addWhitelisted(accounts[i]).send({
        from: adminWallet,
      });
    }
    await timeMachine.advanceTimeAndBlock(2246400);
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
    for (let i = 5; i <= 15; i++) {
      await psTreasury.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((10000000000000 / ethPrice).toString(), "ether"),
        gasLimit: 6000000,
      });
    }
    await psTreasury.methods.buyBcubeUsingETH().send({
      from: accounts[16],
      value: web3.utils.toWei((600000000000 / ethPrice).toString(), "ether"),
      gasLimit: 6000000,
    });
    for (let i = 17; i <= 19; i++) {
      await psTreasury.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((10000000000000 / ethPrice).toString(), "ether"),
        gasLimit: 6000000,
      });
    }
    alloc5 = await psTreasury.methods.bcubeAllocationRegistry(accounts[5]).call();
    alloc6 = await psTreasury.methods.bcubeAllocationRegistry(accounts[6]).call();
    alloc17 = await psTreasury.methods.bcubeAllocationRegistry(accounts[17]).call();
    alloc18 = await psTreasury.methods.bcubeAllocationRegistry(accounts[18]).call();
    for (let i = 5; i <= 19; i++) {
      const alloc = await psTreasury.methods.bcubeAllocationRegistry(accounts[i]).call();
      console.log(
        "[" + i + "]",
        'PreICO',
        new BigNumber((alloc.allocatedBcubePreICO)).div(1e18).toFixed(0),
        'ICO',
        new BigNumber((alloc.allocatedBcubeICO)).div(1e18).toFixed(0)
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
      psTreasury.methods.publicSaleShareWithdraw(alloc5.allocatedBcubePreICO).send({
        from: accounts[5],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for admin calling setListingTime() after listing", async function () {
    // listingTime arrives
    await timeMachine.advanceTimeAndBlock(6912000 + 864000);
    
    await truffleAssert.reverts(
      psTreasury.methods.setListingTime(closingTime + 691200 + 96400).send({
        from: adminWallet
      }),
      "listingTime unchangable after listing"
    );
  });

  it("disallows 5 to withdraw all tokens after listing", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(alloc5.allocatedBcubePreICO).send({
        from: accounts[5],
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 5 to withdraw 50% of Pre-ICO tokens after listing", async function () {
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(2).toFixed(0);
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[5],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 5 to withdraw 25% of Pre-ICO tokens after listing", async function () {
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal.toString()).to.equal(withdraw);
  });

  it("disallows 18 to withdraw 100% of ICO tokens after listing", async function () {
    const withdraw = new BigNumber(alloc18.allocatedBcubeICO).toFixed(0);
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[14],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 18 to withdraw 50% of ICO tokens after listing", async function () {
    const withdraw = new BigNumber(alloc18.allocatedBcubeICO).div(2).toFixed(0);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[18],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[18]).call();
    expect(bal.toString()).to.equal(withdraw);
  });

  it("disallows non-participant to withdraw after listing", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw("1000000000000000000").send({
        from: accounts[20],
        gasLimit: 6000000,
      }),
      "!publicSaleParticipant || 0 BCUBE allocated"
    );
  });

  it("allows 17 to withdraw 25% of Pre-ICO + 50% of ICO tokens after listing", async function () {
    const withdraw = new BigNumber(alloc17.allocatedBcubePreICO).div(4).plus(new BigNumber(alloc17.allocatedBcubeICO).div(2)).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[17],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[17]).call();
    expect(bal.toString()).to.equal(withdraw);
  });

  it("disallows 5 to withdraw all Pre-ICO tokens after listing + 31 days", async function () {
    // 31 days after listing
    await timeMachine.advanceTimeAndBlock(2678400);
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).times(3).toFixed(0);
    await truffleAssert.reverts(
        psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[5],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 5 to withdraw  75% Pre-ICO tokens after listing + 31 days", async function () {
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).times(2).toFixed(0);
    await truffleAssert.reverts(
        psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[5],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 5 to withdraw 50% Pre-ICO tokens after listing + 31 days", async function () {
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal.toString()).to.equal(new BigNumber(withdraw).times(2).toFixed(0));
  });

  it("disallows 18 to withdraw all ICO tokens after listing + 31 days", async function () {
    const withdraw = new BigNumber(alloc18.allocatedBcubeICO).toFixed(0);
    await truffleAssert.reverts(
        psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[18],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 18 to withdraw 75% of ICO tokens after listing + 31 days", async function () {
    const withdraw = new BigNumber(alloc18.allocatedBcubeICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[18],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[18]).call();
    expect(bal.toString()).to.equal(new BigNumber(withdraw).times(3).toFixed(0));
  });

  it("allows 17 to withdraw 50% of Pre-ICO + 75% of ICO tokens after listing + 31 days", async function () {
    const withdraw = new BigNumber(alloc17.allocatedBcubePreICO).div(4).plus(new BigNumber(alloc17.allocatedBcubeICO).div(4)).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[17],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[17]).call();
    expect(bal.toString()).to.equal(
      new BigNumber(alloc17.allocatedBcubePreICO).div(2).plus(new BigNumber(alloc17.allocatedBcubeICO).div(4).times(3)).toFixed(0)
    );
  });

  it("disallows 5 to withdraw all Pre-ICO tokens after listing + 31 days", async function () {
    // 62 days after listing
    await timeMachine.advanceTimeAndBlock(2678400);
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).times(2).toFixed(0);
    await truffleAssert.reverts(
        psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
        from: accounts[5],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 5 to withdraw 75% Pre-ICO tokens after listing + 62 days", async function () {
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal.toString()).to.equal(new BigNumber(withdraw).times(3).toFixed(0));
  });

  it("allows 18 to withdraw 100% of ICO tokens after listing + 62 days", async function () {
    const withdraw = new BigNumber(alloc18.allocatedBcubeICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[18],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[18]).call();
    expect(bal.toString()).to.equal(new BigNumber(alloc18.allocatedBcubeICO).toFixed(0));
  });

  it("allows 17 to withdraw 75% of Pre-ICO + 100% of ICO tokens after listing + 62 days", async function () {
    const withdraw = new BigNumber(alloc17.allocatedBcubePreICO).div(4).plus(new BigNumber(alloc17.allocatedBcubeICO).div(4)).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[17],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[17]).call();
    expect(bal.toString()).to.equal(
      new BigNumber(alloc17.allocatedBcubePreICO).div(4).times(3).plus(new BigNumber(alloc17.allocatedBcubeICO)).toFixed(0)
    );
  });

  it("allows 5 to withdraw all Pre-ICO tokens after listing + 93 days", async function () {
    // 93 days after listing
    await timeMachine.advanceTimeAndBlock(2678400);
    const withdraw = new BigNumber(alloc5.allocatedBcubePreICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[5],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal.toString()).to.equal(new BigNumber(alloc5.allocatedBcubePreICO).toFixed(0));
  });

  it("allows 17 to withdraw 100% of Pre-ICO + 100% of ICO tokens after listing + 93 days", async function () {
    const withdraw = new BigNumber(alloc17.allocatedBcubePreICO).div(4).toFixed(0,1);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[17],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[17]).call();
    expect(bal.toString()).to.equal(
      new BigNumber(alloc17.allocatedBcubePreICO).plus(new BigNumber(alloc17.allocatedBcubeICO)).toFixed(0)
    );
  });

  it('allows 6 to withdraw 100% of Pre-ICO tokens after listing + 93 days', async function () {
    const withdraw = new BigNumber(alloc6.allocatedBcubePreICO).toFixed(0);
    await psTreasury.methods.publicSaleShareWithdraw(withdraw).send({
      from: accounts[6],
      gasLimit: 6000000,
    });
    bal = await bcube.methods.balanceOf(accounts[6]).call();
    expect(bal.toString()).to.equal(
      new BigNumber(alloc6.allocatedBcubePreICO).toFixed(0)
    );
  });

  it("disallows 18 to withdraw more than 100%", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(1).send({
        from: accounts[18],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 17 to withdraw more than 100%", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(1).send({
        from: accounts[17],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 5 to withdraw more than 100%", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(1).send({
        from: accounts[5],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 6 to withdraw more than 100%", async function () {
    await truffleAssert.reverts(
      psTreasury.methods.publicSaleShareWithdraw(1).send({
        from: accounts[6],
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });
});