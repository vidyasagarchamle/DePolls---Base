const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Transferring tokens with account:", deployer.address);

  const tokenAddress = "0x9be87fdCf8dC946683702192Ebd4f1924a96B18B";
  const pollsAddress = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

  // Get token contract
  const DePollsToken = await ethers.getContractFactory("DePollsToken");
  const token = await DePollsToken.attach(tokenAddress);

  // Check current balance
  const balance = await token.balanceOf(deployer.address);
  console.log(`Current balance: ${ethers.utils.formatEther(balance)} DPOLL`);

  // Transfer tokens to polls contract
  const amount = ethers.utils.parseEther("1000"); // 1000 tokens
  console.log(`Transferring ${ethers.utils.formatEther(amount)} tokens to ${pollsAddress}`);
  
  const tx = await token.transfer(pollsAddress, amount);
  await tx.wait();
  
  console.log("Transfer complete!");

  // Verify contract balance
  const contractBalance = await token.balanceOf(pollsAddress);
  console.log(`Contract balance: ${ethers.utils.formatEther(contractBalance)} DPOLL`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 