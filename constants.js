const BCUBEToken = require("./build/contracts/BCUBEToken.json");
const BCubePrivateSale = require("./build/contracts/BCubePrivateSale.json");

let TOKEN_ADDRESS, BPS_ADDRESS;
const TOKEN_ABI = BCUBEToken.abi;
const BPS_ABI = BCubePrivateSale.abi;

module.exports = { TOKEN_ADDRESS, BPS_ADDRESS, TOKEN_ABI, BPS_ABI };
