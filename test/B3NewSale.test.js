const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const B3NewSale = artifacts.require("B3NewSale");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe.only("B3NewSale tests", async function () {
    this.timeout(3600000);

    let snapshotId,

        closingTime,

        accounts,
        deployerWallet,
        adminWallet,
        teamWallet,

        bcubeToken,
        b3NewSale,

        bcubeTokenContract,
        b3NewSaleContract,
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
            "1000000000000000000000", // 1000 BCUBE
            "50000000000000000000000000" // 50000000 BCUBE
        );
        b3NewSale = await B3NewSale.new(
            openingTime,
            closingTime,
            "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
            "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            teamWallet
        )

        bcubeTokenContract = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, bcubeToken.address);
        b3NewSaleContract = new web3.eth.Contract(CONSTANTS.B3NS_ABI, b3NewSale.address);

        await b3NewSaleContract.methods.setAdmin(adminWallet).send({
            from: deployerWallet,
        });

        await b3NewSaleContract.methods.setContributionsLimits(
            "50000000000", // 500e8 => $500
            "250000000000", // 2500e8 => $2500
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

        // 10000000000000 => 100000e8 USDT
        await usdtContract.methods.issue("10000000000000").send({
            from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
        });
    });

    after(async function () {
        await timeMachine.revertToSnapshot(snapshotId);
    });

    it("should revert when calling buyBcubeUsingETH() with non-whitelisted address", async function () {
        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingETH().send({
                from: accounts[3],
                value: web3.utils.toWei("1", "ether"),
            }),
            "B3NewSale: caller does not have the Whitelisted role"
        );
    });

    it("should have delegate whitelisting admin to admin wallet", async function () {
        const deployerIsAdmin = await b3NewSaleContract.methods.isWhitelistAdmin(deployerWallet).call();
        const adminIsAdmin = await b3NewSaleContract.methods.isWhitelistAdmin(adminWallet).call();
        expect(deployerIsAdmin).to.be.false;
        expect(adminIsAdmin).to.be.true;
    });

    it("reverts for non-whitelistAdmin calling setETHPriceFeed()", async function () {
        await truffleAssert.reverts(
            b3NewSaleContract.methods
                .setETHPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
                .send({
                    from: accounts[0],
                }),
            "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
        );
    });

    it("reverts for non-whitelistAdmin calling setUSDTPriceFeed()", async function () {
        await truffleAssert.reverts(
            b3NewSaleContract.methods
                .setUSDTPriceFeed("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
                .send({
                    from: accounts[0],
                }),
            "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
        );
    });

    it("reverts for non-whitelistAdmin calling setUSDTInstance()", async function () {
        await truffleAssert.reverts(
            b3NewSaleContract.methods
                .setUSDTInstance("0x0481bDA39e00bCC24ac276903BcDF3893D8A97ca")
                .send({
                    from: accounts[0],
                }),
            "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
        );
    });

    it("reverts for non-whitelistAdmin calling extendClosingTime()", async function () {
        await truffleAssert.reverts(
            b3NewSaleContract.methods.extendClosingTime("2246400").send({
                from: accounts[0],
            }),
            "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
        );
    });

    it("changes ETH price feed in contract (ignore-worthy test)", async function () {
        await b3NewSaleContract.methods
            .setETHPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
            .send({
                from: adminWallet,
            });
        await b3NewSaleContract.methods
            .setETHPriceFeed("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
            .send({
                from: adminWallet,
            });
    });

    it("changes USDT price feed in contract (ignore-worthy test)", async function () {
        await b3NewSaleContract.methods
            .setUSDTPriceFeed("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
            .send({
                from: adminWallet,
            });
        await b3NewSaleContract.methods
            .setUSDTPriceFeed("0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46")
            .send({
                from: adminWallet,
            });
    });

    it("changes USDT instance in contract", async function () {
        await b3NewSaleContract.methods
            .setUSDTInstance("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
            .send({
                from: adminWallet,
            });
        newInstance = await b3NewSaleContract.methods.usdt().call();
        expect(newInstance).to.equal("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        await b3NewSaleContract.methods
            .setUSDTInstance("0xdAC17F958D2ee523a2206206994597C13D831ec7")
            .send({
                from: adminWallet,
            });
    });

    it("changes extendClosingTime in contract", async function () {
        await b3NewSaleContract.methods
            .extendClosingTime(closingTime.toString())
            .send({
                from: adminWallet,
            });
    });

    it("should revert for whitelisted address calling buyBcubeUsingETH() before sale start time", async function () {
        await b3NewSaleContract.methods.addWhitelisted(accounts[3]).send({
            from: adminWallet,
        });
        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingETH().send({
                from: accounts[3],
                value: web3.utils.toWei("1", "ether"),
            }),
            "B3NewSale: not open"
        );
    });


    it("buys $BCUBE @ $0.6 calling buyBcubeUsingETH(), checking allocation", async function () {
        await timeMachine.advanceTimeAndBlock(2246400 + 10000);
        const account1 = accounts[3];
        const account2 = accounts[4];
        const account3 = accounts[5];
        const ethDollars = new BigNumber(2500); // 2.5kUSD
        const ethPrice = new BigNumber(await b3NewSaleContract.methods.fetchETHPrice().call());
        ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
        await b3NewSaleContract.methods.addWhitelisted(account2).send({
            from: adminWallet,
        });
        await b3NewSaleContract.methods.addWhitelisted(account3).send({
            from: adminWallet,
        });

        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account1,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account2,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000"),
        });
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account3,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000"),
        });

        const account2alloc = await b3NewSaleContract.methods.bcubeAllocationRegistry(account2).call();
        expect(
            new BigNumber(account2alloc.allocatedBCUBE).div(new BigNumber("1e16")).toFixed(0)
        ).to.equal("1500");
        expect(
            new BigNumber(account2alloc.dollarUnitsPayed).div(1e8).toFixed(0),
            ethDollars.toString()
        );
        const netSoldBcube = await b3NewSaleContract.methods.netSoldBcube().call();
        expect(
            new BigNumber(netSoldBcube).div(new BigNumber("1e16")).toFixed(0)
        ).to.equal("4500");
    });

    it("tests previous buy, checking team's _wallet()", async function () {
        const bal = await web3.eth.getBalance(teamWallet);
        privateRoundEth = 100 + ethToBuyBcube * 3;
        expect(new BigNumber(bal).div(new BigNumber("1e18")).toFixed(0)).to.equal(
            privateRoundEth.toFixed(0)
        );
    });

    it("buys $BCUBE @ $0.6 calling buyBcubeUsingUSDT(), checking allocation", async function () {
        const account1 = accounts[6];
        const account2 = accounts[7];
        const account3 = accounts[8];

        await b3NewSaleContract.methods.addWhitelisted(account1).send({
            from: adminWallet,
        });
        await b3NewSaleContract.methods.addWhitelisted(account2).send({
            from: adminWallet,
        });
        await b3NewSaleContract.methods.addWhitelisted(account3).send({
            from: adminWallet,
        });

        const usdtPrice = new BigNumber(await b3NewSaleContract.methods.fetchUSDTPrice().call());
        usdtAmtToBuyBcube = new BigNumber('2499').times(new BigNumber("1e8")).div(usdtPrice);

        for (const account of [account1, account2, account3]) {
            const amount = usdtAmtToBuyBcube.times(new BigNumber("1e6"));
            await usdtContract.methods.approve(b3NewSale.address, amount.toFixed(0)).send({
                from: account,
            });
            await usdtContract.methods.transfer(account, amount.toFixed(0)).send({
                from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
            });
        };

        for (const account of [account1, account2, account3]) {
            await b3NewSaleContract.methods.buyBcubeUsingUSDT(usdtAmtToBuyBcube.times(new BigNumber('1e6')).toFixed(0)).send({
                from: account,
                gasLimit: new BigNumber("1000000"),
            });
        };

        const account2alloc = await b3NewSaleContract.methods.bcubeAllocationRegistry(account2).call();
        expect(
            new BigNumber(account2alloc.allocatedBCUBE).div(new BigNumber("1e16")).toFixed(0)
        ).to.equal("1499");
        expect(
            new BigNumber(account2alloc.dollarUnitsPayed).div(1e9).toFixed(0),
            '2499'
        );

        const netSoldBcube = await b3NewSaleContract.methods.netSoldBcube().call();
        expect(
            new BigNumber(netSoldBcube).div(new BigNumber("1e16")).toFixed(0)
        ).to.equal(new BigNumber('8998').toFixed(0));
    });

    it("tests previous buy, checking team's _wallet()", async function () {
        const bal = await usdtContract.methods.balanceOf(teamWallet).call();
        privateRoundUsdt = usdtAmtToBuyBcube.times(new BigNumber('1e6')).times(3);
        expect((bal / 1000000).toFixed(3)).to.equal(
            (privateRoundUsdt / 1000000).toFixed(3)
        );
    });

    it("test global limits", async function () {
        const currentTimestamp = (await web3.eth.getBlock('latest')).timestamp;
        const openingTime = currentTimestamp + 2246400;
        closingTime = openingTime + 6912000;
        const b3NewSale = await B3NewSale.new(
            openingTime,
            closingTime,
            "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
            "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            teamWallet
        );
        await timeMachine.advanceTimeAndBlock(2246400 + 10000);

        const b3NewSaleContract = new web3.eth.Contract(CONSTANTS.B3NS_ABI, b3NewSale.address);

        const account1 = accounts[3];
        const account2 = accounts[4];
        const account3 = accounts[5];

        await b3NewSaleContract.methods.setAdmin(adminWallet).send({
            from: deployerWallet,
        });

        await b3NewSaleContract.methods.addWhitelisted(account1).send({
            from: adminWallet,
        });
        await b3NewSaleContract.methods.addWhitelisted(account2).send({
            from: adminWallet,
        });
        await b3NewSaleContract.methods.addWhitelisted(account3).send({
            from: adminWallet,
        });

        await usdtContract.methods.approve(b3NewSale.address, '1000000000000').send({
            from: account1,
        });
        await usdtContract.methods.transfer(account1, '1000000000000').send({
            from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
        });

        await usdtContract.methods.approve(b3NewSale.address, '1000000000000').send({
            from: account2,
        });
        await usdtContract.methods.transfer(account2, '1000000000000').send({
            from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
        });

        await usdtContract.methods.approve(b3NewSale.address, '1000000000000').send({
            from: account3,
        });
        await usdtContract.methods.transfer(account3, '1000000000000').send({
            from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
        });

        const ethPrice = new BigNumber(await b3NewSaleContract.methods.fetchETHPrice().call());

        // ETH bellow $500 should be rejected
        let ethDollars = new BigNumber(100);
        ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();

        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingETH().send({
                from: account1,
                value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Min contrbn $500 not reached."
        );

        // USDT bellow $500 should be rejected
        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingUSDT('400000000').send({
                from: account1,
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Min contrbn $500 not reached."
        );

        // ETH above $2.5k should be rejected
        ethDollars = new BigNumber(3100);
        ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();

        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingETH().send({
                from: account1,
                value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Exceeds max contrbn $2500 limit"
        );

        // USDT above $2.5k should be rejected
        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingUSDT('51000000000').send({
                from: account1,
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Exceeds max contrbn $2500 limit"
        );

        // Multiple ETH invests should not exceed $10k
        ethDollars = new BigNumber(2500);
        ethToBuyBcube = ethDollars.times(1e8).div(ethPrice).toNumber();
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account1,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account1,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account1,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingETH().send({
            from: account1,
            value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
            gasLimit: new BigNumber("1000000")
        });

        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingETH().send({
                from: account1,
                value: web3.utils.toWei(ethToBuyBcube.toString(), "ether"),
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Exceeds total max contribn $10000"
        );

        // Multiple USDT invests should not exceed $10k
        await b3NewSaleContract.methods.buyBcubeUsingUSDT('2500000000').send({
            from: account2,
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingUSDT('2500000000').send({
            from: account2,
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingUSDT('2500000000').send({
            from: account2,
            gasLimit: new BigNumber("1000000")
        });
        await b3NewSaleContract.methods.buyBcubeUsingUSDT('2500000000').send({
            from: account2,
            gasLimit: new BigNumber("1000000")
        });

        await truffleAssert.reverts(
            b3NewSaleContract.methods.buyBcubeUsingUSDT('2500000000').send({
                from: account2,
                gasLimit: new BigNumber("1000000")
            }),
            "B3NewSale: Exceeds total max contribn $10000"
        );
    });
});