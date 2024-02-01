import { UserProxyData, deployUserProxy } from './deployer/deployer'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import data from '../artifacts/contracts/Tranche.sol/Tranche.json'

import goerli from '../addresses/goerli.json'
import mainnet from '../addresses/mainnet.json'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'

// An example of deploying a contract using the deployer. This deploys the user Proxy.
async function deployProxyWithAddresses(addresses: YieldForGoodAddresses) {
  const weth = addresses.tokens.weth
  const trancheFactory = addresses.trancheFactory
  const trancheBytecodeHash = ethers.utils.solidityKeccak256(
    ['bytes'],
    [data.bytecode]
  )

  const userProxyDeployData: UserProxyData = {
    weth,
    trancheFactory,
    trancheBytecodeHash
  }
  const proxyAddress = await deployUserProxy(userProxyDeployData)
  addresses.userProxy = proxyAddress

  return addresses
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const sepolia: YieldForGoodAddresses = _sepolia as any
      const result = await deployProxyWithAddresses(sepolia)
      console.log(
        "writing changed address to output file 'addresses/sepolia.json'"
      )
      fs.writeFileSync(
        'addresses/sepolia.json',
        JSON.stringify(result, null, '\t'),
        'utf8'
      )
      break
    }
    case 5: {
      console.log('goerli is deprecated')
      // const result = await deployProxyWithAddresses(goerli)
      // console.log(
      //   "writing changed address to output file 'addresses/goerli.json'"
      // )
      // fs.writeFileSync(
      //   'addresses/goerli.json',
      //   JSON.stringify(result, null, '\t'),
      //   'utf8'
      // )
      break
    }
    case 1: {
      console.log('no code for mainnet yet')
      // const result = await deployProxyWithAddresses(mainnet)
      // console.log(
      //   "writing changed address to output file 'addresses/mainnet.json'"
      // )
      // fs.writeFileSync(
      //   'addresses/mainnet.json',
      //   JSON.stringify(result, null, '\t'),
      //   'utf8'
      // )
      break
    }
    default: {
      console.log('Unsupported network')
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
