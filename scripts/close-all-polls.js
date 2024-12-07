const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Closing all polls with account:", deployer.address);

  const pollsAddress = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

  // Get contract
  const DePolls = await ethers.getContractFactory("DePolls");
  const polls = await DePolls.attach(pollsAddress);

  // Get poll count
  const pollCount = await polls.pollCount();
  console.log(`Total polls: ${pollCount}`);

  // Close all active polls
  console.log("\nClosing active polls...");
  for (let i = 0; i < pollCount; i++) {
    try {
      const poll = await polls.getPoll(i);
      if (poll.isActive) {
        console.log(`Closing poll ${i}: ${poll.question}`);
        const tx = await polls.closePoll(i);
        await tx.wait();
        console.log(`Poll ${i} closed successfully`);
      }
    } catch (error) {
      console.error(`Error closing poll ${i}:`, error.message);
    }
  }

  console.log("\nFinished closing polls");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 