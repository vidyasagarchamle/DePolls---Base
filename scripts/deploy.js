const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy DePollsToken
  const DePollsToken = await hre.ethers.getContractFactory("DePollsToken");
  const token = await DePollsToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("DePollsToken deployed to:", tokenAddress);

  // Deploy DePolls with token address
  const DePolls = await hre.ethers.getContractFactory("DePolls");
  const polls = await DePolls.deploy(tokenAddress);
  await polls.waitForDeployment();
  const pollsAddress = await polls.getAddress();
  console.log("DePolls deployed to:", pollsAddress);

  // Transfer some tokens to the polls contract for rewards
  const amount = hre.ethers.parseEther("100000");
  await token.transfer(pollsAddress, amount);
  console.log("Transferred reward tokens to polls contract");

  // Write the addresses to a file
  const fs = require("fs");
  const addresses = {
    tokenAddress,
    pollsAddress
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Contract addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 