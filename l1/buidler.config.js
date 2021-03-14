usePlugin("@nomiclabs/buidler-waffle");
usePlugin("@nomiclabs/buidler-ethers");

module.exports = {
  networks: {
    integration: {
      url: "http://localhost:9545/" 
    }
  },
  solc: {
    version: "0.7.6",
  },
  external: {
    artifacts: ["node_modules/@eth-optimism/contracts/build/contracts"]
  }
};
