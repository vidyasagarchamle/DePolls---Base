const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing voting mechanism with account:", deployer.address);

  const tokenAddress = "0x9be87fdCf8dC946683702192Ebd4f1924a96B18B";
  const pollsAddress = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

  // Get contracts
  const DePollsToken = await ethers.getContractFactory("DePollsToken");
  const token = await DePollsToken.attach(tokenAddress);

  const DePolls = await ethers.getContractFactory("DePolls");
  const polls = await DePolls.attach(pollsAddress);

  // Check balances
  console.log("\nChecking balances:");
  const tokenContractBalance = await token.balanceOf(tokenAddress);
  console.log(`Token contract balance: ${ethers.utils.formatEther(tokenContractBalance)} DPOLL`);
  
  const pollsContractBalance = await token.balanceOf(pollsAddress);
  console.log(`Polls contract balance: ${ethers.utils.formatEther(pollsContractBalance)} DPOLL`);

  // Transfer tokens to polls contract
  console.log("\nStep 1: Transferring tokens to polls contract...");
  const amount = ethers.utils.parseEther("1000");
  const transferTx = await token.transfer(pollsAddress, amount);
  await transferTx.wait();
  console.log(`Transferred ${ethers.utils.formatEther(amount)} DPOLL to polls contract`);

  // Approve polls contract to spend tokens
  console.log("\nStep 2: Approving polls contract to spend tokens...");
  const approveTx = await token.approve(pollsAddress, ethers.utils.parseEther("1000000"));
  await approveTx.wait();
  console.log("Approved polls contract to spend tokens");

  // Create a test poll
  console.log("\nStep 3: Creating a test poll...");
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const createPollTx = await polls.createPoll(
    "Test Poll",
    ["Option 1", "Option 2"],
    deadline,
    false,
    false
  );
  await createPollTx.wait();
  console.log("Created test poll");

  // Try voting
  console.log("\nStep 4: Testing vote...");
  try {
    const voteTx = await polls.vote(0, [0]);
    await voteTx.wait();
    console.log("Vote successful!");
  } catch (error) {
    console.error("Vote failed:", error.message);
  }

  // Final balance check
  console.log("\nFinal balances:");
  const finalTokenBalance = await token.balanceOf(tokenAddress);
  console.log(`Token contract: ${ethers.utils.formatEther(finalTokenBalance)} DPOLL`);
  
  const finalPollsBalance = await token.balanceOf(pollsAddress);
  console.log(`Polls contract: ${ethers.utils.formatEther(finalPollsBalance)} DPOLL`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 