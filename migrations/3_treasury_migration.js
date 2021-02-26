const Treasury = artifacts.require("Treasury");
const BCUBEToken = artifacts.require("BCUBEToken");

const ADDRESS_WALLET_TEAM = '0x7EcCE010C9717ce4fa6Ad2a79994b04FCd0C56C9';
const ADDRESS_CHAINLINK_ETHUSD = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const ADDRESS_CHAINLINK_USDTUSD = '0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB';
const ADDRESS_USDT_TOKEN = '0xd92e713d051c37ebb2561803a3b5fbabc4962431';

module.exports = async function (deployer) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const openingTime = 1614427200; // 2021-02-27T12:00:00.000Z
  const closingTime = 1622116800; // 2021-05-27T12:00:00.000Z
  const listingTime = closingTime + 6912000;  // closingDate + 80j

  console.log(`openingTime ${new Date(openingTime * 1000)}`);
  console.log(`closingTime ${new Date(closingTime * 1000)}`);
  console.log(`listingTime ${new Date(listingTime * 1000)}`);

  await deployer.deploy(
    Treasury,
    ADDRESS_WALLET_TEAM,
    BCUBEToken.networks[4].address,
    openingTime,
    closingTime,
    ADDRESS_CHAINLINK_ETHUSD,
    ADDRESS_CHAINLINK_USDTUSD,
    ADDRESS_USDT_TOKEN,
    listingTime
  );
};
