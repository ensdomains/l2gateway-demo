const hre = require("hardhat");
const {ethers, l2ethers} = hre;
const namehash = require('eth-ens-namehash');

const OVM_ADDRESS_MANAGER = "0xfA5b622409E1782597952a4A78c1D34CF32fF5e2";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  console.log(1, hre.network.config.l2url)
  /************************************
   * L2 deploy
   ************************************/
  // Replace the l2 provider with one that points at the l2 node
  l2ethers.provider = new ethers.providers.JsonRpcProvider(hre.network.config.l2url);
  console.log(2)
  // Deploy L2 resolver and set addr record for test.test
  const l2accounts = await l2ethers.getSigners();
  const OptimismResolver = await l2ethers.getContractFactory("OptimismResolver");
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
  await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  console.log(14)
  await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  console.log(15)
  // Deploy the resolver stub
  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  console.log(16)
  const stub = await OptimismResolverStub.deploy(OVM_ADDRESS_MANAGER, "http://localhost:8081/query", resolver.address);
  console.log(17)
  await stub.deployed();
  console.log(18)
  // Set the stub as the resolver for test.test
  await ens.setResolver(namehash.hash('test.test'), stub.address);
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
