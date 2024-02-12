import { utils } from 'ethers'

export function validateAddresses(addresses: string[]): void | never {
  addresses.forEach((address) => {
    const isAddress = utils.isAddress(address)
    if (!isAddress) {
      throw new Error(`Invalid parameter ${address} is not a valid address!`)
    }
  })
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
