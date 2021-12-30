const { ethers } = require('ethers');
const readline = require('readline');
const { abi: TreasuryABI } = require("../build/contracts/Treasury.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const TREASURY_ADDRESS = '0xC1D1b440f9e012C1300d5bd665850E03C3a51fDc';

/**** TO BE UPDATED !! ****/

const ADMIN_PRIVATE_KEY = '---TODO---';
const INFURA_PROJECT_ID = '---TODO---';
const ADVISOR_ADDRESS = '---TODO---';
const ADVISOR_AMOUNT = ethers.BigNumber.from('---TODO---').mul('1000000000000000000');

/**************************/


const provider = new ethers.providers.InfuraProvider('mainnet', INFURA_PROJECT_ID);

const run = async () => {
  const Treasury = new ethers.Contract(TREASURY_ADDRESS, TreasuryABI, provider);
  const admin = new ethers.Wallet(ADMIN_PRIVATE_KEY).connect(provider);

  const isAdmin = await Treasury.isWhitelistAdmin(admin.address);

  if(isAdmin === false) {
    console.log('NOT AN ADMIN!');
    console.log(`${admin.address} is not an admin`);
    return;
  }

  let gasEstimation = await Treasury.estimateGas.addAdvisor(ADVISOR_ADDRESS, ADVISOR_AMOUNT, { from: admin.address });
  const gasPrice = await provider.getGasPrice();

  const maxFees = gasPrice.mul(gasEstimation);

  console.log(`Add ${ADVISOR_ADDRESS} as an advisor, with allowance of ${ADVISOR_AMOUNT.div('1000000000000000000')} tokens`);
  console.log(`Fees: ${ethers.utils.formatEther(maxFees)} ETH (using gas ${gasEstimation} and gasPrice ${gasPrice.div('1000000000')} gwei)`);


  rl.question('Enter \'ok\' to continue\n', async (value) => {
    if(value !== 'ok') {
      process.exit(1);
    }
    const tx = await Treasury
      .connect(admin)
      .addAdvisor(ADVISOR_ADDRESS, ADVISOR_AMOUNT, { gasLimit: gasEstimation, gasPrice });
    console.log(`Transaction sent! tx hash = ${tx.hash}`);

    await tx.wait();
    console.log('Transaction confirmed');
    process.exit();
  });

};

run().catch(console.error);