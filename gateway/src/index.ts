import cors from 'cors';
import { ethers, BigNumber } from 'ethers';
import express from 'express';
import * as fs from 'fs';
import { MerkleTree } from 'merkletreejs'
import { OptimismResolver } from './contracts/OptimismResolver';
import { OptimismResolverStub__factory } from './contracts/factories/OptimismResolverStub__factory';
import { OptimismResolverStub } from './contracts/OptimismResolverStub';
import { loadContract, loadContractFromManager } from './ovm-contracts';
import { RLP } from 'ethers/lib/utils';

// Instantiate the ethers provider
// url: `https://eth-goerli.g.alchemy.com/v2/U1ARntTEGlBsfWuClAYbnoz7jJ9dXdnC`,
// const L1_PROVIDER_URL = "http://localhost:9545/";
const L1_PROVIDER_URL = "https://eth-goerli.g.alchemy.com/v2/U1ARntTEGlBsfWuClAYbnoz7jJ9dXdnC";
const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);

// l2url: `https://opt-goerli.g.alchemy.com/v2/oSCIVXdCPv0CSHRAECX_Y9ANvTsl-HC2`,
// const L2_PROVIDER_URL = "http://localhost:8545/";
const L2_PROVIDER_URL = "https://opt-goerli.g.alchemy.com/v2/oSCIVXdCPv0CSHRAECX_Y9ANvTsl-HC2";
const l2_provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);

const ADDRESS_MANAGER_ADDRESS = '0xa6f73589243a6A7a9023b1Fa0651b1d89c177111';

// Instantiate the manager
const ovmAddressManager = loadContract('Lib_AddressManager', ADDRESS_MANAGER_ADDRESS, l1_provider);

// Configure the webapp
const app = express();
app.use(cors());
app.use(express.json());
const port = 8081;

interface StateRootBatchHeader {
    batchIndex: BigNumber
    batchRoot: string
    batchSize: BigNumber
    prevTotalElements: BigNumber
    extraData: string
}

async function getLatestStateBatchHeader(): Promise<{batch: StateRootBatchHeader, stateRoots: string[]}> {
    // Instantiate the state commitment chain
    const ovmStateCommitmentChain = await loadContractFromManager('StateCommitmentChain', ovmAddressManager, l1_provider);
    for(let endBlock = await l1_provider.getBlockNumber(); endBlock > 0; endBlock = Math.max(endBlock - 100, 0)) {
        console.log('***getLatestStateBatchHeader3', endBlock)
        const startBlock = Math.max(endBlock - 100, 1);
        console.log('***getLatestStateBatchHeader4.1', startBlock)
        const events: ethers.Event[] = await ovmStateCommitmentChain.queryFilter(
            ovmStateCommitmentChain.filters.StateBatchAppended(), startBlock, endBlock);
        if(events.length > 0) {
            const event = events[events.length - 1];
            const tx = await l1_provider.getTransaction(event.transactionHash);
            console.log('***getLatestStateBatchHeader4.2', tx)
            const [ stateRoots ] = ovmStateCommitmentChain.interface.decodeFunctionData('appendStateBatch', tx.data);
            console.log('***getLatestStateBatchHeader4.3', event.args)
            return {
                batch: {
                    batchIndex: event.args?._batchIndex,
                    batchRoot: event.args?._batchRoot,
                    batchSize: event.args?._batchSize,
                    prevTotalElements: event.args?._prevTotalElements,
                    extraData: event.args?._extraData,
                },
                stateRoots,
            }
        }
    }
    throw Error("No state root batches found");
}

// Function handlers for functions implemented by this l2 gateway. Each accepts the address of the
// contract being called and the decoded arguments to the function, and is expected to return
// the encoded calldata for the 'real' function.
const functionHandlers: {[key: string]: (contract: ethers.Contract, args: ethers.utils.Result) => Promise<any>} = {};

functionHandlers['addr'] = async (contract: ethers.Contract, [ node ]) => {
    console.log(1)
    const stateBatchHeader = await getLatestStateBatchHeader();
    console.log(2, stateBatchHeader)
    // The l2 block number we'll use is the last one in the state batch
    const l2BlockNumber = stateBatchHeader.batch.prevTotalElements.add(stateBatchHeader.batch.batchSize);
    console.log(3, {l2BlockNumber, batchSize: stateBatchHeader.batch.batchSize})
    // Construct a merkle proof for the state root we need
    const elements = []
    for (
      let i = 0;
      i < Math.pow(2, Math.ceil(Math.log2(stateBatchHeader.stateRoots.length)));
      i++
    ) {
      if (i < stateBatchHeader.stateRoots.length) {
        console.log(4, i, stateBatchHeader.stateRoots[i])
        elements.push(stateBatchHeader.stateRoots[i])
      } else {
        console.log(5, i, ethers.utils.keccak256('0x' + '00'.repeat(32)))
        elements.push(ethers.utils.keccak256('0x' + '00'.repeat(32)))
      }
    }
    console.log(6, elements.length, Math.pow(2, Math.ceil(Math.log2(stateBatchHeader.stateRoots.length))))
    const hash = (el: Buffer | string): Buffer => {
      return Buffer.from(ethers.utils.keccak256(el).slice(2), 'hex')
    }
    console.log(7)
    const leaves = elements.map((element) => {
      return Buffer.from(element.slice(2), 'hex')
    })
    const index = elements.length - 1;
    console.log(9, index)
    const tree = new MerkleTree(leaves, hash)
    console.log(10)
    const treeProof = tree.getProof(leaves[index], index).map((element) => {
      return element.data
    });
    console.log(11, treeProof)
    // Get the address for the L2 resolver contract, and the slot that contains the data we want
    const l2ResolverAddress = await contract.l2resolver();
    console.log(12, l2ResolverAddress)
    const addrSlot = ethers.utils.keccak256(node + '00'.repeat(31) + '01');
    console.log(13, addrSlot)
    // Get a proof of the contents of that slot at the required L2 block
    const proof = await l2_provider.send('eth_getProof', [
        l2ResolverAddress,
        [addrSlot],
        '0x' + BigNumber.from(l2BlockNumber).toHexString().slice(2).replace(/^0+/, '')
    ]);
    console.log(14, proof)

    const addr = ethers.utils.hexDataSlice(ethers.utils.hexZeroPad(proof.storageProof[0].value, 32), 12);
    console.log(15, {addr, index, stateRootsLength:stateBatchHeader.stateRoots.length , stateRoots: stateBatchHeader.stateRoots})
    
    const data = [
        node,
        {
            stateRoot: stateBatchHeader.stateRoots[index],
            stateRootBatchHeader: stateBatchHeader.batch,
            stateRootProof: {
                index,
                siblings: treeProof,
            },
            stateTrieWitness: RLP.encode(proof.accountProof),
            storageTrieWitness: RLP.encode(proof.storageProof[0].proof),
        }
    ];
    console.log(16, data)
    console.log(17, contract.interface.encodeFunctionData('addrWithProof', data))
    return contract.interface.encodeFunctionData('addrWithProof', data);
}

// functionHandlers['claimableBalance'] = (contractAddress, [ address ]) => {
//     const [ balance, proof ] = getBalanceAndProof(address);
//     return merkleInterface.encodeFunctionData('claimableBalanceWithProof', [address, balance, proof]);
// };

// functionHandlers['claim'] = (contractAddress, [ address ]) => {
//     const [ balance, proof ] = getBalanceAndProof(address);
//     return merkleInterface.encodeFunctionData('claimWithProof', [address, balance, proof]);
// };

app.post('/query', async (req, res) => {
    const { address, data } = req.body;
    const contract = OptimismResolverStub__factory.connect(address, l1_provider);
    const functionId = data.slice(0, 10);
    let fragment;
    try {
        fragment = contract.interface.getFunction(functionId);
    } catch(e) {
        res.status(400).json({
            'error': e.reason
        });
        return;
    }
    const handler = functionHandlers[fragment.name];
    if(handler === undefined) {
        res.status(400).json({
            'error': "Function not implemented"
        });
        return;
    }
    const args = contract.interface.decodeFunctionData(functionId, data);
    res.json({
        data: await handler(contract, args)
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
