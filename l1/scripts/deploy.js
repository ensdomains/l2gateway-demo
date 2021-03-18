const bre = require("@nomiclabs/buidler");

const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const L2_RESOLVER = "0x54ad4ce757a00bF29305A694Cb9173C506031012";

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
