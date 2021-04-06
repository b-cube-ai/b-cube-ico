const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const BCubePrivateSale = artifacts.require("BCubePrivateSale");
const BCubePublicSale = artifacts.require("BCubePublicSale");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe("BCUBE Public Sale tests", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    bcubePublicSale,
    deployerWallet,
    adminWallet,
    teamWallet,
    ethToBuyBcube,
    bcube,
    finalUsdtAmt,
    stageOneEth,
    stage2Eth,
    stageEndEth,
    stage1Usdt,
    stage2Usdt;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    deployerWallet = accounts[0];
    adminWallet = accounts[1];
    teamWallet = accounts[2];
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "1000000000000000000000",
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
    bcubePublicSaleDeployed = await BCubePublicSale.new(
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      bcubePrivateSaleDeployed.address,
      teamWallet
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.BPS_ADDRESS = bcubePrivateSaleDeployed.address;
    CONSTANTS.BPUBLICSALE_ADDRESS = bcubePublicSaleDeployed.address;
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePrivateSale = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    bcubePublicSale = new web3.eth.Contract(CONSTANTS.BPUBLICSALE_ABI, CONSTANTS.BPUBLICSALE_ADDRESS);
    await bcubePublicSale.methods.setAdmin(adminWallet).send({
      from: deployerWallet,
    });
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    await bcubePrivateSale.methods.addWhitelisted(accounts[4]).send({
      from: deployerWallet,
    });
    await web3.eth.sendTransaction({
      from: accounts[23],
      to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      value: web3.utils.toWei("5", "ether"),
    });
    await bcube.methods.mint(CONSTANTS.BPUBLICSALE_ADDRESS, new BigNumber("15000000").multipliedBy(eighteenZeroes)).send({
      from: deployerWallet
    })
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("should revert when calling buyBcubeUsingETH() with non-whitelisted address", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[3],
        value: web3.utils.toWei("1", "ether"),
      }),
      "BCubePublicSale: caller does not have the Whitelisted role"
    );
  });

  it("should have delegate whitelisting admin to admin wallet", async function () {
    const deployerIsAdmin = await bcubePublicSale.methods.isWhitelistAdmin(deployerWallet).call();
    const adminIsAdmin = await bcubePublicSale.methods.isWhitelistAdmin(adminWallet).call();
    const deployerIsPauser = await bcubePublicSale.methods.isPauser(deployerWallet).call();
    const adminIsPauser = await bcubePublicSale.methods.isPauser(adminWallet).call();
    expect(deployerIsAdmin).to.be.false;
    expect(adminIsAdmin).to.be.true;
    expect(deployerIsPauser).to.be.false;
    expect(adminIsPauser).to.be.true;
  });

  it("reverts for non-admin calling pause()", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods
        .pause()
        .send({
          from: accounts[0],
        }),
      "PauserRole: caller does not have the Pauser role"
    );
  });

  it("reverts for non-whitelistAdmin calling setETHPriceFeed()", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods
        .setETHPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTPriceFeed()", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods
        .setUSDTPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTInstance()", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods
        .setUSDTInstance("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling extendClosingTime()", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods.extendClosingTime("2246400").send({
        from: accounts[0],
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("changes ETH price feed in contract (ignore-worthy test)", async function () {
    await bcubePublicSale.methods
      .setETHPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    await bcubePublicSale.methods
      .setETHPriceFeed("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
      .send({
        from: adminWallet,
      });
  });

  it("changes USDT price feed in contract (ignore-worthy test)", async function () {
    await bcubePublicSale.methods
      .setUSDTPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    await bcubePublicSale.methods
      .setUSDTPriceFeed("0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46")
      .send({
        from: adminWallet,
      });
  });

  it("changes USDT instance in contract", async function () {
    await bcubePublicSale.methods
      .setUSDTInstance("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    newInstance = await bcubePublicSale.methods.usdt().call();
    expect(newInstance).to.equal("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    await bcubePublicSale.methods
      .setUSDTInstance("0xdAC17F958D2ee523a2206206994597C13D831ec7")
      .send({
        from: adminWallet,
      });
  });

  it("changes extendClosingTime in contract", async function () {
    await bcubePublicSale.methods
      .extendClosingTime(closingTime.toString())
      .send({
        from: adminWallet,
      });
  });

  it("should revert for whitelisted address calling buyBcubeUsingETH() before sale start time", async function () {
    await bcubePublicSale.methods.addWhitelisted(accounts[3]).send({
      from: adminWallet,
    });
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[3],
        value: web3.utils.toWei("1", "ether"),
      }),
      "BCubePublicSale: not open"
    );
  });

  it("Pre-ICO reverts for contribution bellow $500 ETH", async function () {
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 10000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[3],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "BCubePublicSale: Minimal contribution is 500 USD"
    );
  });

  it("Pre-ICO reverts for contribution bellow $500 USDT", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingUSDT(100000000).send({
        from: accounts[3],
      }),
      "BCubePublicSale: Minimal contribution is 500 USD"
    );
  });

  it("Pre-ICO reverts for contribution above $100000 USDT", async function () {
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingUSDT(150000000000).send({
        from: accounts[3],
      }),
      "BCubePublicSale: Maximal contribution is 100000 USD"
    );
  });

  it("buys $BCUBE @ $0.08 calling buyBcubeUsingETH(), checking allocation", async function () {
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePublicSale.methods.addWhitelisted(accounts[5]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[3],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[4],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000"),
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[5],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000"),
    });
    ethDollars = new BigNumber(25000);
    ret = await bcubePublicSale.methods.bcubeAllocationRegistry(accounts[4]).call();
    expect(
      new BigNumber(ret.allocatedBcubePreICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(ethDollars.times(100).div(8).toFixed(0));
    expect(
      new BigNumber(ret.dollarUnitsPayed).div(1000000000).toFixed(0),
      "25000"
    );
    const netSoldBcube = await bcubePublicSale.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(eighteenZeroes).toFixed(0)
    ).to.equal(ethDollars.times(100).div(8).times(3).toFixed(0));
  });
  
  it("tests previous buy, checking team's _wallet()", async function () {
    bal = await web3.eth.getBalance(teamWallet);
    stageOneEth = 100 + ethToBuyBcube * 3;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed(0)).to.equal(
      stageOneEth.toFixed(0)
    );
  });

  it("buys $BCUBE @ $0.08 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await bcubePublicSale.methods.addWhitelisted(accounts[6]).send({
      from: adminWallet,
    });
    await usdt.methods.approve(CONSTANTS.BPUBLICSALE_ADDRESS, "500000000000").send({
      from: accounts[6],
    });
    await usdt.methods.transfer(accounts[6], "500000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePublicSale.methods.fetchUSDTPrice().call());
    usdtAmt = 48500000000000 / usdtPrice;
    amount = (Math.floor(usdtAmt * 1000000) / 5);
    finalUsdtAmt = 0;
    for(let i = 1; i<= 5; i++) {
      await bcubePublicSale.methods.buyBcubeUsingUSDT(amount.toFixed(0)).send({
        from: accounts[6],
        gasLimit: 6000000,
      });
      finalUsdtAmt += amount;
    }
    ret = await bcubePublicSale.methods.bcubeAllocationRegistry(accounts[6]).call();
    usdtDollars = new BigNumber(485000);
    expect(
      new BigNumber(ret.dollarUnitsPayed).div(1000000000).toFixed(0),
      "485000"
    );
    expect(
      new BigNumber(ret.allocatedBcubePreICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(usdtDollars.times(100).div(8).toFixed(0));
  });
  
  it("tests previous buy, checking team's _wallet()", async function () {
    bal = await usdt.methods.balanceOf(teamWallet).call();
    stage1Usdt = finalUsdtAmt;
    expect((bal / 1000000).toFixed(3)).to.equal(
      (finalUsdtAmt / 1000000).toFixed(3)
    );
  });

  it("boundary buys $BCUBE @ $0.08 calling buyBcubeUsingETH(), checking allocation", async function () {
    // At this step, it remains 1 000 000 tokens in Pre-ICO
    await bcubePublicSale.methods.addWhitelisted(accounts[7]).send({
      from: adminWallet,
    });
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 10000000000000 / ethPrice.toNumber();
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[7],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    ret = await bcubePublicSale.methods.bcubeAllocationRegistry(accounts[7]).call();
    ethDollarsOne = new BigNumber(80000);
    ethDollarsTwo = new BigNumber(20000);
    expect(
      new BigNumber(ret.allocatedBcubePreICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(
      ethDollarsOne.times(100).div(8).toFixed(0)
    )    
    expect(
      new BigNumber(ret.allocatedBcubeICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(
      ethDollarsTwo.times(10).toFixed(0)
    )    
  });
  
  it("should test previous buy, checking team's _wallet()", async function () {
    bal = await web3.eth.getBalance(teamWallet);
    stageEndEth = stageOneEth + ethToBuyBcube;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed(0)).to.equal(
      stageEndEth.toFixed(0)
    );
  });

  it("ICO reverts for contribution bcubePublicSale under $500 ETH", async function () {
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 40000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[7],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      }),
      "BCubePublicSale: Minimal contribution is 500 USD"
    );
  });

  it("ICO reverts for contribution range at $400 USDT", async function () {
    await usdt.methods.approve(CONSTANTS.BPS_ADDRESS, "1000000000000").send({
      from: accounts[7],
    });
    await usdt.methods.transfer(accounts[7], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePublicSale.methods.fetchUSDTPrice().call());
    usdtAmt = 40000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
        from: accounts[7],
        gasLimit: 6000000,
      }),
      "BCubePublicSale: Minimal contribution is 500 USD"
    );
  });

  it("buys $BCUBE @ $0.1 calling buyBcubeUsingETH(), checking allocation", async function () {
    await bcubePublicSale.methods.addWhitelisted(accounts[8]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[9]).send({
      from: adminWallet,
    });
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 2500000000000 / ethPrice.toNumber();
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[7],
      gasLimit: 6000000,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[8],
      gasLimit: 6000000,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[9],
      gasLimit: 6000000,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
    });
    ret = await bcubePublicSale.methods.bcubeAllocationRegistry(accounts[9]).call();
    ethDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcubeICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(ethDollars.times(10).toFixed(0));
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    bal = await web3.eth.getBalance(teamWallet);
    stage2Eth = stageEndEth + ethToBuyBcube * 3;
    expect(new BigNumber(bal).div(eighteenZeroes).toFixed(0)).to.equal(
      stage2Eth.toFixed(0)
    );
  });

  it("buys $BCUBE @ $0.1 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    await bcubePublicSale.methods.addWhitelisted(accounts[10]).send({
      from: adminWallet,
    });
    await usdt.methods.approve(CONSTANTS.BPUBLICSALE_ADDRESS, "1000000000000").send({
      from: accounts[10],
    });
    await usdt.methods.transfer(accounts[10], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    usdtPrice = new BigNumber(await bcubePublicSale.methods.fetchUSDTPrice().call());
    usdtAmt = 2500000000000 / usdtPrice;
    finalUsdtAmt = Math.floor(usdtAmt * 1000000);
    await bcubePublicSale.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[10],
      gasLimit: 6000000,
    });
    ret = await bcubePublicSale.methods.bcubeAllocationRegistry(accounts[10]).call();
    usdtDollars = new BigNumber(25000);
    expect(
      new BigNumber(ret.allocatedBcubeICO).div(eighteenZeroes).toFixed(0)
    ).to.equal(usdtDollars.times(10).toFixed(0));
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    bal = await usdt.methods.balanceOf(teamWallet).call();
    stage2Usdt = stage1Usdt + finalUsdtAmt;
    expect((bal / 1000000).toFixed(0)).to.equal(
      (stage2Usdt / 1000000).toFixed(0)
    );
  });

  it('reverts when paused', async function() {
    await bcubePublicSale.methods.addWhitelisted(accounts[11]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.pause().send({
      from: adminWallet,
    });
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 100000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[11],
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: 6000000,
      }),
      "BCubePublicSale: not open"
    );
  });

  it('admin can unpause', async function() {
    await bcubePublicSale.methods.unpause().send({
      from: adminWallet,
    });
  });
  
  it("reverts for Hard cap exceeded", async function () {
    await bcubePublicSale.methods.addWhitelisted(accounts[12]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[13]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[14]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[15]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[16]).send({
      from: adminWallet,
    });
    await bcubePublicSale.methods.addWhitelisted(accounts[17]).send({
      from: adminWallet,
    });
    ethPrice = new BigNumber(await bcubePublicSale.methods.fetchETHPrice().call());
    ethToBuyBcube = 10000000000000 / ethPrice.toNumber();
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[11],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[12],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[13],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[14],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[15],
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });
    await bcubePublicSale.methods.buyBcubeUsingETH().send({
      from: accounts[16],
      value: web3.utils.toWei((5000000000000 / ethPrice.toNumber()).toString(), "ether"),
      gasLimit: 6000000,
    });
    netSoldBcube = new BigNumber(await bcubePublicSale.methods.netSoldBcube().call())
      .div(eighteenZeroes)
      .toFixed(0);
    console.log("netSoldBcube", netSoldBcube);
    ethToBuyBcube60k = 6000000000000 / ethPrice.toNumber();
    await truffleAssert.reverts(
      bcubePublicSale.methods.buyBcubeUsingETH().send({
        from: accounts[17],
        value: web3.utils.toWei(ethToBuyBcube60k.toString(), "ether"),
        gasLimit: 6000000,
      }),
      "BCubePublicSale: Hard cap exceeded"
    );
  });

});
