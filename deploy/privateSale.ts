import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TAGS } from "../utils/constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers, network } = hre;

  if (!network.tags.local) {
    return;
  }

  const { deploy, get } = deployments;
  const { deployer, usdc, team, ethUsd, usdcUsd } = await getNamedAccounts();

  const blockNumber = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNumber);
  const openingTime = currentBlock.timestamp + 1;
  const closingTime = openingTime + 3 * 30 * 24 * 60 * 60; // approx. 3 months later

  const bCubeToken = await get("BCUBEToken");

  await deploy("BCUBEPrivateSale", {
    from: deployer,
    log: true,
    args: [
      team,
      bCubeToken.address,
      openingTime,
      closingTime,
      ethUsd,
      usdcUsd,
      usdc,
    ],
  });
};
export default func;
func.tags = [TAGS.BCUBE_PRIVATE_SALE];
func.dependencies = [TAGS.BCUBE_TOKEN];
