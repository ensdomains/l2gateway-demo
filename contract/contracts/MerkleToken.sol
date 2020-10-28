pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev An ERC20-compatible token that allows users to claim their tokens from a merkle tree of preloaded balances.
 *      Developed as a demonstration of the 'l2 gateway' proto-standard.
 */
contract MerkleToken is ERC20 {
    bytes32 public merkleRoot; // The merkle root of the set of preloaded balances
    string gateway; // The URL of an l2 gateway server that can provide call data
    mapping(uint=>uint) claimed; // A mapping of preloaded balances that are claimed so far

    constructor(bytes32 root, string memory _gateway) ERC20("Merkle token", "MERKLE") public {
        merkleRoot = root;
        gateway = _gateway;
    }

    // The resolver for the l2 gateway implementation of `claimableBalance`
    function claimableBalanceWithProof(address addr, uint balance, bytes memory proof) external view returns(uint) {
        (bool valid, uint idx) = checkProof(proof, merkleRoot, keccak256(abi.encodePacked(addr, balance)));
        require(valid, "Invalid merkle proof");
        if(claimed[idx >> 8] & (1 << (idx & 0xff)) == 0) {
            return balance;
        }
        return 0;
    }

    // The resolver for the l2 gateway implementation of `claim`
    function claimWithProof(address addr, uint balance, bytes memory proof) external {
        (bool valid, uint idx) = checkProof(proof, merkleRoot, keccak256(abi.encodePacked(addr, balance)));
        require(valid, "Invalid merkle proof");
        if(claimed[idx >> 8] & (1 << (idx & 0xff)) == 0) {
            claimed[idx >> 8] |= 1 << (idx & 0xff);
            _mint(addr, balance);
        }
    }

    // The stub implementation for the l2 gateway function `claim`
    function claim(address addr) external view returns(bytes memory prefix, string memory url) {
        return (abi.encodeWithSelector(MerkleToken.claimWithProof.selector, addr), gateway);
    }

    // The stub implementation for the l2 gateway function `claimableBalance`
    function claimableBalance(address addr) external view returns(bytes memory prefix, string memory url) {
        return (abi.encodeWithSelector(MerkleToken.claimableBalanceWithProof.selector, addr), gateway);
    }

    // Adapted from https://github.com/ameensol/merkle-tree-solidity/blob/master/src/MerkleProof.sol
    function checkProof(bytes memory proof, bytes32 root, bytes32 hash) internal pure returns (bool, uint) {
        bytes32 el;
        bytes32 h = hash;
        uint idx = 0;

        for (uint256 i = 32; i <= proof.length; i += 32) {
            assembly {
                el := mload(add(proof, i))
            }

            idx <<= 1;
            if (h < el) {
                h = keccak256(abi.encodePacked(h, el));
            } else {
                h = keccak256(abi.encodePacked(el, h));
                idx |= 1;
            }
        }

        return (h == root, idx);
    }
}
