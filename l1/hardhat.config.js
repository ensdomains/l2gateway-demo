require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  networks: {
    integration: {
      url: "http://localhost:9545/" 
    }
  },
  solidity: {
    version: "0.7.6",
  },
  external: {
    artifacts: ["node_modules/@eth-optimism/contracts/build/contracts"]
  }
};
