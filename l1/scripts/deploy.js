const bre = require("@nomiclabs/buidler");

const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const L2_RESOLVER = "0x1631011D63a8Bb0D0e0a0a8dDf602881A09B8aFb";

async function main() {
  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  const stub = await OptimismResolverStub.deploy(OVM_ADDRESS_MANAGER, "http://localhost:8081/query", L2_RESOLVER);

  await stub.deployed();

  console.log(`OptimismResolverStub deployed to ${stub.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
