const hre = require("hardhat");
const {ethers } = hre;
const namehash = require('eth-ens-namehash');

const OVM_ADDRESS_MANAGER = "0xa6f73589243a6A7a9023b1Fa0651b1d89c177111";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();

  // Deploy the ENS registry
  console.log(10)
  const ENS = await ethers.getContractFactory("ENSRegistry");
  console.log(11)
  const ens = await ENS.deploy();
  console.log(12)
  await ens.deployed();
  console.log(`ENS registry deployed at ${ens.address}`);
  console.log(13)
  // Create test.test owned by us
  let tx = await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  console.log(14, tx)
  let rcpt = await tx.wait()
  console.log(141, rcpt)
  tx = await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  rcpt = await tx.wait()
  console.log(15)
  // Deploy the resolver stub
  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  console.log(16)
  const RESOLVER_ADDRESS = '0xfa87477cF5281D9b9B9A2a9bE2A75B267AEDAF8c'
  const stub = await OptimismResolverStub.deploy(OVM_ADDRESS_MANAGER, "http://localhost:8081/query", RESOLVER_ADDRESS);
  // const stub = await OptimismResolverStub.deploy(OVM_ADDRESS_MANAGER, "http://localhost:8081/query", resolver.address);
  console.log(17)
  await stub.deployed();
  console.log(18)
  // Set the stub as the resolver for test.test
  tx = await ens.setResolver(namehash.hash('test.test'), stub.address);
  rcpt = await tx.wait()
  console.log(19)
  console.log(`OptimismResolverStub deployed at ${stub.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
