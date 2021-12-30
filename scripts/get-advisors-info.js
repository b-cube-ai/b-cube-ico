const { ethers } = require('ethers');
const { abi: TreasuryABI } = require("../build/contracts/Treasury.json");

const TREASURY_ADDRESS = '0xC1D1b440f9e012C1300d5bd665850E03C3a51fDc';

/**** TO BE UPDATED !! ****/

const INFURA_PROJECT_ID = '---TODO---';
const ADVISOR_ADDRESS = '---TODO---';

/**************************/


const provider = new ethers.providers.InfuraProvider('mainnet', INFURA_PROJECT_ID);

const run = async () => {
  const Treasury = new ethers.Contract(TREASURY_ADDRESS, TreasuryABI, provider);
  const advisor = await Treasury.advisors(ADVISOR_ADDRESS);
  const isAdvisor = advisor.increaseInAllowance.toString() !== '0';
  const total = advisor.increaseInAllowance.mul(4).div('1000000000000000000').toString();
  const withdrawn = advisor.shareWithdrawn.div('1000000000000000000').toString();
  const listingDate = new Date(await Treasury.listingTime() * 1000);

  console.log(`Is advisor ? ${isAdvisor}`);
  if(isAdvisor) {
    console.log(`Total BCube: ${total}`);
    console.log(`Already Withdrawn Bcube: ${withdrawn}`);
    console.log(`Listing date: ${listingDate}`);

    const diffMs = new Date().getTime() - listingDate.getTime();
    const diffWeeks = Math.floor(Math.floor(diffMs / (1000 * 60 * 60  * 24)) / 7);
    console.log(`Weeks since listing date: ${diffWeeks}`);
    
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
    
    console.log(`Current max withdraw: ${maxAllowance.div('1000000000000000000').toString()}`);

  }

};

run().catch(console.error);