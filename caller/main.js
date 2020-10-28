window.ethereum.enable();
const provider = new ethers.providers.Web3Provider(window.ethereum);

// The ABI of our token contract.
const merkleABI = [
    // A normal everyday function
    "function balanceOf(address) view returns (uint)",
    // These 'imaginary functions' do not exist with the specified return type; instead, there is a stub
    // function with the specified name and parameters which returns (bytes prefix, string url), and a
    // transformer function that has the specified return type. Together, these form a composite 'l2 function'.
    "function claimableBalance(address) view returns(uint)",
    "function claim(address) view returns(uint)",
]
const merkleAddress = "0xCfEB869F69431e42cdB54A4F4f105C19C080A601";
const merkleToken = new ethers.Contract(merkleAddress, merkleABI, provider.getSigner());

ethereum.on('accountsChanged', (accounts) => {
    if(accounts.length == 0) return;
    update(accounts[0]);
});

// Update the balances in the UI
async function update(account) {
    const balanceElement = document.getElementById("balance");
    const balance = await merkleToken.balanceOf(account);
    balanceElement.innerText = balance / 1e18;

    const claimableElement = document.getElementById("claimable");
    const claimable = await callL2Function(merkleToken, "claimableBalance", [account]);
    claimableElement.innerText = claimable / 1e18;
}

// Send a claim transaction
async function claim() {
    const tx = await transactL2Function(merkleToken, "claim", [ethereum.selectedAddress]);
    await provider.waitForTransaction(tx.hash);
    update(ethereum.selectedAddress);
}