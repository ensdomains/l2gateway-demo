window.ethereum.enable();
const provider = new ethers.providers.Web3Provider(window.ethereum);
let node, resolver, prefix, url, gatewayURL, response;

const ENS_ABI = [
    "function resolver(bytes32 node) public view returns (address)"
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
    "inputs":[
        {
            "internalType":"bytes32",
            "name":"node",
            "type":"bytes32"
        },
        {
            "components":[
                {
                    "internalType":"bytes",
                    "name":"signature",
                    "type":"bytes"
                },{
                    "internalType":"address",
                    "name":"addr",
                    "type":"address"
                }
            ],
            "internalType":"struct AppResolverStub.Proof",
            "name":"proof",
            "type":"tuple"
        }
    ],
    "name":"addrWithProof",
    "outputs":[
        {
            "internalType":"address",
            "name":"",
            "type":"address"
        }
    ],
    "stateMutability":"view",
    "type":"function"
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
    const data = await resolver.addr(node);
    prefix = data.prefix
    url    = data.url
    document.getElementById("gateway").innerText = url;
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
    response = await doGatewayQuery(url, resolver, "addr", [node]);
    const decodedResponse = resolver.interface.decodeFunctionData(response.slice(0, 10), response);
    const dictifiedResponse = dictMap(decodedResponse, ADDR_WITH_PROOF_ABI.inputs);
    document.getElementById("response").innerText = `addrWithProof(${JSON.stringify(dictifiedResponse, null, 4).slice(1, -1)})`;
}

async function processResponse() {
    const resolvedAddress = await resolver.resolvedAddress
    const result = await resolver.provider.call({
        to: resolvedAddress,
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