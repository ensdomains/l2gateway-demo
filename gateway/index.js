const cors = require('cors');
const { ethers } = require('ethers');
const express = require('express');
const fs = require('fs');
const MerkleTree = require('merkle-tree-solidity').default;

// Construct a merkle tree of balances from the JSON file
const balances = JSON.parse(fs.readFileSync('../balances.json'));
const elements = Object.entries(balances).map(
    (b) => Buffer.from(
        ethers.utils.solidityKeccak256(['address', 'uint'], b).slice(2),
        'hex'));
const merkleTree = new MerkleTree(elements);

// The relevant parts of the deployed token ABI
const merkleABI = [
    // Unlike the callers, this backend does need to know the full ABI of both stub and transformer
    // functions.
    "function claimableBalance(address) view returns(bytes,string)",
    "function claimableBalanceWithProof(address,uint,bytes) view returns(uint)",
    "function claim(address) view returns(bytes,string)",
    "function claimWithProof(address,uint,bytes)",
];
const merkleInterface = new ethers.utils.Interface(merkleABI);

// Configure the webapp
const app = express();
app.use(cors());
app.use(express.json());
const port = 8080;

app.get('/', (req, res) => {
    res.json({root: '0x' + merkleTree.getRoot().toString('hex')});
});

// Function handlers for functions implemented by this l2 gateway. Each accepts the address of the
// contract being called and the decoded arguments to the function, and is expected to return
// the encoded calldata for the 'real' function.
const functionHandlers = {};

// Gets the balance from the merkle tree and construct a proof of it
function getBalanceAndProof(address) {
    const balance = balances[address.toLowerCase()];
    const hash = ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
    const proof = '0x' + merkleTree.getProof(Buffer.from(hash.slice(2), 'hex')).map(e => e.toString('hex')).join('');
    return [ balance, proof ];
}

functionHandlers['claimableBalance'] = (contractAddress, [ address ]) => {
    const [ balance, proof ] = getBalanceAndProof(address);
    return merkleInterface.encodeFunctionData('claimableBalanceWithProof', [address, balance, proof]);
};

functionHandlers['claim'] = (contractAddress, [ address ]) => {
    const [ balance, proof ] = getBalanceAndProof(address);
    return merkleInterface.encodeFunctionData('claimWithProof', [address, balance, proof]);
};

app.post('/query', (req, res) => {
    const { address, data } = req.body;
    const functionId = data.slice(0, 10);
    const fragment = merkleInterface.getFunction(functionId);
    const handler = functionHandlers[fragment.name];
    const args = merkleInterface.decodeFunctionData(functionId, data);
    res.json({
        data: handler(address, args)
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
