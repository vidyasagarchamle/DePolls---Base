const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up rewards with account:", deployer.address);

  const tokenAddress = "0x9be87fdCf8dC946683702192Ebd4f1924a96B18B";
  const pollsAddress = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

  // Get contracts
  const DePollsToken = await ethers.getContractFactory("DePollsToken");
  const token = await DePollsToken.attach(tokenAddress);

  // Check initial balances
  console.log("\nInitial balances:");
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log(`Deployer balance: ${ethers.utils.formatEther(deployerBalance)} DPOLL`);
  
  const pollsBalance = await token.balanceOf(pollsAddress);
  console.log(`Polls contract balance: ${ethers.utils.formatEther(pollsBalance)} DPOLL`);

  // Step 1: Transfer tokens to polls contract for rewards
  console.log("\nStep 1: Transferring tokens to polls contract...");
  const transferAmount = ethers.utils.parseEther("10000"); // 10,000 tokens for rewards
  const transferTx = await token.transfer(pollsAddress, transferAmount);
  await transferTx.wait();
  console.log(`Transferred ${ethers.utils.formatEther(transferAmount)} DPOLL to polls contract`);

  // Step 2: Transfer tokens to token contract itself
  console.log("\nStep 2: Transferring tokens to token contract...");
  const tokenAmount = ethers.utils.parseEther("10000"); // 10,000 tokens for direct rewards
  const tokenTransferTx = await token.transfer(tokenAddress, tokenAmount);
  await tokenTransferTx.wait();
  console.log(`Transferred ${ethers.utils.formatEther(tokenAmount)} DPOLL to token contract`);

  // Verify final balances
  console.log("\nFinal balances:");
  const finalPollsBalance = await token.balanceOf(pollsAddress);
  console.log(`Polls contract: ${ethers.utils.formatEther(finalPollsBalance)} DPOLL`);

  const finalTokenBalance = await token.balanceOf(tokenAddress);
  console.log(`Token contract: ${ethers.utils.formatEther(finalTokenBalance)} DPOLL`);

  const finalDeployerBalance = await token.balanceOf(deployer.address);
  console.log(`Deployer: ${ethers.utils.formatEther(finalDeployerBalance)} DPOLL`);

  console.log("\nSetup complete! Both contracts should now have enough tokens for rewards.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 