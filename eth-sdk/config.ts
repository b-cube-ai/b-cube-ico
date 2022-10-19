import { defineConfig } from "@dethcrypto/eth-sdk";

export default defineConfig({
  contracts: {
    mainnet: {
      usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
    },
    goerli: {
      usdt: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
      usdc: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
      dai: "0x2686eca13186766760a0347ee8eeb5a88710e11b",
    },
  },
});
