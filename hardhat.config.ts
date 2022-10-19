import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { removeConsoleLog } from "hardhat-preprocessor";
import "hardhat-spdx-license-identifier";
import { HardhatUserConfig } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "solidity-coverage";
import "./tasks";
import { accounts, node_url } from "./utils/network";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.5.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    team: {
      rinkeby: "0x7EcCE010C9717ce4fa6Ad2a79994b04FCd0C56C9",
      goerli: "0xB8ca88bFE9520e52C034D5901177a9F9504495A4",
      default: 0,
    },
    ethUsd: {
      mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      goerli: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
      default: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    },
    usdcUsd: {
      mainnet: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      goerli: "0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7",
      default: "0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7",
    },
    usdc: {
      mainnet: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      goerli: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
      default: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
    },
  },
  networks: {
    mainnet: {
      url: node_url("mainnet"),
      accounts: accounts("mainnet"),
      tags: ["mainnet"],
    },
    goerli: {
      url: node_url("goerli"),
      accounts: accounts("goerli"),
      tags: ["staging"],
    },
    hardhat: {
      tags: ["local"],
      forking: {
        url: node_url("goerli"),
      },
    },
    localhost: {
      tags: ["local"],
      timeout: 1_000_000,
    },
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  preprocess: {
    eachLine: removeConsoleLog(
      (hre: HardhatRuntimeEnvironment) =>
        hre.network.name !== "hardhat" && hre.network.name !== "localhost"
    ),
  },
};

export default config;
