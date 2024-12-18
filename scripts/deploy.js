const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy DePolls with optimized gas settings
  const DePolls = await hre.ethers.getContractFactory("contracts/Combined.sol:DePolls");
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

  // Update the contract address in abis.js
  const abisPath = "./src/contracts/abis.js";
  let abisContent = `export const POLLS_CONTRACT_ADDRESS = "${polls.address}";\n\n`;
  abisContent += "export const DePollsABI = " + JSON.stringify(require("../src/artifacts/contracts/Combined.sol/DePolls.json").abi, null, 2) + ";";
  fs.writeFileSync(abisPath, abisContent);
  console.log("\nContract address and ABI updated in abis.js");

  // Verify contract on Basescan
  if (hre.network.name !== "localhost" && process.env.BASESCAN_API_KEY) {
    console.log("\nVerifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: polls.address,
        constructorArguments: []
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 