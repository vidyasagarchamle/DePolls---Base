const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy DePolls
  const DePolls = await hre.ethers.getContractFactory("DePolls");
  const polls = await DePolls.deploy();
  await polls.deployed();
  console.log("DePolls deployed to:", polls.address);

  // Write the address to a file
  const fs = require("fs");
  const addresses = {
    pollsAddress: polls.address
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\nContract address saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 