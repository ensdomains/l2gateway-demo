import cors from 'cors';
import { ethers, BigNumber } from 'ethers';
import express from 'express';
import * as fs from 'fs';
import { AppResolverStub__factory } from './contracts/factories/AppResolverStub__factory';
import { AppResolverStub } from './contracts/AppResolverStub';
import { loadContract, loadContractFromManager } from './ovm-contracts';
import { RLP } from 'ethers/lib/utils';
require('dotenv').config()

// Instantiate the ethers provider
const L1_PROVIDER_URL = "http://localhost:9545/";
const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);

// const L2_PROVIDER_URL = "http://localhost:8545/";
// const l2_provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);
// Configure the webapp
const app = express();
app.use(cors());
app.use(express.json());
const port = 8081;

// Function handlers for functions implemented by this l2 gateway. Each accepts the address of the
// contract being called and the decoded arguments to the function, and is expected to return
// the encoded calldata for the 'real' function.
const functionHandlers: {[key: string]: (contract: ethers.Contract, args: ethers.utils.Result) => Promise<any>} = {};

functionHandlers['addr'] = async (contract: ethers.Contract, [ node ]) => {
    const PRIVATE_KEY:any = process.env.PRIVATE_KEY
    const ADDR:any = process.env.ADDR    
    let messageHash = ethers.utils.solidityKeccak256(['bytes32', 'address'],[node, ADDR]);
    let messageHashBinary = ethers.utils.arrayify(messageHash);
    let signer = new ethers.Wallet(PRIVATE_KEY);
    let signerAddress = signer.address;
    let signature = await signer.signMessage(messageHashBinary);
    const data = [
        node,
        {
          signature,
          addr: ADDR
        }
    ];
    console.log({
        signerAddress,node,ADDR,messageHash, messageHashBinary, signature, data
    })
    const r = contract.interface.encodeFunctionData('addrWithProof', data);
    return r
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
    const contract = AppResolverStub__factory.connect(address, l1_provider);
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
