import {
  deployFactories,
} from './deployer/deployer'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import data from '../artifacts/contracts/Tranche.sol/Tranche.json'

import goerli from '../addresses/goerli.json'
import mainnet from '../addresses/mainnet.json'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const sepolia: YieldForGoodAddresses = _sepolia as any
      const { trancheFactory, dateLib, interestTokenFactory } =
        await deployFactories()

      console.log(
        "writing changed address to output file 'addresses/sepolia.json'"
      )
      sepolia.interestTokenFactory = interestTokenFactory
      sepolia.dateStringLibrary = dateLib
      sepolia.trancheFactory = trancheFactory

      fs.writeFileSync(
        'addresses/sepolia.json',
        JSON.stringify(sepolia, null, '\t'),
        'utf8'
      )
      break
    }
    case 5: {
      // goerli is deprecated
      console.log('goerli is deprecated')
      // const result = await deployFactories()
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
      // const result = await deployFactories()
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
