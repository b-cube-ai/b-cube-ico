const CONSTANTS = require("./constants");
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
web3 = new Web3(provider);
const Treasury = require("./build/contracts/Treasury.json");

if(process.argv <= 2){
  return;
}

const walletAddress = process.argv[2];

const treasury = new web3.eth.Contract(
  CONSTANTS.TREASURY_ABI,
  Treasury.networks[4447].address
);

async function doWhatYouHaveToDo(address){
  let accounts = await web3.eth.getAccounts();

  await treasury.methods.addWhitelisted(address).send({
    from: accounts[0]
  });
}

doWhatYouHaveToDo(walletAddress);