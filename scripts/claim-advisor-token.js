const { ethers } = require('ethers');
const readline = require('readline');
const { abi: TreasuryABI } = require("../build/contracts/Treasury.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const TREASURY_ADDRESS = '0xC1D1b440f9e012C1300d5bd665850E03C3a51fDc';

/**** TO BE UPDATED !! ****/

const INFURA_PROJECT_ID = '---TODO---';
const ADVISOR_PRIVATE_KEY = '---TODO---';

/**************************/


const provider = new ethers.providers.InfuraProvider('mainnet', INFURA_PROJECT_ID);

const run = async () => {
  const advisorWallet = new ethers.Wallet(ADVISOR_PRIVATE_KEY).connect(provider);
  const Treasury = new ethers.Contract(TREASURY_ADDRESS, TreasuryABI, provider);
  const advisor = await Treasury.advisors(advisorWallet.address);
  const isAdvisor = advisor.increaseInAllowance.toString() !== '0';
  const listingDate = new Date(await Treasury.listingTime() * 1000);
  
  console.log(`Is advisor ? ${isAdvisor}`);
  if(isAdvisor) {
    const diffMs = new Date().getTime() - listingDate.getTime();
    const diffWeeks = Math.floor(Math.floor(diffMs / (1000 * 60 * 60  * 24)) / 7);
    
    let maxAllowance = ethers.BigNumber.from(0);
    if(diffWeeks >= 26 && diffWeeks < 52) {
      maxAllowance = advisor.increaseInAllowance;
    } else if(diffWeeks >= 52 && diffWeeks < 78) {
      maxAllowance = advisor.increaseInAllowance.mul(2);
    } else if(diffWeeks >= 78 && diffWeeks < 104) {
      maxAllowance = advisor.increaseInAllowance.mul(3);
    } else if(diffWeeks <= 104) {
      maxAllowance = advisor.increaseInAllowance.mul(4);
    }

    maxAllowance = maxAllowance.sub(advisor.shareWithdrawn);

    let gasEstimation = await Treasury.estimateGas.advisorShareWithdraw(maxAllowance, { from: advisorWallet.address });
    const gasPrice = await provider.getGasPrice();

    const maxFees = gasPrice.mul(gasEstimation);

    console.log(`Claim ${maxAllowance.div('1000000000000000000').toString()} bcube from ${advisorWallet.address}`);
    console.log(`Fees: ${ethers.utils.formatEther(maxFees)} ETH (using gas ${gasEstimation} and gasPrice ${gasPrice.div('1000000000')} gwei)`);

    rl.question('Enter \'ok\' to continue\n', async (value) => {
      if(value !== 'ok') {
        process.exit(1);
      }
      const tx = await Treasury
        .connect(advisorWallet)
        .advisorShareWithdraw(maxAllowance, { gasLimit: gasEstimation, gasPrice });
      console.log(`Transaction sent! tx hash = ${tx.hash}`);
  
      await tx.wait();
      console.log('Transaction confirmed');
      process.exit();
    });
  }

};

run().catch(console.error);