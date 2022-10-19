import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TAGS } from "../utils/constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("BCUBEToken", {
    from: deployer,
    log: true,
    args: ["b-cube.ai Token", "BCUBE", 18, 0, "50000000000000000000000000"],
  });
};
export default func;
func.tags = [TAGS.BCUBE_TOKEN];
