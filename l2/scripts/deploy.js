const bre = require("@nomiclabs/buidler");

async function main() {
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  const resolver = await OptimismResolver.deploy();

  await resolver.deployed();

  console.log(`OptimismResolver deployed to ${resolver.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
