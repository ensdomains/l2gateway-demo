const hre = require("hardhat");
const {ethers} = hre;
const namehash = require('eth-ens-namehash');

const TEST_NODE = namehash.hash('test.test');

async function main() {
  console.log(1, hre.network.config.l2url)
  /************************************
   * L2 deploy
   ************************************/
  // Replace the l2 provider with one that points at the l2 node
  // ethers.provider = new ethers.providers.JsonRpcProvider(hre.network.config.l2url);
  console.log(2)
  // Deploy L2 resolver and set addr record for test.test
  const l2accounts = await ethers.getSigners();
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  console.log(3)
  const resolver = await OptimismResolver.deploy();
  console.log(4)
  await resolver.deployed();
  console.log(`OptimismResolver deployed to ${resolver.address}`);
  console.log(5)
  await (await resolver.functions.setAddr(TEST_NODE, l2accounts[0].address)).wait();
  console.log('Address set');
  
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
