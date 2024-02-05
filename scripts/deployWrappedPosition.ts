import { WrappedPositionData, deployWrappedPosition } from './deployer/deployer'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import data from '../artifacts/contracts/Tranche.sol/Tranche.json'

import goerli from '../addresses/goerli.json'
import mainnet from '../addresses/mainnet.json'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'

// An example of deploying a contract using the deployer.
// preps for deployment of wrapped position
// returns the addresses object with the wrapped position address added
export async function deployV1WrappedYearnPosition(
  addresses: YieldForGoodAddresses,
  underlyingTokenSymbol: string
) {
  if (addresses.vaults.yearn[underlyingTokenSymbol] == undefined) {
    console.log('Error: please check yearn vault address')
    return
  } else if (addresses.tokens[underlyingTokenSymbol] == undefined) {
    console.log('Error: please check underlying token address')
    return
  }
  const underlyingTokenAddress = addresses.tokens[underlyingTokenSymbol]
  const vaultAddress = addresses.vaults.yearn[underlyingTokenSymbol]
  const wrapperSymbol = `yv${underlyingTokenSymbol.toUpperCase()}`
  const wrapperName = `element ${wrapperSymbol}`
  const version = 'v1'

  const wrappedPositionDeployData: WrappedPositionData = {
    name: wrapperName,
    symbol: wrapperSymbol,
    underlying: underlyingTokenAddress,
    vault: vaultAddress,
    version: version
  }
  console.log(`${wrapperName} deploy data: `, wrappedPositionDeployData)
  const wrappedPositionAddress = await deployWrappedPosition(
    wrappedPositionDeployData
  )

  return wrappedPositionAddress
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      let sepolia: YieldForGoodAddresses = _sepolia as any
      console.log('Deploying wrapped positions')
      const positionsToDeploy = ['dai', 'usdc', 'weth']
      for (const underlyingTokenSymbol of positionsToDeploy) {
        const result = await deployV1WrappedYearnPosition(
          sepolia,
          underlyingTokenSymbol
        )
        if (result === undefined) {
          console.error(
            'Error: deployWrappedPositionWithAddresses returned undefined'
          )
          return
        }
        sepolia.wrappedPositions.v1.yearn[underlyingTokenSymbol] = result
      }
      console.log(
        "writing changed address to output file 'addresses/sepolia.json'"
      )
      fs.writeFileSync(
        'addresses/sepolia.json',
        JSON.stringify(sepolia, null, '\t'),
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
