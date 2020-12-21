const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
// const moment = require("moment");
const truffleAssert = require("truffle-assertions");

describe("BCUBE token properties/functions", function () {
  this.timeout(3600000);
  let signal;
  let result, b_cube;
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  before(async function () {
    accounts = await web3.eth.getAccounts();
    bcubeDeployed = await BCUBEToken.new("1000000000000000000000");
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    // CONSTANTS.BCUBE_ADDRESS = "0x0fef71ba53077ee0a67424fa7560c84a4bb618af";
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    // tether = new web3.eth.Contract(
    //   CONSTANTS.TETHER_ABI,
    //   CONSTANTS.TETHER_ADDRESS
    // );
    // sends 1 ETH to tether owner and BCube contract
    // await web3.eth.sendTransaction({
    //   from: accounts[0],
    //   to: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    //   value: web3.utils.toWei("1", "ether"),
    // });
    // await web3.eth.sendTransaction({
    //   from: accounts[0],
    //   to: CONSTANTS.BCUBE_ADDRESS,
    //   value: web3.utils.toWei("5", "ether"),
    // });
    // issues 1m USDT to tether owner
    // await tether.methods.issue("1000000000000").send({
    //   from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    // });
    // transfers 1000 USDT to top 5 ganache accounts and these accounts approve 100 USDT to BCube contract
    // asyncForEach = async (array, callback) => {
    //   for (let index = 0; index < array.length; index++) {
    //     await callback(array[index], index, array);
    //   }
    // };
    // await asyncForEach(accounts.slice(0, 3), async (account) => {
    //   await tether.methods.transfer(account, "1000000000").send({
    //     from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    //   });
    //   await tether.methods.approve(CONSTANTS.BCUBE_ADDRESS, "100000000").send({
    //     from: account,
    //   });
    // });
  });

  it("should check token's name", async function () {
    naam = await bcube.methods.name().call();
    expect(naam).to.equal("b-cube.ai Token");
  });

  it("should check token's symbol", async function () {
    symbol = await bcube.methods.symbol().call();
    expect(symbol).to.equal("BCUBE");
  });

  it("should check token's decimals", async function () {
    decimals = await bcube.methods.decimals().call();
    expect(decimals).to.equal("18");
  });

  it("should check token's intial totalSupply", async function () {
    totalSupply = await bcube.methods.totalSupply().call();
    expect(totalSupply).to.equal("1000000000000000000000");
  });

  it("should check balance of deployer", async function () {
    balance = await bcube.methods.balanceOf(accounts[0]).call();
    expect(balance).to.equal("1000000000000000000000");
  });

  it("should check approve() of 500 BCUBE using allowance()", async function () {
    await bcube.methods
      .approve(CONSTANTS.TOKEN_ADDRESS, "500000000000000000000")
      .send({
        from: accounts[0],
      });
    allowance = await bcube.methods
      .allowance(accounts[0], CONSTANTS.TOKEN_ADDRESS)
      .call();
    expect(allowance).to.equal("500000000000000000000");
  });

  it("should check transfer() of 100 BCUBE as increase in recipient", async function () {
    await bcube.methods.transfer(accounts[1], "100000000000000000000").send({
      from: accounts[0],
    });
    balance = await bcube.methods.balanceOf(accounts[1]).call();
    expect(balance).to.equal("100000000000000000000");
  });

  it("should check transfer() of 100 BCUBE as decrease in sender", async function () {
    balance = await bcube.methods.balanceOf(accounts[0]).call();
    expect(balance).to.equal("900000000000000000000");
  });

  it("should check transferFrom() of 200 BCUBE from accounts[0] to accounts[2] via accounts[1], as +200 BCUBE in accounts[2]", async function () {
    await bcube.methods.approve(accounts[1], "200000000000000000000").send({
      from: accounts[0],
    });
    await bcube.methods
      .transferFrom(accounts[0], accounts[2], "200000000000000000000")
      .send({
        from: accounts[1],
      });
    balance = await bcube.methods.balanceOf(accounts[2]).call();
    expect(balance).to.equal("200000000000000000000");
  });

  it("should check transferFrom() of 200 BCUBE from accounts[0] to accounts[2] via accounts[1], as -200 BCUBE in accounts[0]", async function () {
    balance = await bcube.methods.balanceOf(accounts[0]).call();
    expect(balance).to.equal("700000000000000000000");
  });

  it("should check increaseAllowance() by 300 BCUBE from 500, for token contract", async function () {
    await bcube.methods
      .increaseAllowance(CONSTANTS.TOKEN_ADDRESS, "300000000000000000000")
      .send({
        from: accounts[0],
      });
    allowance = await bcube.methods
      .allowance(accounts[0], CONSTANTS.TOKEN_ADDRESS)
      .call();
    expect(allowance).to.equal("800000000000000000000");
  });

  it("should check decreaseAllowance() by 200 BCUBE from 800, for token contract", async function () {
    await bcube.methods
      .decreaseAllowance(CONSTANTS.TOKEN_ADDRESS, "200000000000000000000")
      .send({
        from: accounts[0],
      });
    allowance = await bcube.methods
      .allowance(accounts[0], CONSTANTS.TOKEN_ADDRESS)
      .call();
    expect(allowance).to.equal("600000000000000000000");
  });

  it("should mint 100 BCUBE to accounts[3] and check its balance", async function () {
    await bcube.methods.mint(accounts[3], "100000000000000000000").send({
      from: accounts[0],
    });
    balance = await bcube.methods.balanceOf(accounts[3]).call();
    expect(balance).to.equal("100000000000000000000");
  });

  it("should check increase in totalSupply after mint()", async function () {
    totalSupply = await bcube.methods.totalSupply().call();
    expect(totalSupply).to.equal("1100000000000000000000");
  });

  it("should burn 200 BCUBE from accounts[0] and check its balance", async function () {
    await bcube.methods.burn("200000000000000000000").send({
      from: accounts[0],
    });
    balance = await bcube.methods.balanceOf(accounts[0]).call();
    expect(balance).to.equal("500000000000000000000");
  });

  it("should check decrease in totalSupply after burn()", async function () {
    totalSupply = await bcube.methods.totalSupply().call();
    expect(totalSupply).to.equal("900000000000000000000");
  });

  it("should check cap() to be 50m", async function () {
    cap = await bcube.methods.cap().call();
    expect(cap).to.equal("50000000000000000000000000");
  });

  it("should revert when trying to mint more than 50m BCUBE", async function () {
    await truffleAssert.reverts(
      bcube.methods.mint(accounts[0], "51000000000000000000000000").send({
        from: accounts[0],
      }),
      "ERC20Capped: cap exceeded"
    );
  });

  // it("should fail fetching 1000 USDT from accounts[2], to BCube contract due to exceeding deposit hard cap", async function () {
  //   await truffleAssert.reverts(
  //     bCube.methods
  //       .fetchTokens(
  //         CONSTANTS.TETHER_ADDRESS,
  //         [accounts[0], accounts[1], accounts[2]],
  //         ["1000000000", "1000000000", "1000000000"]
  //       )
  //       .send({
  //         from: accounts[0],
  //         gasLimit: 6000000,
  //       }),
  //     "Hard cap limit exceeded!"
  //   );
  // });
});
