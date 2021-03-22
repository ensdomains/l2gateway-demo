const hre = require("hardhat");
const ethers = hre.l2ethers;

const TEST_NAMEHASH = '0x28f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb'; // test.test
const TEST_ADDRESS = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';

async function main() {
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  const resolver = await OptimismResolver.deploy();

  const tx = await resolver.deployed();
  const receipt = await tx.deployTransaction.wait();

  await (await resolver.functions.setAddr(TEST_NAMEHASH, TEST_ADDRESS)).wait();

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
