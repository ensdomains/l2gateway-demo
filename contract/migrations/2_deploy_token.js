const MerkleToken = artifacts.require("MerkleToken");
const { ethers } = require('ethers');
const fs = require('fs');
const MerkleTree = require('merkle-tree-solidity').default;

const balances = JSON.parse(fs.readFileSync('../../balances.json'));
const elements = Object.entries(balances).map(
    (b) => Buffer.from(
        ethers.utils.solidityKeccak256(['address', 'uint'], b).slice(2),
        'hex'));
const merkleTree = new MerkleTree(elements);

const gatewayURL = "http://localhost:8080/query";

module.exports = function (deployer) {
  deployer.deploy(MerkleToken, merkleTree.getRoot(), gatewayURL);
};
