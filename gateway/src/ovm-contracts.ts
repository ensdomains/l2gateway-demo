import { Contract } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
// import { getContractInterface } from '@eth-optimism/contracts/build/src/contract-defs'
import { getContractInterface } from '@eth-optimism/contracts/dist/contract-defs'


const ZERO_ADDRESS = "0x" + "00".repeat(20);

export const loadContract = (
  name: string,
  address: string,
  provider: JsonRpcProvider
): Contract => {
  return new Contract(address, getContractInterface(name) as any, provider)
}

export const loadContractFromManager = async (
  name: string,
  Lib_AddressManager: Contract,
  provider: JsonRpcProvider
): Promise<Contract> => {
  console.log('****loadContractFromManager1', name)
  const address = await Lib_AddressManager.getAddress(name)
  console.log('****loadContractFromManager2', address)
  if (address === ZERO_ADDRESS) {
    throw new Error(
      `Lib_AddressManager does not have a record for a contract named: ${name}`
    )
  }

  return loadContract(name, address, provider)
}
