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

describe("Treasury tests", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    currentTimestamp,
    usdt,
    treasury;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    accounts = await web3.eth.getAccounts();
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    bcubePS = new web3.eth.Contract(CONSTANTS.BPS_ABI, CONSTANTS.BPS_ADDRESS);
    treasury = new web3.eth.Contract(
      CONSTANTS.TREASURY_ABI,
      CONSTANTS.TREASURY_ADDRESS
    );
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await bcube.methods
      .mint(CONSTANTS.TREASURY_ADDRESS, "50000000000000000000000000")
      .send({
        from: accounts[0],
      });
    console.log(
      "TREASURY_BCUBE",
      await bcube.methods.balanceOf(CONSTANTS.TREASURY_ADDRESS).call()
    );
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("increases listingTime by 10 days", async function () {
    await treasury.methods.setListingTime(closingTime + 691200 + 86400).send({
      from: accounts[0],
    });
    newLT = await treasury.methods.listingTime().call();
    expect(newLT).to.equal((closingTime + 691200 + 86400).toString());
  });

  it("allows team to withdraw reserves share i.e. 7m BCUBE", async function () {
    // 220 days ahead of openingTime + 1000
    // then 10 more days ahead due to above increase listingTime
    await timeMachine.advanceTimeAndBlock(19872000);
    await treasury.methods
      .reservesShareWithdraw("7000000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("7000000000000000000000000");
  });

  it("allows team to withdraw community share i.e. 2.5m BCUBE", async function () {
    await treasury.methods
      .communityShareWithdraw("2500000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("9500000000000000000000000");
  });

  it("allows team to withdraw bounty share i.e. 0.5m BCUBE", async function () {
    await treasury.methods
      .bountyShareWithdraw("500000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("10000000000000000000000000");
  });

  it("allows team to withdraw public sale share i.e. 25m BCUBE (since no private sale conducted for this test)", async function () {
    await treasury.methods
      .publicSaleShareWithdraw("25000000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("35000000000000000000000000");
  });

  it("allows team to add 3 advisors", async function () {
    await treasury.methods
      .addAdvisor(accounts[2], "1000000000000000000000000")
      .send({
        from: accounts[0],
      });
    await treasury.methods
      .addAdvisor(accounts[3], "500000000000000000000000")
      .send({
        from: accounts[0],
      });
    await treasury.methods
      .addAdvisor(accounts[4], "500000000000000000000000")
      .send({
        from: accounts[0],
      });
    wise = await treasury.methods.advisors(accounts[2]).call();
    expect(wise.increaseInAllowance).to.equal("250000000000000000000000");
  });

  it("allows team to set allowance for an advisor", async function () {
    await treasury.methods
      .setAdvisorAllowance(accounts[3], "1000000000000000000000000")
      .send({
        from: accounts[0],
      });
    wise = await treasury.methods.advisors(accounts[3]).call();
    expect(wise.increaseInAllowance).to.equal("250000000000000000000000");
  });

  it("allows team to remove an advisor", async function () {
    await treasury.methods.removeAdvisor(accounts[4]).send({
      from: accounts[0],
    });
    wise = await treasury.methods.advisors(accounts[4]).call();
    expect(wise.increaseInAllowance).to.equal("0");
  });

  it("allows team to withdraw 12.5% team share after 26 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(15724800);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("35625000000000000000000000");
  });

  it("allows team to withdraw 25% devFund after 26 weeks", async function () {
    await treasury.methods
      .devFundShareWithdraw("1875000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("37500000000000000000000000");
  });

  it("allows advisor to withdraw 25% share after 26 weeks", async function () {
    await treasury.methods
      .advisorShareWithdraw("250000000000000000000000")
      .send({
        from: accounts[2],
      });
    bal = await bcube.methods.balanceOf(accounts[2]).call();
    expect(bal).to.equal("250000000000000000000000");
  });

  it("allows team to withdraw 12.5% team share after 52 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(15724800);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("38125000000000000000000000");
  });

  it("allows team to withdraw 25% devFund after 52 weeks", async function () {
    await treasury.methods
      .devFundShareWithdraw("1875000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("40000000000000000000000000");
  });

  it("allows advisor to withdraw 25% share after 52 weeks", async function () {
    await treasury.methods
      .advisorShareWithdraw("250000000000000000000000")
      .send({
        from: accounts[2],
      });
    bal = await bcube.methods.balanceOf(accounts[2]).call();
    expect(bal).to.equal("500000000000000000000000");
  });

  it("allows team to withdraw 12.5% team share after 78 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(15724800);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("40625000000000000000000000");
  });

  it("allows team to withdraw 25% devFund after 78 weeks", async function () {
    await treasury.methods
      .devFundShareWithdraw("1875000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("42500000000000000000000000");
  });

  it("allows advisor to withdraw 25% share after 78 weeks", async function () {
    await treasury.methods
      .advisorShareWithdraw("250000000000000000000000")
      .send({
        from: accounts[2],
      });
    bal = await bcube.methods.balanceOf(accounts[2]).call();
    expect(bal).to.equal("750000000000000000000000");
  });

  it("allows team to withdraw 12.5% team share after 104 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(15724800);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("43125000000000000000000000");
  });

  it("allows team to withdraw 25% devFund after 104 weeks", async function () {
    await treasury.methods
      .devFundShareWithdraw("1875000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("45000000000000000000000000");
  });

  it("allows advisor to withdraw 25% share after 104 weeks", async function () {
    await treasury.methods
      .advisorShareWithdraw("250000000000000000000000")
      .send({
        from: accounts[2],
      });
    bal = await bcube.methods.balanceOf(accounts[2]).call();
    expect(bal).to.equal("1000000000000000000000000");
  });
});
