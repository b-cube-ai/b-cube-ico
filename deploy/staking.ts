import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TAGS } from "../utils/constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const bCubeToken = await get("BCUBEToken");

  await deploy("Staking", {
    from: deployer,
    log: true,
    args: [bCubeToken.address],
  });
};
export default func;
func.tags = [TAGS.STAKING];
func.dependencies = [TAGS.BCUBE_TOKEN];
