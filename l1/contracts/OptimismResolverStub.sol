pragma solidity ^0.7.6;
pragma abicoder v2;

import { Lib_AddressResolver } from "@eth-optimism/contracts/build/contracts/libraries/resolver/Lib_AddressResolver.sol";
import { Lib_OVMCodec } from "@eth-optimism/contracts/build/contracts/libraries/codec/Lib_OVMCodec.sol";
import { Lib_SecureMerkleTrie } from "@eth-optimism/contracts/build/contracts/libraries/trie/Lib_SecureMerkleTrie.sol";
import { iOVM_StateCommitmentChain } from "@eth-optimism/contracts/build/contracts/iOVM/chain/iOVM_StateCommitmentChain.sol";

contract OptimismResolverStub is Lib_AddressResolver {
  string public gateway;
  address public l2resolver;

  struct L2StateProof {
    bytes32 stateRoot;
    Lib_OVMCodec.ChainBatchHeader stateRootBatchHeader;
    Lib_OVMCodec.ChainInclusionProof stateRootProof;
    bytes stateTrieWitness;
    bytes storageTrieWitness;
  }

  constructor(address ovmAddressManager, string memory _gateway, address _l2resolver) Lib_AddressResolver(ovmAddressManager) {
    gateway = _gateway;
    l2resolver = _l2resolver;
  }

  function addr(bytes32 node) external view returns(bytes memory prefix, string memory url) {
    return (abi.encodeWithSelector(OptimismResolverStub.addrWithProof.selector, node), gateway);
  }

  function addrWithProof(bytes32 node, address a, L2StateProof memory proof) external view returns(address) {
    require(verifyStateRootProof(proof), "Invalid state root");
    bytes32 slot = keccak256(abi.encodePacked(node, bytes32(0)));
    require(verifyStorageProof(l2resolver, slot, bytes32(uint256(a)), proof), "Invalid storage proof");
    return a;
  }

  function verifyStateRootProof(L2StateProof memory proof) internal view returns(bool) {
    iOVM_StateCommitmentChain ovmStateCommitmentChain = iOVM_StateCommitmentChain(resolve("OVM_StateCommitmentChain"));
    return ovmStateCommitmentChain.verifyStateCommitment(proof.stateRoot, proof.stateRootBatchHeader, proof.stateRootProof);
  }

  function verifyStorageProof(address target, bytes32 slot, bytes32 value, L2StateProof memory proof) internal pure returns(bool) {
    (bool exists, bytes memory encodedResolverAccount) = Lib_SecureMerkleTrie.get(abi.encodePacked(target), proof.stateTrieWitness, proof.stateRoot);
    require(exists, "Account does not exist");
    Lib_OVMCodec.EVMAccount memory account = Lib_OVMCodec.decodeEVMAccount(encodedResolverAccount);
    return Lib_SecureMerkleTrie.verifyInclusionProof(abi.encodePacked(slot), abi.encodePacked(value), proof.storageTrieWitness, account.storageRoot);
  }
}
