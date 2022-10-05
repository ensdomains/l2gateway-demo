pragma solidity ^0.8.0;
pragma abicoder v2;

// import {Lib_AddressResolver} from "@eth-optimism/contracts/build/contracts/libraries/resolver/Lib_AddressResolver.sol";
// import {Lib_OVMCodec} from "@eth-optimism/contracts/build/contracts/libraries/codec/Lib_OVMCodec.sol";
// import {Lib_SecureMerkleTrie} from "@eth-optimism/contracts/build/contracts/libraries/trie/Lib_SecureMerkleTrie.sol";
// import {iOVM_StateCommitmentChain} from "@eth-optimism/contracts/build/contracts/iOVM/chain/iOVM_StateCommitmentChain.sol";
// import {Lib_RLPReader} from "@eth-optimism/contracts/build/contracts/libraries/rlp/Lib_RLPReader.sol";
import {Lib_AddressResolver} from "@eth-optimism/contracts/libraries/resolver/Lib_AddressResolver.sol";
import {Lib_OVMCodec} from "@eth-optimism/contracts/libraries/codec/Lib_OVMCodec.sol";
import {Lib_SecureMerkleTrie} from "@eth-optimism/contracts/libraries/trie/Lib_SecureMerkleTrie.sol";
import {StateCommitmentChain} from "@eth-optimism/contracts/L1/rollup/StateCommitmentChain.sol";
import {Lib_RLPReader} from "@eth-optimism/contracts/libraries/rlp/Lib_RLPReader.sol";
import {Lib_BytesUtils} from "@eth-optimism/contracts/libraries/utils/Lib_BytesUtils.sol";

// import "hardhat/console.sol";

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

    constructor(
        address ovmAddressManager,
        string memory _gateway,
        address _l2resolver
    ) Lib_AddressResolver(ovmAddressManager) {
        gateway = _gateway;
        l2resolver = _l2resolver;
    }

    function addr(bytes32 node)
        external
        view
        returns (bytes memory prefix, string memory url)
    {
        return (
            abi.encodeWithSelector(
                OptimismResolverStub.addrWithProof.selector,
                node
            ),
            gateway
        );
    }

    function addrWithProof(bytes32 node, L2StateProof memory proof)
        external
        view
        returns (address)
    {
        require(verifyStateRootProof(proof), "Invalid state root");
        bytes32 slot = keccak256(abi.encodePacked(node, uint256(1)));
        bytes32 value = getStorageValue(l2resolver, slot, proof);
        return address(uint160(uint256(value)));
        // return address(uint256(value));
    }

    function verifyStateRootProof(L2StateProof memory proof)
        internal
        view
        returns (bool)
    {
        StateCommitmentChain ovmStateCommitmentChain = StateCommitmentChain(
            resolve("StateCommitmentChain")
        );
        return
            ovmStateCommitmentChain.verifyStateCommitment(
                proof.stateRoot,
                proof.stateRootBatchHeader,
                proof.stateRootProof
            );
    }

    function getStorageValue(
        address target,
        bytes32 slot,
        L2StateProof memory proof
    ) internal pure returns (bytes32) {
        (
            bool exists,
            bytes memory encodedResolverAccount
        ) = Lib_SecureMerkleTrie.get(
                abi.encodePacked(target),
                proof.stateTrieWitness,
                proof.stateRoot
            );
        require(exists, "Account does not exist");
        Lib_OVMCodec.EVMAccount memory account = Lib_OVMCodec.decodeEVMAccount(
            encodedResolverAccount
        );
        (bool storageExists, bytes memory retrievedValue) = Lib_SecureMerkleTrie
            .get(
                abi.encodePacked(slot),
                proof.storageTrieWitness,
                account.storageRoot
            );
        require(storageExists, "Storage value does not exist");
        return
            // Lib_BytesUtils.toBytes32PadLeft(
            //     Lib_RLPReader.readBytes(retrievedValue)
            // );
            toBytes32PadLeft(Lib_RLPReader.readBytes(retrievedValue));
    }

    // Ported old function from Lib_BytesUtils.sol
    function toBytes32PadLeft(bytes memory _bytes)
        internal
        pure
        returns (bytes32)
    {
        bytes32 ret;
        uint256 len = _bytes.length <= 32 ? _bytes.length : 32;
        assembly {
            ret := shr(mul(sub(32, len), 8), mload(add(_bytes, 32)))
        }
        return ret;
    }
}
