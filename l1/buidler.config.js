usePlugin("@nomiclabs/buidler-waffle");
usePlugin("@nomiclabs/buidler-ethers");
usePlugin("buidler-deploy");

module.exports = {
  solc: {
    version: "0.7.6",
  },
  external: {
    artifacts: ["node_modules/@eth-optimism/contracts/build/contracts"]
  }
};
