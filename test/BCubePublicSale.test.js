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

  let snapshotId,

    closingTime,
    
    accounts,
    deployerWallet,
    adminWallet,
    teamWallet,
    
    bcubeToken,
    privateSale,
    publicSale,
    
    bcubeTokenContract,
    privateSaleContract,
    publicSaleContract,
    usdtContract,

    ethToBuyBcube,
    usdtAmtToBuyBcube,
    privateRoundEth,
    privateRoundUsdt,
    totalEth;

  before(async function () {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    const currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    const openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    deployerWallet = accounts[0];
    adminWallet = accounts[1];
    teamWallet = accounts[2];
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
    publicSale = await BCubePublicSale.new(
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      privateSale.address,
      teamWallet
    );
    bcubeTokenContract = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, bcubeToken.address);
    privateSaleContract = new web3.eth.Contract(CONSTANTS.BPS_ABI, privateSale.address);
    publicSaleContract = new web3.eth.Contract(CONSTANTS.BPUBLICSALE_ABI, publicSale.address);
    
    await publicSaleContract.methods.setAdmin(adminWallet).send({
      from: deployerWallet,
    });

    await publicSaleContract.methods.setContributionsLimits(
      "50000000000",
      "100000000000000",
    ).send({
      from: adminWallet,
    });
    
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
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("should revert when calling buyBcubeUsingETH() with non-whitelisted address", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: accounts[3],
        value: web3.utils.toWei("1", "ether"),
      }),
      "BCubePublicSale: caller does not have the Whitelisted role"
    );
  });

  it("should have delegate whitelisting admin to admin wallet", async function () {
    const deployerIsAdmin = await publicSaleContract.methods.isWhitelistAdmin(deployerWallet).call();
    const adminIsAdmin = await publicSaleContract.methods.isWhitelistAdmin(adminWallet).call();
    expect(deployerIsAdmin).to.be.false;
    expect(adminIsAdmin).to.be.true;
  });

  it("reverts for non-whitelistAdmin calling setETHPriceFeed()", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods
        .setETHPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTPriceFeed()", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods
        .setUSDTPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling setUSDTInstance()", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods
        .setUSDTInstance("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
        .send({
          from: accounts[0],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for non-whitelistAdmin calling extendClosingTime()", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods.extendClosingTime("2246400").send({
        from: accounts[0],
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("changes ETH price feed in contract (ignore-worthy test)", async function () {
    await publicSaleContract.methods
      .setETHPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    await publicSaleContract.methods
      .setETHPriceFeed("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
      .send({
        from: adminWallet,
      });
  });

  it("changes USDT price feed in contract (ignore-worthy test)", async function () {
    await publicSaleContract.methods
      .setUSDTPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    await publicSaleContract.methods
      .setUSDTPriceFeed("0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46")
      .send({
        from: adminWallet,
      });
  });

  it("changes USDT instance in contract", async function () {
    await publicSaleContract.methods
      .setUSDTInstance("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      .send({
        from: adminWallet,
      });
    newInstance = await publicSaleContract.methods.usdt().call();
    expect(newInstance).to.equal("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    await publicSaleContract.methods
      .setUSDTInstance("0xdAC17F958D2ee523a2206206994597C13D831ec7")
      .send({
        from: adminWallet,
      });
  });

  it("changes extendClosingTime in contract", async function () {
    await publicSaleContract.methods
      .extendClosingTime(closingTime.toString())
      .send({
        from: adminWallet,
      });
  });

  it("should revert for whitelisted address calling buyBcubeUsingETH() before sale start time", async function () {
    await publicSaleContract.methods.addWhitelisted(accounts[3]).send({
      from: adminWallet,
    });
    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: accounts[3],
        value: web3.utils.toWei("1", "ether"),
      }),
      "BCubePublicSale: not open"
    );
  });

  it("admin cannot change the reserve of bcube for launchpad before start time", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods.decreaseLaunchpadReservedBcube(new BigNumber("1000000").times(new BigNumber("1e18"))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: not open"
    );
  });  

  it("buys $BCUBE @ $0.15 calling buyBcubeUsingETH(), checking allocation", async function () {
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    const account1 = accounts[3];
    const account2 = accounts[4];
    const account3 = accounts[5];
    const ethDollars = new BigNumber(25000); // 25kUSD
    const ethPrice = new BigNumber(await publicSaleContract.methods.fetchETHPrice().call());
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await publicSaleContract.methods.addWhitelisted(account2).send({
      from: adminWallet,
    });
    await publicSaleContract.methods.addWhitelisted(account3).send({
      from: adminWallet,
    });
    
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account1,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account2,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000"),
    });
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account3,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000"),
    });
    
    const account2alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account2).call();
    expect(
      new BigNumber(account2alloc.allocatedBcubePrivateRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(ethDollars.times(100).div(15).toFixed(0));
    expect(
      new BigNumber(account2alloc.dollarUnitsPayed).div(1e9).toFixed(0),
      ethDollars.toString()
    );
    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(ethDollars.times(100).div(15).times(3).toFixed(0));
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    const bal = await web3.eth.getBalance(teamWallet);
    privateRoundEth = 100 + ethToBuyBcube * 3;
    expect(new BigNumber(bal).div(new BigNumber("1e18")).toFixed(0)).to.equal(
      privateRoundEth.toFixed(0)
    );
  });

  it("buys $BCUBE @ $0.15 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    const account1 = accounts[6];
    const account2 = accounts[7];
    const account3 = accounts[8];
    
    await publicSaleContract.methods.addWhitelisted(account1).send({
      from: adminWallet,
    });
    await publicSaleContract.methods.addWhitelisted(account2).send({
      from: adminWallet,
    });
    await publicSaleContract.methods.addWhitelisted(account3).send({
      from: adminWallet,
    });

    // 0.833333333m tokens available in Private round, 3 investiments of 40500 USD for a total of 810000 tokens
    const usdtPrice = new BigNumber(await publicSaleContract.methods.fetchUSDTPrice().call());
    usdtAmtToBuyBcube = new BigNumber('40500').times(new BigNumber("1e8")).div(usdtPrice);

    // approve & mint 60kUSDT for account1/2/3
    for (const account of [account1, account2, account3]) {
      const amount = usdtAmtToBuyBcube.times(new BigNumber("1e6"));
      await usdtContract.methods.approve(publicSale.address, amount.toFixed(0)).send({
        from: account,
      });
      await usdtContract.methods.transfer(account, amount.toFixed(0)).send({
        from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      });
    };
    
    for (const account of [account1, account2, account3]) {
      await publicSaleContract.methods.buyBcubeUsingUSDT(usdtAmtToBuyBcube.times(new BigNumber('1e6')).toFixed(0)).send({
        from: account,
        gasLimit: new BigNumber("1000000"),
      });
    };

    const account2alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account2).call();
    expect(
      new BigNumber(account2alloc.allocatedBcubePrivateRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber(40500).times(100).div(15).toFixed(0));
    expect(
      new BigNumber(account2alloc.dollarUnitsPayed).div(1e9).toFixed(0),
      '40500'
    );

    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('1310000').toFixed(0));
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    const bal = await usdtContract.methods.balanceOf(teamWallet).call();
    privateRoundUsdt = usdtAmtToBuyBcube.times(new BigNumber('1e6')).times(3);
    expect((bal / 1000000).toFixed(3)).to.equal(
      (privateRoundUsdt / 1000000).toFixed(3)
    );
  });

  it("boundary buys $BCUBE @ $0.15 calling buyBcubeUsingETH(), checking allocation", async function () {
    // 23333 tokens available in Private Round
    const account = accounts[9];
    
    await publicSaleContract.methods.addWhitelisted(account).send({
      from: adminWallet,
    });

    const ethDollars = new BigNumber(3499.95 + 60000); // 3499,95 USD (23333 token @ $0.15) + 60kUSD (300k token @ 0.20)
    const ethPrice = new BigNumber(await publicSaleContract.methods.fetchETHPrice().call());
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();

    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: 6000000,
    });

    const allocation = await publicSaleContract.methods.bcubeAllocationRegistry(account).call();

    expect(
      new BigNumber(allocation.allocatedBcubePrivateRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(
      '23333'
    );
    expect(
      new BigNumber(allocation.allocatedBcubePublicRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(
      '300000'
    );

    let eth = new BigNumber(50000).times(1e8).div(ethPrice);
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account,
      value: web3.utils.toWei(eth.toNumber().toString(), "ether"),
      gasLimit: 6000000,
    });
    ethToBuyBcube = new BigNumber(ethToBuyBcube).plus(eth);

    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account,
      value: web3.utils.toWei(eth.toNumber().toString(), "ether"),
      gasLimit: 6000000,
    });
    ethToBuyBcube = new BigNumber(ethToBuyBcube).plus(eth);

    eth = new BigNumber(33333.4).times(1e8).div(ethPrice);
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account,
      value: web3.utils.toWei(eth.toNumber().toString(), "ether"),
      gasLimit: 6000000,
    });
    ethToBuyBcube = new BigNumber(ethToBuyBcube).plus(eth);    

    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('2300000').toFixed(0));
  });

  it("should test previous buy, checking team's _wallet()", async function () {
    const bal = await web3.eth.getBalance(teamWallet);
    totalEth = new BigNumber(privateRoundEth).plus(ethToBuyBcube);
    expect(new BigNumber(bal).div(new BigNumber("1e18")).toFixed(0)).to.equal(
      totalEth.toFixed(0)
    );
  });

  it("buys $BCUBE @ $0.20 calling buyBcubeUsingETH(), checking allocation", async function () {
    const account1 = accounts[10];
    const account2 = accounts[11];
    const account3 = accounts[12];
    const ethDollars = new BigNumber(45000); // 45kUSD
    const ethPrice = new BigNumber(await publicSaleContract.methods.fetchETHPrice().call());
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();

    for (const account of [account1, account2, account3]) {
      await publicSaleContract.methods.addWhitelisted(account).send({
        from: adminWallet,
      });
    };

    for (const account of [account1, account2, account3]) {
      await publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      });
    };
    
    const account2alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account2).call();
    expect(
      new BigNumber(account2alloc.allocatedBcubePublicRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(ethDollars.times(100).div(20).toFixed(0));
    expect(
      new BigNumber(account2alloc.dollarUnitsPayed).div(1e9).toFixed(0),
      ethDollars.toString()
    );
    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber('1e18')).toFixed(0),
      "2975000"
    );
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    const bal = await web3.eth.getBalance(teamWallet);
    totalEth = totalEth.plus(new BigNumber(ethToBuyBcube).times(3));
    expect(new BigNumber(bal).div(new BigNumber("1e18")).toFixed(0)).to.equal(
      totalEth.toFixed(0)
    );
  });

  it("buys $BCUBE @ $0.20 calling buyBcubeUsingUSDT(), checking allocation", async function () {
    const account1 = accounts[13];
    const account2 = accounts[14];
    const account3 = accounts[15];
    
    for (const account of [account1, account2, account3]) {
      await publicSaleContract.methods.addWhitelisted(account).send({
        from: adminWallet,
      });
    };

    const usdtPrice = new BigNumber(await publicSaleContract.methods.fetchUSDTPrice().call());
    usdtAmtToBuyBcube = new BigNumber('45000').times(new BigNumber("1e8")).div(usdtPrice); // 60kUSD
    

    // approve & mint 45kUSDT for account1/2/3
    for (const account of [account1, account2, account3]) {
      const amount = usdtAmtToBuyBcube.times(new BigNumber("1e6"));
      await usdtContract.methods.approve(publicSale.address, amount.toFixed(0)).send({
        from: account,
      });
      await usdtContract.methods.transfer(account, amount.toFixed(0)).send({
        from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      });
    };
    
    // 3 investiments of 45kUSD
    for (const account of [account1, account2, account3]) {
      await publicSaleContract.methods.buyBcubeUsingUSDT(usdtAmtToBuyBcube.times(new BigNumber('1e6')).toFixed(0)).send({
        from: account,
        gasLimit: new BigNumber("1000000"),
      });
    };

    const account2alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account2).call();
    expect(
      new BigNumber(account2alloc.allocatedBcubePublicRound).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber(45000).times(100).div(20).toFixed(0));
    expect(
      new BigNumber(account2alloc.dollarUnitsPayed).div(1e9).toFixed(0),
      '45000'
    );

    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('3650000').toFixed(0));
  });

  it("tests previous buy, checking team's _wallet()", async function () {
    const bal = await usdtContract.methods.balanceOf(teamWallet).call();
    const totalUsdt = privateRoundUsdt.plus(usdtAmtToBuyBcube.times(1000000).times(3));
    expect((bal / 1000000).toFixed(3)).to.equal(
      (totalUsdt / 1000000).toFixed(3)
    );
  });

  it("reverts for Hard cap exceeded", async function () {
    // Currently, 3.65m tokens sold. Hard cap is 1.333333333m + 4.75m = 6.08333333m. Remaing tokens = 2.43333333m

    const account1 = accounts[16];
    const account2 = accounts[17];
    const account3 = accounts[18];
    const account4 = accounts[19];
    const account5 = accounts[20];
    const account6 = accounts[21];
    const account7 = accounts[22];
    const account8 = accounts[23];
    const account9 = accounts[24];
    const account10 = accounts[25];
    const account11 = accounts[26];

    const testAccounts = [
      account1, account2, account3, account4, account5, account6, account7, account8, account9, account10
    ];

    const ethDollars = new BigNumber(45000); // 45kUSD
    const ethPrice = new BigNumber(await publicSaleContract.methods.fetchETHPrice().call());
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    for (const account of testAccounts) {
      await publicSaleContract.methods.addWhitelisted(account).send({
        from: adminWallet,
      });

      await publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      });
    };

    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('5900000').toFixed(0));

    await publicSaleContract.methods.addWhitelisted(account11).send({
      from: adminWallet,
    });

    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account11,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Hard cap exceeded"
    );

    ethToBuyBcube = new BigNumber(36666).times(1e8).div(ethPrice).toNumber();
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account11,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });

    ethToBuyBcube = new BigNumber(1000).times(1e8).div(ethPrice).toNumber();
    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account11,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Hard cap exceeded"
    );
  });

  it("admin can decrease the reserve of bcube for launchpad", async function () {
    const currentHardcap = await publicSaleContract.methods.currentHardcap().call();
    expect(
      new BigNumber(currentHardcap).div(new BigNumber('1e18')).toFixed(0)
    ).to.equal('6083333'); 

    const newReserve = new BigNumber('2000000').times(new BigNumber('1e18')); // Launchpad reserve of 2m = 250 000 new tokens for the Public sale!

    await truffleAssert.reverts(
      publicSaleContract.methods.decreaseLaunchpadReservedBcube(newReserve).send({
        from: accounts[12],
        gasLimit: new BigNumber("1000000")
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );

    await truffleAssert.reverts(
      publicSaleContract.methods.decreaseLaunchpadReservedBcube(new BigNumber('3000000').times(new BigNumber('1e18'))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: new reserve can only be decreased"
    );

    await publicSaleContract.methods.decreaseLaunchpadReservedBcube(newReserve).send({
      from: adminWallet,
      gasLimit: new BigNumber("1000000")
    });

    const newHardcap = new BigNumber(await publicSaleContract.methods.currentHardcap().call());
    expect(
      new BigNumber(newHardcap).div(new BigNumber('1e18')).toFixed(0)
    ).to.equal(
      new BigNumber(currentHardcap).plus(new BigNumber('250000').times(new BigNumber('1e18'))).div(new BigNumber('1e18')).toFixed(0),
    );
  });

  it("user can buy new tokens", async function () {
    const account1 = accounts[28];
    const account2 = accounts[29];
    
    const ethDollars = new BigNumber(45000); // 45kUSD
    const ethPrice = new BigNumber(await publicSaleContract.methods.fetchETHPrice().call());
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    for (const account of [account1]) {
      await publicSaleContract.methods.addWhitelisted(account).send({
        from: adminWallet,
      });

      await publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      });
    };

    const netSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(netSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('6308330').toFixed(0));

    await publicSaleContract.methods.addWhitelisted(account2).send({
      from: adminWallet,
    });

    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account2,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Hard cap exceeded"
    );

    ethToBuyBcube = new BigNumber(5000).times(1e8).div(ethPrice).toNumber();
    await publicSaleContract.methods.buyBcubeUsingETH().send({
      from: account2,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });

    ethToBuyBcube = new BigNumber(1000).times(1e8).div(ethPrice).toNumber();
    await truffleAssert.reverts(
      publicSaleContract.methods.buyBcubeUsingETH().send({
        from: account2,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Hard cap exceeded"
    );

    const finalSoldBcube = await publicSaleContract.methods.netSoldBcube().call();
    expect(
      new BigNumber(finalSoldBcube).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal(new BigNumber('6333330').toFixed(0));
  });

  it("admin can define private round allocation up to PRIVATE_ALLOCATION_CAP", async function () {
    const account1 = accounts[32];
    const account2 = accounts[33];
    const account3 = accounts[34];
    const account4 = accounts[35];

    await truffleAssert.reverts(
      publicSaleContract.methods.setPrivateAllocation(account1, new BigNumber('1000000').times(new BigNumber('1e18'))).send({
        from: account1,
        gasLimit: new BigNumber("1000000")
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );

    await truffleAssert.reverts(
      publicSaleContract.methods.setPrivateAllocation(account1, new BigNumber('6666667').times(new BigNumber('1e18'))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: private allocation exceed PRIVATE_ALLOCATION_CAP"
    );

    for (const account of [account1, account2, account3]) {
      const toBeAllocated = new BigNumber('2222222').times(new BigNumber('1e18'));
      await publicSaleContract.methods.setPrivateAllocation(account, toBeAllocated.toFixed(0)).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      });

      const accountAlloc = await publicSaleContract.methods.bcubeAllocationRegistry(account).call();
      expect(
        new BigNumber(accountAlloc.allocatedBcubePrivateAllocation).toFixed(0)
      ).to.equal(toBeAllocated.toFixed(0));
    };

    await truffleAssert.reverts(
      publicSaleContract.methods.setPrivateAllocation(adminWallet, new BigNumber('1').times(new BigNumber('1e18'))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: private allocation exceed PRIVATE_ALLOCATION_CAP"
    );

    await publicSaleContract.methods.setPrivateAllocation(account1, new BigNumber('1000000').times(new BigNumber('1e18'))).send({
      from: adminWallet,
      gasLimit: new BigNumber("1000000")
    });

    await publicSaleContract.methods.setPrivateAllocation(account4, new BigNumber('1000000').times(new BigNumber('1e18'))).send({
      from: adminWallet,
      gasLimit: new BigNumber("1000000")
    });

    const account1Alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account1).call();
    expect(
      new BigNumber(account1Alloc.allocatedBcubePrivateAllocation).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal("1000000");

    const account4Alloc = await publicSaleContract.methods.bcubeAllocationRegistry(account4).call();
    expect(
      new BigNumber(account4Alloc.allocatedBcubePrivateAllocation).div(new BigNumber("1e18")).toFixed(0)
    ).to.equal("1000000");
  });

  it("admin cannot change allocation after close", async function () {
    await timeMachine.advanceTimeAndBlock(6912000 + 10000);

    const account1 = accounts[32];

    await truffleAssert.reverts(
      publicSaleContract.methods.setPrivateAllocation(account1, new BigNumber('500000').times(new BigNumber('1e18'))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: sale is closed"
    );
  });

  it("admin cannot change launchpad reserve close", async function () {
    await truffleAssert.reverts(
      publicSaleContract.methods.decreaseLaunchpadReservedBcube(new BigNumber('1').times(new BigNumber('1e18'))).send({
        from: adminWallet,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: not open"
    );
  });

  it("test global limits", async function () {
    const currentTimestamp = (await web3.eth.getBlock('latest')).timestamp;
    const openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    const newPublicSale = await BCubePublicSale.new(
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      privateSale.address,
      teamWallet
    );
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);

    const newPublicSaleContract = new web3.eth.Contract(CONSTANTS.BPUBLICSALE_ABI, newPublicSale.address);

    const account1 = accounts[3];
    const account2 = accounts[4];
    const account3 = accounts[5];
    
    await newPublicSaleContract.methods.setAdmin(adminWallet).send({
      from: deployerWallet,
    });

    await newPublicSaleContract.methods.addWhitelisted(account1).send({
      from: adminWallet,
    });
    await newPublicSaleContract.methods.addWhitelisted(account2).send({
      from: adminWallet,
    });
    await newPublicSaleContract.methods.addWhitelisted(account3).send({
      from: adminWallet,
    });

    await usdtContract.methods.approve(newPublicSale.address, '1000000000000').send({
      from: account1,
    });
    await usdtContract.methods.transfer(account1, '1000000000000').send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });

    await usdtContract.methods.approve(newPublicSale.address, '1000000000000').send({
      from: account2,
    });
    await usdtContract.methods.transfer(account2, '1000000000000').send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });

    await usdtContract.methods.approve(newPublicSale.address, '1000000000000').send({
      from: account3,
    });
    await usdtContract.methods.transfer(account3, '1000000000000').send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });

    const ethPrice = new BigNumber(await newPublicSaleContract.methods.fetchETHPrice().call());
    
    // ETH bellow $500 should be rejected
    let ethDollars = new BigNumber(100);
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingETH().send({
        from: account1,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Minimum contribution not reached"
    );

    // USDT bellow $500 should be rejected
    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingUSDT('400000000').send({
        from: account1,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Minimum contribution not reached"
    );

    // ETH above $50k should be rejected
    ethDollars = new BigNumber(51000);
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingETH().send({
        from: account1,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Maximum contribution exceeded"
    );

    // USDT above $50k should be rejected
    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingUSDT('51000000000').send({
        from: account1,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Maximum contribution exceeded"
    );

    // Multiple ETH invests should not exceed $50k
    ethDollars = new BigNumber(45000);
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await newPublicSaleContract.methods.buyBcubeUsingETH().send({
      from: account1,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });

    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingETH().send({
        from: account1,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Maximum contribution exceeded"
    );

    ethDollars = new BigNumber(5000);
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await newPublicSaleContract.methods.buyBcubeUsingETH().send({
      from: account1,
      value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
      gasLimit: new BigNumber("1000000")
    });

    ethDollars = new BigNumber(100);
    ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
    
    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingETH().send({
        from: account1,
        value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Maximum contribution exceeded"
    );

    // Multiple USDT invests should not exceed $50k
    await newPublicSaleContract.methods.buyBcubeUsingUSDT('45000000000').send({
      from: account2,
      gasLimit: new BigNumber("1000000")
    });

    await truffleAssert.reverts(
      newPublicSaleContract.methods.buyBcubeUsingUSDT('45000000000').send({
        from: account2,
        gasLimit: new BigNumber("1000000")
      }),
      "BCubePublicSale: Maximum contribution exceeded"
    );

    await newPublicSaleContract.methods.buyBcubeUsingUSDT('4000000000').send({
      from: account2,
      gasLimit: new BigNumber("1000000")
    });
  });

});