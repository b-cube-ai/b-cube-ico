const { expect } = require("chai");
const CONSTANTS = require("../constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const BCUBEToken = artifacts.require("BCUBEToken");
const Treasury = artifacts.require("Treasury");
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
    treasury;
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
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "0",
      "50000000000000000000000000"
    );
    treasuryDeployed = await Treasury.new(
      accounts[1],
      bcubeDeployed.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      closingTime + 6912000
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.TREASURY_ADDRESS = treasuryDeployed.address;
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
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

  it("reverts for non-whitelistAdmin calling setListingTime()", async function () {
    await truffleAssert.reverts(
      treasury.methods.setListingTime(closingTime + 691200 + 86400).send({
        from: accounts[1],
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("increases listingTime by 1 day", async function () {
    await treasury.methods.setListingTime(closingTime + 691200 + 86400).send({
      from: accounts[0],
    });
    newLT = await treasury.methods.listingTime().call();
    expect(newLT).to.equal((closingTime + 691200 + 86400).toString());
  });

  it("reverts for advisor calling advisorShareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[2],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for team calling teamShareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for team calling devFundShareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[1],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for team calling reservesShareWithdraw() before listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.reservesShareWithdraw("7000000000000000000000000").send({
        from: accounts[1],
      }),
      "Only callable after listing"
    );
  });

  it("reverts for non-team calling reservesShareWithdraw() after listing", async function () {
    // listingTime arrives: 180 days ahead of openingTime + 1000
    // then 1 more day ahead due to above increase listingTime
    await timeMachine.advanceTimeAndBlock(twentySixWeeks + 86400);
    await truffleAssert.reverts(
      treasury.methods.reservesShareWithdraw("7000000000000000000000000").send({
        from: accounts[5],
      }),
      "Only team can call"
    );
  });

  it("reverts for deployer calling setListingTime() after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.setListingTime(closingTime + 691200 + 96400).send({
        from: accounts[0],
      }),
      "listingTime unchangable after listing"
    );
  });

  it("disallows team to withdraw >7m BCUBE reserves", async function () {
    await truffleAssert.reverts(
      treasury.methods.reservesShareWithdraw("7000000000000000000000001").send({
        from: accounts[1],
      }),
      "Out of reserves share"
    );
  });

  it("allows team to withdraw reserves share i.e. 7m BCUBE", async function () {
    await treasury.methods
      .reservesShareWithdraw("7000000000000000000000000")
      .send({
        from: accounts[1],
      });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("7000000000000000000000000");
  });

  it("reverts for non-team calling communityShareWithdraw()", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .communityShareWithdraw("2500000000000000000000000")
        .send({
          from: accounts[6],
        }),
      "Only team can call"
    );
  });

  it("disallows team to withdraw >2.5m BCUBE community share", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .communityShareWithdraw("2500000000000000000000001")
        .send({
          from: accounts[1],
        }),
      "Out of community share"
    );
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

  it("reverts for non-team calling bountyShareWithdraw()", async function () {
    await truffleAssert.reverts(
      treasury.methods.bountyShareWithdraw("500000000000000000000000").send({
        from: accounts[3],
      }),
      "Only team can call"
    );
  });

  it("disallows team to withdraw >0.5m BCUBE bounty share", async function () {
    await truffleAssert.reverts(
      treasury.methods.bountyShareWithdraw("500000000000000000000001").send({
        from: accounts[1],
      }),
      "Out of bounty share"
    );
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

  it("reverts for non-team calling publicSaleShareWithdraw()", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .publicSaleShareWithdraw("25000000000000000000000000")
        .send({
          from: accounts[7],
        }),
      "Only team can call"
    );
  });

  it("disallows team to withdraw >25m BCUBE publicSale share", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .publicSaleShareWithdraw("25000000000000000000000001")
        .send({
          from: accounts[1],
        }),
      "Out of publicSale share"
    );
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

  it("reverts for non-whitelistAdmin calling addAdvisor()", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .addAdvisor(accounts[2], "1000000000000000000000000")
        .send({
          from: accounts[8],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for deployer calling addAdvisor() for address(0)", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .addAdvisor(
          "0x0000000000000000000000000000000000000000",
          "1000000000000000000000000"
        )
        .send({
          from: accounts[0],
        }),
      "Invalid advisor address"
    );
  });

  it("allows deployer to add 3 advisors", async function () {
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

  it("reverts for non-whitelistAdmin calling setAdvisorAllowance()", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .setAdvisorAllowance(accounts[3], "1000000000000000000000000")
        .send({
          from: accounts[4],
        }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for deployer calling setAdvisorAllowance() for non-advisor", async function () {
    await truffleAssert.reverts(
      treasury.methods
        .setAdvisorAllowance(accounts[9], "1000000000000000000000000")
        .send({
          from: accounts[0],
        }),
      "Invalid advisor"
    );
  });

  it("allows deployer to set allowance for an advisor", async function () {
    await treasury.methods
      .setAdvisorAllowance(accounts[3], "1000000000000000000000000")
      .send({
        from: accounts[0],
      });
    wise = await treasury.methods.advisors(accounts[3]).call();
    expect(wise.increaseInAllowance).to.equal("250000000000000000000000");
  });

  it("reverts for non-whitelistAdmin calling removeAdvisor()", async function () {
    await truffleAssert.reverts(
      treasury.methods.removeAdvisor(accounts[4]).send({
        from: accounts[3],
      }),
      "WhitelistAdminRole: caller does not have the WhitelistAdmin role"
    );
  });

  it("reverts for deployer calling removeAdvisor() for non-advisor", async function () {
    await truffleAssert.reverts(
      treasury.methods.removeAdvisor(accounts[7]).send({
        from: accounts[0],
      }),
      "Invalid advisor"
    );
  });

  it("allows deployer to remove an advisor", async function () {
    await treasury.methods.removeAdvisor(accounts[4]).send({
      from: accounts[0],
    });
    wise = await treasury.methods.advisors(accounts[4]).call();
    expect(wise.increaseInAllowance).to.equal("0");
  });

  it("disallows team to withdraw 12.5% team share in [0, 26) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 25% devFund share in [0, 26) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
  });

  it("disallows advisor to withdraw 25% share in [0, 26) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("reverts for non-team calling teamShareWithdraw() after listing", async function () {
    // listingTime + 26 weeks
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[2],
      }),
      "Only team can call"
    );
  });

  it("disallows team to withdraw >12.5% team share after 26 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("725000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("allows team to withdraw 12.5% team share after 26 weeks", async function () {
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("35625000000000000000000000");
  });

  it("reverts for non-team calling devFundShareWithdraw()", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[0],
      }),
      "Only team can call"
    );
  });

  it("disallows team to withdraw >25% devFund after 26 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("2875000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
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

  it("reverts for non-advisor calling advisorShareWithdraw() after 26 weeks of listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[6],
      }),
      "!advisor"
    );
  });

  it("disallows advisor to withdraw >25% share after 26 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("350000000000000000000000").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
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

  it("disallows team to withdraw 12.5% team share in [26, 52) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 25% devFund share in [26, 52) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
  });

  it("disallows advisor to withdraw 25% share in [26, 52) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("allows team to withdraw 12.5% team share after 52 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("38125000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 52 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
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

  it("disallows team to withdraw >25% devFund after 52 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
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

  it("disallows advisor to withdraw >25% share after 52 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("1").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [52, 78) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 25% devFund share in [52, 78) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
  });

  it("disallows advisor to withdraw 25% share in [52, 78) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("allows team to withdraw 12.5% team share after 78 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("40625000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 78 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
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

  it("disallows team to withdraw >25% devFund after 78 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
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

  it("disallows advisor to withdraw >25% share after 78 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("1").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [78, 104) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 25% devFund share in [78, 104) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1875000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
  });

  it("disallows advisor to withdraw 25% share in [78, 104) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("250000000000000000000000").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("allows team to withdraw 12.5% team share after 104 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("43125000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 104 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
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

  it("disallows team to withdraw >25% devFund after 104 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.devFundShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of dev fund share"
    );
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

  it("disallows advisor to withdraw >25% share after 52 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.advisorShareWithdraw("1").send({
        from: accounts[2],
      }),
      "Out of advisor share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [104, 130) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("allows team to withdraw 12.5% team share after 130 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("45625000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 130 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [130, 156) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("allows team to withdraw 12.5% team share after 156 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("46250000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 156 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [156, 182) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("allows team to withdraw 12.5% team share after 182 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("46875000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 182 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("disallows team to withdraw 12.5% team share in [182, 208) weeks after listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("625000000000000000000000").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });

  it("allows team to withdraw 12.5% team share after 208 weeks", async function () {
    await timeMachine.advanceTimeAndBlock(twentySixWeeks);
    await treasury.methods.teamShareWithdraw("625000000000000000000000").send({
      from: accounts[1],
    });
    teamBal = await bcube.methods.balanceOf(accounts[1]).call();
    expect(teamBal).to.equal("47500000000000000000000000");
  });

  it("disallows team to withdraw >12.5% team share after 208 weeks", async function () {
    await truffleAssert.reverts(
      treasury.methods.teamShareWithdraw("1").send({
        from: accounts[1],
      }),
      "Out of team share"
    );
  });
});

describe("Treasury tests with private sale", async function () {
  this.timeout(3600000);
  let snapshot,
    snapshotId,
    openingTime,
    closingTime,
    listingTime,
    currentTimestamp,
    usdt,
    treasury;
  let eighteenZeroes = new BigNumber("1000000000000000000");
  before(async function () {
    snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
    currentTimestamp = Math.floor(Date.now() / 1000);
    // 26 days from today
    openingTime = currentTimestamp + 2246400;
    closingTime = openingTime + 6912000;
    listingTime = closingTime + 691200;
    sixMonths = 15552000;
    thirtyDays = 2592000;
    accounts = await web3.eth.getAccounts();
    bcubeDeployed = await BCUBEToken.new(
      "b-cube.ai Token",
      "BCUBE",
      "18",
      "0",
      "50000000000000000000000000"
    );
    treasuryDeployed = await Treasury.new(
      accounts[1],
      bcubeDeployed.address,
      openingTime,
      closingTime,
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      closingTime + 6912000
    );
    CONSTANTS.TOKEN_ADDRESS = bcubeDeployed.address;
    CONSTANTS.TREASURY_ADDRESS = treasuryDeployed.address;
    bcube = new web3.eth.Contract(CONSTANTS.TOKEN_ABI, CONSTANTS.TOKEN_ADDRESS);
    treasury = new web3.eth.Contract(
      CONSTANTS.TREASURY_ABI,
      CONSTANTS.TREASURY_ADDRESS
    );
    usdt = new web3.eth.Contract(
      CONSTANTS.TETHER_ABI,
      CONSTANTS.TETHER_ADDRESS
    );
    await usdt.methods.issue("10000000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 5; i <= 9; i++) {
      await treasury.methods.addWhitelisted(accounts[i]).send({
        from: accounts[0],
      });
    }
    await timeMachine.advanceTimeAndBlock(2246400 + 10000);
    ethPrice = new BigNumber(
      await treasury.methods.fetchETHPrice().call()
    ).toNumber();
    usdtPrice = new BigNumber(await treasury.methods.fetchUSDTPrice().call());
    await usdt.methods
      .approve(CONSTANTS.TREASURY_ADDRESS, "1000000000000")
      .send({
        from: accounts[8],
      });
    await usdt.methods.transfer(accounts[8], "31000000000").send({
      from: "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828",
    });
    for (let i = 5; i <= 7; i++) {
      await treasury.methods.buyBcubeUsingETH().send({
        from: accounts[i],
        value: web3.utils.toWei((2500000000000 / ethPrice).toString(), "ether"),
      });
    }
    finalUsdtAmt = Math.floor((2000000000000 / usdtPrice) * 1000000);
    await treasury.methods.buyBcubeUsingUSDT(finalUsdtAmt.toString()).send({
      from: accounts[8],
      gasLimit: 6000000,
    });
    await treasury.methods.buyBcubeUsingETH().send({
      from: accounts[9],
      value: web3.utils.toWei((1000000000000 / ethPrice).toString(), "ether"),
    });
    await bcube.methods
      .mint(CONSTANTS.TREASURY_ADDRESS, "50000000000000000000000000")
      .send({
        from: accounts[0],
      });
    bal5 = (await treasury.methods.bcubeAllocationRegistry(accounts[5]).call())
      .allocatedBcube;
    bal6 = (await treasury.methods.bcubeAllocationRegistry(accounts[6]).call())
      .allocatedBcube;
    bal7 = (await treasury.methods.bcubeAllocationRegistry(accounts[7]).call())
      .allocatedBcube;
    bal8 = (await treasury.methods.bcubeAllocationRegistry(accounts[8]).call())
      .allocatedBcube;
    bal9 = (await treasury.methods.bcubeAllocationRegistry(accounts[9]).call())
      .allocatedBcube;
    for (let i = 5; i < 10; i++) {
      console.log(
        "[" + i + "]",
        (await treasury.methods.bcubeAllocationRegistry(accounts[i]).call())
          .allocatedBcube
      );
    }
  });

  after(async function () {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it("reverts for 5 calling privateSaleShareWithdraw() before listing", async function () {
    stringBal5 = new BigNumber(bal5).div(4).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal5).send({
        from: accounts[5],
      }),
      "Only callable after listing"
    );
  });

  it("disallows 5 to withdraw 25% in [0, 30) days after listing", async function () {
    // listingTime arrives
    await timeMachine.advanceTimeAndBlock(sixMonths);
    stringBal5 = new BigNumber(bal5).div(4).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal5).send({
        from: accounts[5],
      }),
      "Insufficient allowance"
    );
  });

  it("allows 5 to withdraw 25% after 30 days of listing", async function () {
    // 30 days pass
    await timeMachine.advanceTimeAndBlock(thirtyDays);
    stringBal5 = new BigNumber(bal5).div(4).toFixed();
    await treasury.methods.privateSaleShareWithdraw(stringBal5).send({
      from: accounts[5],
    });
    bal = await bcube.methods.balanceOf(accounts[5]).call();
    expect(bal).to.equal(stringBal5);
  });

  it("disallows 5 to withdraw >25% after 30 days of listing", async function () {
    stringBal5 = new BigNumber(bal5).div(4).plus(1).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal5).send({
        from: accounts[5],
      }),
      "Insufficient allowance"
    );
  });

  it("disallows non-participant to withdraw 25% after 30 days of listing", async function () {
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw("1000000000000000000").send({
        from: accounts[12],
      }),
      "!privateSaleParticipant || 0 BCUBE allocated"
    );
  });

  it("disallows 6 to withdraw 50% in [30, 60) days after listing", async function () {
    stringBal6 = new BigNumber(bal6).div(2).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal6).send({
        from: accounts[6],
      }),
      "Insufficient allowance"
    );
  });

  it("allows 6 to withdraw 50% after 60 days of listing", async function () {
    await timeMachine.advanceTimeAndBlock(thirtyDays);
    stringBal6 = new BigNumber(bal6).div(2).toFixed();
    await treasury.methods.privateSaleShareWithdraw(stringBal6).send({
      from: accounts[6],
    });
    bal = await bcube.methods.balanceOf(accounts[6]).call();
    expect(bal).to.equal(stringBal6);
  });

  it("disallows 6 to withdraw >50% after 60 days of listing", async function () {
    stringBal6 = new BigNumber(bal6).div(2).plus(1).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal6).send({
        from: accounts[6],
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 8 to withdraw 75% in [60, 90) days after listing", async function () {
    stringBal8 = new BigNumber(bal8).times(3).div(4).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal8).send({
        from: accounts[8],
      }),
      "Insufficient allowance"
    );
  });

  it("allows 8 (USDT buyer) to withdraw 75% after 90 days of listing", async function () {
    await timeMachine.advanceTimeAndBlock(thirtyDays);
    stringBal8 = new BigNumber(bal8).times(3).div(4).toFixed();
    await treasury.methods.privateSaleShareWithdraw(stringBal8).send({
      from: accounts[8],
    });
    bal = await bcube.methods.balanceOf(accounts[8]).call();
    expect(bal).to.equal(stringBal8);
  });

  it("disallows 8 to withdraw >75% after 90 days of listing", async function () {
    stringBal8 = new BigNumber(bal8).times(3).div(4).plus(1).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal8).send({
        from: accounts[8],
      }),
      "Insufficient allowance"
    );
  });

  it("disallows 9 to withdraw 100% in [90, 120) days after listing", async function () {
    stringBal9 = new BigNumber(bal9).minus(4).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal9).send({
        from: accounts[9],
      }),
      "Insufficient allowance"
    );
  });

  // Max solidity approx. loss on x/4, x*4 = 3.6 mBCUBE, hence withdrawing 4 mBCUBEs less, as
  // safe test for 100% withdrawal
  it("allows 9 (boundary ETH buyer) to withdraw 100% after 120 days of listing", async function () {
    await timeMachine.advanceTimeAndBlock(thirtyDays);
    stringBal9 = new BigNumber(bal9).minus(4).toFixed();
    await treasury.methods.privateSaleShareWithdraw(stringBal9).send({
      from: accounts[9],
    });
    bal = await bcube.methods.balanceOf(accounts[9]).call();
    expect(bal).to.equal(stringBal9);
  });

  it("disallows 9 to withdraw >100% after 120 days of listing", async function () {
    stringBal9 = new BigNumber(bal9).minus(4).plus(5).toFixed();
    await truffleAssert.reverts(
      treasury.methods.privateSaleShareWithdraw(stringBal9).send({
        from: accounts[9],
      }),
      "Insufficient allowance"
    );
  });
});
