const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const Staking = artifacts.require("Staking");
const truffleAssert = require("truffle-assertions");
const BigNumber = require("bignumber.js");
const timeMachine = require("ganache-time-traveler");

describe("Staking tests", async function () {
  this.timeout(3600000);
  before(async function () {
    accounts = await web3.eth.getAccounts();
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "0",
      "50000000000000000000000000"
    );
    stakingDeployed = await Staking.new(bcubeDeployed.address);
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.STAKING_ADDRESS = stakingDeployed.address;
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    staking = new web3.eth.Contract(
      CONSTANTS.STAKING_ABI,
      CONSTANTS.STAKING_ADDRESS
    );
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await bcube.methods.mint(accounts[0], "50000000000000000000000000").send({
      from: accounts[0],
    });
    console.log("[0]", await bcube.methods.balanceOf(accounts[0]).call());
  });

  it("allows accounts[1] to stake 5555 BCUBE", async function () {
    await bcube.methods.transfer(accounts[1], "6000000000000000000000").send({
      from: accounts[0],
    });
    await bcube.methods
      .approve(CONSTANTS.STAKING_ADDRESS, "6000000000000000000000")
      .send({
        from: accounts[1],
      });
    await staking.methods.stake("5555000000000000000000").send({
      from: accounts[1],
    });
    bal = await bcube.methods.balanceOf(CONSTANTS.STAKING_ADDRESS).call();
    expect(bal).to.equal("5555000000000000000000");
  });

  it("checks if accounts[1]'s stake is registered", async function () {
    bal = await staking.methods.bcubeStakeRegistry(accounts[1]).call();
    expect(bal).to.equal("5555000000000000000000");
  });

  it("reverts for staking 0 BCUBE", async function () {
    await truffleAssert.reverts(
      staking.methods.stake("0").send({
        from: accounts[1],
      }),
      "Staking non-positive BCUBE"
    );
  });

  it("reverts for unstaking 0 BCUBE", async function () {
    await truffleAssert.reverts(
      staking.methods.unstake("0").send({
        from: accounts[1],
      }),
      "Unstaking non-positive BCUBE"
    );
  });

  it("reverts for unstaking by non-staker", async function () {
    await truffleAssert.reverts(
      staking.methods.unstake("5555000000000000000000").send({
        from: accounts[2],
      }),
      "Insufficient staked bcube"
    );
  });

  it("reverts for unstaking more than staked BCUBE", async function () {
    await truffleAssert.reverts(
      staking.methods.unstake("5555000000000000000001").send({
        from: accounts[1],
      }),
      "Insufficient staked bcube"
    );
  });

  it("checks if topped-up staked is added correctly", async function () {
    await staking.methods.stake("5000000000000000000").send({
      from: accounts[1],
    });
    bal = await staking.methods.bcubeStakeRegistry(accounts[1]).call();
    expect(bal).to.equal("5560000000000000000000");
  });

  it("checks if partial unstake is subtracted correctly", async function () {
    await staking.methods.unstake("5000000000000000000").send({
      from: accounts[1],
    });
    bal = await staking.methods.bcubeStakeRegistry(accounts[1]).call();
    expect(bal).to.equal("5555000000000000000000");
  });

  it("allows accounts[1] to unstake 5555 BCUBE", async function () {
    await staking.methods.unstake("5555000000000000000000").send({
      from: accounts[1],
    });
    bal = await staking.methods.bcubeStakeRegistry(accounts[1]).call();
    expect(bal).to.equal("0");
  });
});
