require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('@eth-optimism/plugins/hardhat/compiler');
// require('@eth-optimism/plugins/hardhat/ethers');

module.exports = {
  networks: {
    // integration: {
    //   url: "http://localhost:9545/",
    //   l2url: "http://localhost:8545/"
    // },
    "goerli": {
      // url: `https://eth-goerli.g.alchemy.com/v2/${process.env.GOERLI_ALCHEMY_KEY}`,
      // l2url: `https://opt-goerli.g.alchemy.com/v2/${process.env.OPTIMISM_GOERLI_ALCHEMY_KEY}`,
      url: `https://eth-goerli.g.alchemy.com/v2/U1ARntTEGlBsfWuClAYbnoz7jJ9dXdnC`,
      l2url: `https://opt-goerli.g.alchemy.com/v2/oSCIVXdCPv0CSHRAECX_Y9ANvTsl-HC2`,
      accounts: ['0xd07afb698cea6d156890a007833e5f21892cc706dd2ee91ea4bd90d7648b124a']
    },
    "optimism-goerli": {
      url: `https://opt-goerli.g.alchemy.com/v2/oSCIVXdCPv0CSHRAECX_Y9ANvTsl-HC2`,
      accounts: ['0xd07afb698cea6d156890a007833e5f21892cc706dd2ee91ea4bd90d7648b124a']
    },
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  solidity: {
    version: "0.8.9",
  },
};
