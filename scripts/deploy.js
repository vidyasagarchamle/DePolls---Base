const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy DePollsToken
  const DePollsToken = await hre.ethers.getContractFactory("contracts/DePollsToken.sol:DePollsToken");
  const token = await DePollsToken.deploy();
  await token.deployed();
  const tokenAddress = token.address;
  console.log("DePollsToken deployed to:", tokenAddress);

  // Deploy DePolls with token address
  const DePolls = await hre.ethers.getContractFactory("contracts/DePolls.sol:DePolls");
  const polls = await DePolls.deploy(tokenAddress);
  await polls.deployed();
  const pollsAddress = polls.address;
  console.log("DePolls deployed to:", pollsAddress);

  // Transfer tokens to the polls contract for rewards
  console.log("\nSetting up rewards...");
  const rewardAmount = hre.ethers.utils.parseEther("100000"); // 100,000 tokens for rewards
  await token.transfer(pollsAddress, rewardAmount);
  console.log(`Transferred ${hre.ethers.utils.formatEther(rewardAmount)} DPOLL to polls contract`);

  // Verify balances
  const pollsBalance = await token.balanceOf(pollsAddress);
  console.log("\nFinal balances:");
  console.log(`Polls contract: ${hre.ethers.utils.formatEther(pollsBalance)} DPOLL`);

  // Write the addresses to a file
  const fs = require("fs");
  const addresses = {
    tokenAddress,
    pollsAddress
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\nContract addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 