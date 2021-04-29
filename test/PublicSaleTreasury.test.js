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
  let snapshotId,

    closingTime,

    accounts,
    deployerWallet,
    adminWallet,
    teamWallet,

    investor1,
    investor2,
    investor3,
    investor4,
    investor5,
    investor6,
    
    bcubeToken,
    publicTreasury,
    
    bcubeTokenContract,
    publicTreasuryContract;

  const allocations = {
    'investor1': {
      private: new BigNumber('1000000').times(new BigNumber('1e18')),
      public: new BigNumber('0').times(new BigNumber('1e18')),
      alloc: new BigNumber('0').times(new BigNumber('1e18')),
    },
    'investor2': {
      private: new BigNumber('0').times(new BigNumber('1e18')),
      public: new BigNumber('100000').times(new BigNumber('1e18')),
      alloc: new BigNumber('0').times(new BigNumber('1e18')),
    },
    'investor3': {
      private: new BigNumber('0').times(new BigNumber('1e18')),
      public: new BigNumber('300000').times(new BigNumber('1e18')),
      alloc: new BigNumber('0').times(new BigNumber('1e18')),
    },
    'investor4': {
      private: new BigNumber('0').times(new BigNumber('1e18')),
      public: new BigNumber('0').times(new BigNumber('1e18')),
      alloc: new BigNumber('0').times(new BigNumber('1e18')),
    },
    'investor5': {
      private: new BigNumber('333333').times(new BigNumber('1e18')),
      public: new BigNumber('475000').times(new BigNumber('1e18')),
      alloc: new BigNumber('300000').times(new BigNumber('1e18')),
    },
    'investor6': {
      private: new BigNumber('0').times(new BigNumber('1e18')),
      public: new BigNumber('0').times(new BigNumber('1e18')),
      alloc: new BigNumber('500000').times(new BigNumber('1e18')),
    },
  };
  before(async function () {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    const openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    const listingTime = closingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    deployerWallet = accounts[0];
    adminWallet = accounts[1];
    teamWallet = accounts[2];

    investor1 = accounts[3];
    investor2 = accounts[4];
    investor3 = accounts[5];
    investor4 = accounts[6];
    investor5 = accounts[7];
    investor6 = accounts[8];

    bcubeToken = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "1000000000000000000000",
      "50000000000000000000000000"
    );
    privateSale = await BCubePrivateSale.new(
      teamWallet,
      bcubeToken.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    );
    publicTreasury = await PublicSaleTreasury.new(
      teamWallet,
      adminWallet,
      bcubeToken.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      privateSale.address,
      listingTime
    );
    bcubeTokenContract = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, bcubeToken.address);
    privateSaleContract = new web3.eth.Contract(CONSTANTS.BPS_ABI, privateSale.address);
    publicTreasuryContract = new web3.eth.Contract(CONSTANTS.PUBLIC_SALE_TREASURY_ABI, publicTreasury.address);
    
    usdtContract = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );

    await web3.eth.sendTransaction({
      from: accounts[23],
      to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      value: web3.utils.toWei("5", "ether"),
    });

    await usdtContract.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });


    for (const account of [investor1, investor2, investor3, investor4, investor5, investor6]) {
      await publicTreasuryContract.methods.addWhitelisted(account).send({
        from: adminWallet,
      });
    }

    await publicTreasuryContract.methods.setPrivateAllocation(investor5, new BigNumber('300000').times(new BigNumber('1e18'))).send({
      from: adminWallet,
    });

    await publicTreasuryContract.methods.setPrivateAllocation(investor6, new BigNumber('500000').times(new BigNumber('1e18'))).send({
      from: adminWallet,
    });

    await timeMachine.advanceTimeAndBlock(2246400 + 10000);

    const investInUSDT = async (from, amount) => {
      const usdtPrice = new BigNumber(await publicTreasuryContract.methods.fetchUSDTPrice().call());
      const usdtAmtToBuyBcube = new BigNumber(amount).times(new BigNumber("1e8")).div(usdtPrice);
    
      // approve & mint
      await usdtContract.methods.approve(publicTreasury.address, usdtAmtToBuyBcube.times(new BigNumber("1e6")).toFixed(0)).send({
        from: from,
      });
      await usdtContract.methods.transfer(from, usdtAmtToBuyBcube.times(new BigNumber("1e6")).toFixed(0)).send({
        from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      });
      
      await publicTreasuryContract.methods.buyBcubeUsingUSDT(usdtAmtToBuyBcube.times(new BigNumber('1e6')).toFixed(0)).send({
        from: from,
        gasLimit: new BigNumber("1000000"),
      });
    };

    await investInUSDT(investor1, 150000);
    //await investInUSDT(investor3, 135000);
    await investInUSDT(investor5, 145000);
    await investInUSDT(investor2, 20000);
    await investInUSDT(investor3, 30000);
    await investInUSDT(investor3, 30000);


    await bcubeTokenContract.methods
      .mint(publicTreasury.address, "15000000000000000000000000")
      .send({
        from: deployerWallet,
      });
    const bal = await bcubeTokenContract.methods.balanceOf(publicTreasury.address).call();
    console.log(
      "TREASURY_BCUBE",
      new BigNumber(bal).div(new BigNumber('1e18')).toFixed(0)
    );
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("validate allocations", async function () {
    console.log('---------------------------------------------');
    for (const [index, account] of [investor1, investor2, investor3, investor4, investor5, investor6].entries()) {
      const allocation = await publicTreasuryContract.methods.bcubeAllocationRegistry(account).call();
      console.log(`Investor ${index + 1}`)
      console.log(`\tprivate allocation: ${new BigNumber(allocation.allocatedBcubePrivateAllocation).div(new BigNumber('1e18')).toFixed(0)}`)
      console.log(`\tprivate round: ${new BigNumber(allocation.allocatedBcubePrivateRound).div(new BigNumber('1e18')).toFixed(0)}`)
      console.log(`\tpublic round: ${new BigNumber(allocation.allocatedBcubePublicRound).div(new BigNumber('1e18')).toFixed(0)}`)

      expect(
        new BigNumber(allocation.allocatedBcubePrivateRound).div(new BigNumber('1e18')).toFixed(0),
      ).to.be.equal(allocations[`investor${index+1}`].private.div(new BigNumber('1e18')).toFixed(0), `Invalid PRIVATE ROUND allocation for investor${index+1}`);

      expect(
        new BigNumber(allocation.allocatedBcubePrivateAllocation).div(new BigNumber('1e18')).toFixed(0),
      ).to.be.equal(allocations[`investor${index+1}`].alloc.div(new BigNumber('1e18')).toFixed(0), `Invalid PRIVATE ALLOC allocation for investor${index+1}`);

      expect(
        new BigNumber(allocation.allocatedBcubePublicRound).div(new BigNumber('1e18')).toFixed(0),
      ).to.be.equal(allocations[`investor${index+1}`].public.div(new BigNumber('1e18')).toFixed(0), `Invalid PUBLIC ROUND allocation for investor${index+1}`);
    }
    console.log('---------------------------------------------');
  });

  it("reverts for non-whitelistAdmin calling setListingTime()", async function () {
    await truffleAssert.reverts(
      publicTreasuryContract.methods.setListingTime(closingTime + 691200 + 86400).send({
        from: deployerWallet,
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("increases listingTime by 1 day", async function () {
    await publicTreasuryContract.methods.setListingTime(closingTime + 691200 + 86400).send({
      from: adminWallet,
    });
    newLT = await publicTreasuryContract.methods.listingTime().call();
    expect(newLT).to.equal((closingTime + 691200 + 86400).toString());
  });

  it("reverts for investor5 calling shareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      publicTreasuryContract.methods.shareWithdraw(allocations.investor5.private.toFixed(0)).send({
        from: investor5,
      }),
      "Only callable after listing"
    );
  });

  it("validate calcAllowance for investor5", async function () {
    const oneWeek = 60 * 60 * 24 * 7;
    const listingTime = new BigNumber(await publicTreasuryContract.methods.listingTime().call()).toNumber();

    for (let week = 0; week <= 15; week++) {
      const when = listingTime + (week * oneWeek);
      const allowance = new BigNumber(await publicTreasuryContract.methods.calcAllowance(investor5, when).call()).div(new BigNumber('1e18')).toFixed(0);
      switch(week) {
        case 0:
          expect(allowance).to.be.equal('79167', `Invalid allowance for week ${week}`);
          break;
        case 1:
          expect(allowance).to.be.equal('158333', `Invalid allowance for week ${week}`);
          break;
        case 2:
          expect(allowance).to.be.equal('237500', `Invalid allowance for week ${week}`);
          break;
        case 3:
          expect(allowance).to.be.equal('316667', `Invalid allowance for week ${week}`);
          break;
        case 4:
          expect(allowance).to.be.equal('395833', `Invalid allowance for week ${week}`);
          break;
        case 5:
          expect(allowance).to.be.equal('475000', `Invalid allowance for week ${week}`);
          break;
        case 6:
          expect(allowance).to.be.equal('554167', `Invalid allowance for week ${week}`);
          break;
        case 7:
          expect(allowance).to.be.equal('633333', `Invalid allowance for week ${week}`);
          break;
        case 8:
          expect(allowance).to.be.equal('712500', `Invalid allowance for week ${week}`);
          break;
        case 9:
          expect(allowance).to.be.equal('791667', `Invalid allowance for week ${week}`);
          break;
        case 10:
          expect(allowance).to.be.equal('870833', `Invalid allowance for week ${week}`);
          break;
        case 11:
          expect(allowance).to.be.equal('950000', `Invalid allowance for week ${week}`);
          break;
        case 12:
          expect(allowance).to.be.equal('989583', `Invalid allowance for week ${week}`);
          break;
        case 13:
          expect(allowance).to.be.equal('1029167', `Invalid allowance for week ${week}`);
          break;
        case 14:
          expect(allowance).to.be.equal('1068750', `Invalid allowance for week ${week}`);
          break;
        case 15:
          expect(allowance).to.be.equal('1108333', `Invalid allowance for week ${week}`);
          break;
      }
    }
  });

  it("reverts for admin calling setListingTime() after listing", async function () {
    // listingTime arrives
    await timeMachine.advanceTimeAndBlock(6912000 + 864000);
    
    await truffleAssert.reverts(
      publicTreasuryContract.methods.setListingTime(closingTime + 691200 + 96400).send({
        from: adminWallet
      }),
      "listingTime unchangable after listing"
    );
  });

  it("disallows 5 to withdraw all tokens after listing", async function () {
    await truffleAssert.reverts(
      publicTreasuryContract.methods.shareWithdraw(allocations.investor5.alloc.plus(allocations.investor5.private).plus(allocations.investor5.public).toFixed(0)).send({
        from: investor5,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 5 to withdraw 50% of Private Round tokens after listing", async function () {
    const withdraw = new BigNumber(allocations.investor5.private).div(2).toFixed(0);
    await truffleAssert.reverts(
      publicTreasuryContract.methods.shareWithdraw(withdraw).send({
        from: investor5,
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 5 to withdraw 50% of Private Allocation tokens after listing", async function () {
    const withdraw = new BigNumber(allocations.investor5.alloc).div(2).toFixed(0);
    await truffleAssert.reverts(
      publicTreasuryContract.methods.shareWithdraw(withdraw).send({
        from: investor5,
        gasLimit: 6000000,
      }),
      "Insufficient allowance"
    );
  });

  it("allows 5 to withdraw 6.25% of Private Round tokens after listing", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('6250').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 6.25% of Private Allocation tokens after listing", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('18750').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 8.33% of Public Round tokens after listing", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('12499').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });
    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 6.25 of Private Round tokens after listing + 7 days", async function () {
    // 7 days after listing
    await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 7);
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('6250').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 6.25% of Private Allocation tokens after listing + 7 days", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('18750').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 8.33% of Public Round tokens after listing + 7 days", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('12499').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });
    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 6.25 of Private Round tokens after listing + 14 days", async function () {
    // 7 days after listing
    await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 7);
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('6250').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 6.25% of Private Allocation tokens after listing + 14 days", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('18750').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 5 to withdraw 8.33% of Public Round tokens after listing + 14 days", async function () {
    const initialBalance = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18')).toFixed(0);
    const withdraw = new BigNumber('12499').times(new BigNumber('1e18')).toFixed(0);
    await publicTreasuryContract.methods.shareWithdraw(withdraw).send({
      from: investor5,
      gasLimit: 6000000,
    });
    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor5).call()).div(new BigNumber('1e18'));
    expect(bal.minus(initialBalance).toFixed(0)).to.equal(new BigNumber(withdraw).div(new BigNumber('1e18')).toFixed(0));
  });

  it("allows 3 to withdraw 100% of tokens after vesting period", async function () {
    // 13 weeks after
    await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 7 * 15);
    const allocation = await publicTreasuryContract.methods.bcubeAllocationRegistry(investor3).call();
    const withdraw = new BigNumber(allocation.allocatedBcubePrivateAllocation)
      .plus(
        new BigNumber(allocation.allocatedBcubePrivateRound)
      )
      .plus(
        new BigNumber(allocation.allocatedBcubePublicRound)
      );
    await publicTreasuryContract.methods.shareWithdraw(withdraw.toFixed(0)).send({
      from: investor3,
      gasLimit: 6000000,
    });

    const bal = new BigNumber(await bcubeTokenContract.methods.balanceOf(investor3).call()).div(new BigNumber('1e18'));
    expect(bal.toFixed(0)).to.equal('300000');
  });

});