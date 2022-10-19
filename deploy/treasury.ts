import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TAGS } from "../utils/constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, get } = deployments;
  const { deployer, usdc, team, ethUsd, usdcUsd } = await getNamedAccounts();

  const blockNumber = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(blockNumber);
  const openingTime = currentBlock.timestamp + 1;
  const closingTime = openingTime + 3 * 30 * 24 * 60 * 60; // approx. 3 months later
  const listingTime = closingTime + 6912000; // closingDate + 80j

  const bCubeToken = await get("BCUBEToken");

  await deploy("Treasury", {
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
      listingTime,
    ],
  });
};
export default func;
func.tags = [TAGS.TREASURY];
func.dependencies = [TAGS.BCUBE_TOKEN];
