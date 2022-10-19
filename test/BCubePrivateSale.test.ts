import { getGoerliSdk } from "@dethcrypto/eth-sdk-client"; // we use Goerli forking for tests to avoid redeploying tokens
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from "hardhat";
import { BCUBEPrivateSale, BCUBEToken } from "../typechain-types";
import { TAGS } from "../utils/constants";
import { setupUser, setupUsers } from "./utils";

chai.use(solidity);
const { expect } = chai;

const setup = async () => {
  await deployments.fixture([TAGS.BCUBE_PRIVATE_SALE]);
  const sdk = getGoerliSdk(ethers.getDefaultProvider());
  const contracts = {
    BCUBEToken: (await ethers.getContract("BCUBEToken")) as BCUBEToken,
    BCUBEPrivateSale: (await ethers.getContract(
      "BCUBEPrivateSale"
    )) as BCUBEPrivateSale,
    ...sdk,
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  const { deployer } = await getNamedAccounts();
  return {
    ...contracts,
    users,
    deployer: await setupUser(deployer, contracts),
  };
};

describe("BCUBE Private Sale tests with boundaries bought in ETH", async function () {
  it("should revert when calling rate()", async function () {
    const { BCUBEPrivateSale } = await setup();
    await expect(BCUBEPrivateSale.rate()).to.be.revertedWith(
      "BCubePrivateSale: rate() called"
    );
  });

  it("should revert when calling buyTokens()", async function () {
    const { BCUBEPrivateSale } = await setup();
    await expect(BCUBEPrivateSale["buyTokens()"]()).to.be.revertedWith(
      "BCubePrivateSale: buyTokens() called"
    );
  });

  it("should revert when calling buyBcubeUsingETH() with non-whitelisted address", async function () {
    const { users } = await setup();
    await expect(
      users[2].BCUBEPrivateSale.buyBcubeUsingETH({
        value: ethers.utils.parseEther("1"),
      })
    ).to.be.revertedWith(
      "WhitelistedRole: caller does not have the Whitelisted role"
    );
  });
});
