const { expect } = require("chai");
const CONSTANTS = require("../engine-server/constants");
const Web3 = require("web3");
const BCube = artifacts.require("BCube");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const moment = require("moment");
const truffleAssert = require("truffle-assertions");

describe("Fetch tokens failing", function () {
  this.timeout(3600000);
  let signal;
  let result, b_cube;
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  before(async function () {
    accounts = await web3.eth.getAccounts();
    bCubeDeployed = await BCube.new("2000000000");
    CONSTANTS.BCUBE_ADDRESS = bCubeDeployed.address;
    // CONSTANTS.BCUBE_ADDRESS = "0x0fef71ba53077ee0a67424fa7560c84a4bb618af";
    bCube = new web3.eth.Contract(CONSTANTS.BCUBE_ABI, CONSTANTS.BCUBE_ADDRESS);
    tether = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    // sends 1 ETH to tether owner and BCube contract
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      value: web3.utils.toWei("1", "ether"),
    });
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: CONSTANTS.BCUBE_ADDRESS,
      value: web3.utils.toWei("5", "ether"),
    });
    // issues 1m USDT to tether owner
    await tether.methods.issue("1000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    // transfers 1000 USDT to top 5 ganache accounts and these accounts approve 100 USDT to BCube contract
    asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    };
    await asyncForEach(accounts.slice(0, 3), async (account) => {
      await tether.methods.transfer(account, "1000000000").send({
        from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
      });
      await tether.methods.approve(CONSTANTS.BCUBE_ADDRESS, "100000000").send({
        from: account,
      });
    });
  });

  it("should fail fetching 50 USDT from accounts[3], accounts[4] ganache accounts each, to BCube contract for 1st USDT<>ETH swap", async function () {
    let tx;
    bCube.methods
      .fetchTokens(
        CONSTANTS.TETHER_ADDRESS,
        [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]],
        ["50000000", "50000000", "50000000", "50000000", "50000000"]
      )
      .send({
        from: accounts[0],
        gasLimit: 6000000,
      })
      .then(tx);
    await sleep(2000);
    user5USDT =
      (await bCube.methods
        .userTokenRegistry(accounts[4], CONSTANTS.TETHER_ADDRESS)
        .call()) / 1000000;
    // expectEvent(tx, "TokensFetched");
    expect(user5USDT).to.equal(0);
  });

  it("should fail fetching 1000 USDT from accounts[2], to BCube contract due to exceeding deposit hard cap", async function () {
    await truffleAssert.reverts(
      bCube.methods
        .fetchTokens(
          CONSTANTS.TETHER_ADDRESS,
          [accounts[0], accounts[1], accounts[2]],
          ["1000000000", "1000000000", "1000000000"]
        )
        .send({
          from: accounts[0],
          gasLimit: 6000000,
        }),
      "Hard cap limit exceeded!"
    );
  });
});
