window.ethereum.enable();
const provider = new ethers.providers.Web3Provider(window.ethereum);
let node, resolver, prefix, gatewayURL, response;

const ENS_ABI = [
    "function resolver(bytes32 node) public view returns (address)"
];

const L2_RESOLVER_ABI = [
    "function addr(bytes32 node) public view returns(address)"
];

const ADDR_ABI = {
    "inputs": [
        {
            "internalType": "bytes32",
            "name": "node",
            "type": "bytes32"
        }
    ],
    "name": "addr",
    "outputs": [
        {
            "internalType": "bytes",
            "name": "prefix",
            "type": "bytes"
        },
        {
            "internalType": "string",
            "name": "url",
            "type": "string"
        }
    ],
    "stateMutability": "view",
    "type": "function"
};

const ADDR_WITH_PROOF_ABI = {
    "inputs": [
        {
            "internalType": "bytes32",
            "name": "node",
            "type": "bytes32"
        },
        {
            "components": [
                {
                    "internalType": "bytes32",
                    "name": "stateRoot",
                    "type": "bytes32"
                },
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "batchIndex",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes32",
                            "name": "batchRoot",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "uint256",
                            "name": "batchSize",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "prevTotalElements",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes",
                            "name": "extraData",
                            "type": "bytes"
                        }
                    ],
                    "internalType": "struct Lib_OVMCodec.ChainBatchHeader",
                    "name": "stateRootBatchHeader",
                    "type": "tuple"
                },
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "index",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes32[]",
                            "name": "siblings",
                            "type": "bytes32[]"
                        }
                    ],
                    "internalType": "struct Lib_OVMCodec.ChainInclusionProof",
                    "name": "stateRootProof",
                    "type": "tuple"
                },
                {
                    "internalType": "bytes",
                    "name": "stateTrieWitness",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes",
                    "name": "storageTrieWitness",
                    "type": "bytes"
                }
            ],
            "internalType": "struct OptimismResolverStub.L2StateProof",
            "name": "proof",
            "type": "tuple"
        }
    ],
    "name": "addrWithProof",
    "outputs": [
        {
            "internalType": "address",
            "name": "",
            "type": "address"
        }
    ],
    "stateMutability": "view",
    "type": "function"
};

async function doGatewayQuery(gatewayURL, contract, functionName, args) {
    // Encode the call data
    const callData = contract.interface.encodeFunctionData(functionName, args);
    
    const response = await fetch(gatewayURL, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'data': callData,
            'address': await contract.resolvedAddress,
        })
    });
    const callbackData = await response.json();
    
    return callbackData.data;
}

async function findResolver() {
    const ensAddress = document.getElementById("ens").value;
    const ens = new ethers.Contract(ensAddress, ENS_ABI, provider);
    node = ethers.utils.namehash(document.getElementById("name").value);
    const resolverAddress = await ens.resolver(node);
    resolver = new ethers.Contract(resolverAddress, [ADDR_ABI, ADDR_WITH_PROOF_ABI], provider);
    document.getElementById("resolver").innerText = resolverAddress;
}

async function findGateway() {
    [prefix, gatewayURL] = await resolver.addr(node);
    document.getElementById("gateway").innerText = gatewayURL;
    document.getElementById("prefix").innerText = "addrWithProof(" + JSON.stringify(ethers.utils.defaultAbiCoder.decode(['bytes32'], '0x' + prefix.slice(10))).slice(1, -1) + ", ...)";
}

function dictMap(args, types) {
    return Object.fromEntries(args.map((arg, i) => {
        const type = types[i];
        switch(type.type) {
        case 'uint256':
            return [type.name, arg.toNumber()];
        case 'tuple':
            return [type.name, dictMap(arg, type.components)];
        default:
            return [type.name, arg];
        }
    }));
}

async function queryGateway() {
    console.log({gatewayURL, resolver, node})
    // node = test.test
    // registry = 0x32c1F850Eb92b1049FC4691b6AC29327A0f28ddf
    // resolver = 0x0a071a7cB0e4bb14C7974e9C39A0939D9Bfe5E67
    response = await doGatewayQuery(gatewayURL, resolver, "addr", [node]);
    const decodedResponse = resolver.interface.decodeFunctionData(response.slice(0, 10), response);
    const dictifiedResponse = dictMap(decodedResponse, ADDR_WITH_PROOF_ABI.inputs);
    document.getElementById("response").innerText = `addrWithProof(${JSON.stringify(dictifiedResponse, null, 4).slice(1, -1)})`;
}

async function processResponse() {
    const result = await resolver.provider.call({
        to: await resolver.resolvedAddress,
        data: response,
    });
    const decodedResult = resolver.interface.decodeFunctionResult("addrWithProof", result);
    document.getElementById("result").innerText = decodedResult;
}

// Send a claim transaction
async function claim() {
    const tx = await transactL2Function(merkleToken, "claim", [ethereum.selectedAddress]);
    await provider.waitForTransaction(tx.hash);
    update(ethereum.selectedAddress);
}