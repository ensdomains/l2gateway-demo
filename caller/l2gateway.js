
/*
 * Implements the l2 callback pattern to translate a 'virtual' call into a real one.
 * Arguments:
 *   contract: An ethers.js contract object for the contract to call.
 *   functionName: The name of the stub function to call.
 *   args: The arguments to the function to pass
 * Returns:
 *   A promise that resolves to the data to pass to the contract's callback function to
 *   verify and resolve the result. Calling the contract with this calldata will generate the
 *   return data of the l2 function.
 */
async function getL2CallbackData(contract, functionName, args) {
    // Encode the call data
    const callData = contract.interface.encodeFunctionData(functionName, args);

    // 1. Call the stub function with the original call data
    const stubResult = await contract.provider.call({
        to: await contract.resolvedAddress,
        data: callData,
    });
    // The stub function always returns (bytes prefix, string url), in contrast to its ABI.
    const [requiredPrefix, gatewayURL] = ethers.utils.defaultAbiCoder.decode(['bytes', 'string'], stubResult);

    // 2. Call the proxy with the original call data
    const callbackId = requiredPrefix.slice(0, 10);
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
    // Check the prefix matches what the contract said it should
    if(!callbackData.data.startsWith(requiredPrefix)) {
        throw new Error("Invalid callback data prefix returned by proxy");
    }

    return callbackData.data;
}

/**
 * Uses the l2 callback pattern to make a read-only call to a contract
 * Arguments:
 *   contract: An ethers.js contract object for the contract to call.
 *   functionName: The name of the stub function to call.
 *   args: The arguments to the function to pass
 * Returns:
 *   A promise that evaluates to the return value of the l2 function.
 */
async function callL2Function(contract, functionName, args) {
    const callbackData = await getL2CallbackData(contract, functionName, args);
    const callbackId = callbackData.slice(0, 10);

    // Call the callback function on the contract to get the result
    const callbackResult = await contract.provider.call({
        to: await contract.resolvedAddress,
        data: callbackData
    });
    // Use the return type of the original ABI definition to decode the result.
    return contract.interface.decodeFunctionResult(functionName, callbackResult);
}

/**
 * Uses the l2 callback pattern to send a transaction to a contract
 * Arguments:
 *   contract: An ethers.js contract object for the contract to call.
 *   functionName: The name of the stub function to call.
 *   args: The arguments to the function to pass
 * Returns:
 *   A promise that evaluates to the submitted transaction hash.
 */
async function transactL2Function(contract, functionName, args) {
    const callbackData = await getL2CallbackData(contract, functionName, args);

    // Send a transaction with the callback data
    return contract.signer.sendTransaction({
        from: ethereum.selectedAddress,
        to: await contract.resolvedAddress,
        data: callbackData,
    });
}
