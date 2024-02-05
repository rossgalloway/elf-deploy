import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'

import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import {
  deployMockERCTokens,
  deployMockVaults,
  mintTokens
} from './deployMocks'
import { deployFactories } from './deployer/deployer'
import { deployV1WrappedYearnPosition } from './deployWrappedPosition'
import { deployProxyWithAddresses } from './deployUserProxy'

async function deployAll(addresses: YieldForGoodAddresses, signer: any) {
  //step 0 (optional) - deploy mock tokens and yearn vaults
  const deployMocks = readline.keyInYNStrict('Deploy mock tokens and vaults?')
  console.log(deployMocks)
  if (deployMocks === true) {
    const mockERCs = await deployMockERCTokens(addresses, signer)
    const mockVaults = await deployMockVaults(signer, mockERCs)
    await mintTokens(signer, mockERCs)

    // update addresses with mock addresses
    addresses.tokens.dai = mockERCs.dai.address
    addresses.tokens.usdc = mockERCs.usdc.address
    addresses.tokens.weth = mockERCs.weth.address
    addresses.vaults.yearn.dai = mockVaults.yvDAI.address
    addresses.vaults.yearn.usdc = mockVaults.yvUSDC.address
    addresses.vaults.yearn.weth = mockVaults.yvWETH.address
  }

  // step 1 - deploy factories
  const { trancheFactory, dateLib, interestTokenFactory } =
    await deployFactories()

  addresses.interestTokenFactory = interestTokenFactory
  addresses.dateStringLibrary = dateLib
  addresses.trancheFactory = trancheFactory

  // step 2 - Deploy YVaultAssetProxies
  const positionsToDeploy = ['dai', 'usdc', 'weth']
  for (const underlyingTokenSymbol of positionsToDeploy) {
    const wrappedPositionAddress = await deployV1WrappedYearnPosition(
      addresses,
      underlyingTokenSymbol
    )
    if (wrappedPositionAddress === undefined) {
      console.error(
        'Error: deployWrappedPositionWithAddresses returned undefined'
      )
      return
    }
    addresses.wrappedPositions.v1.yearn[underlyingTokenSymbol] =
      wrappedPositionAddress
  }

  // step 3 - create User Proxy
  const proxyAddress = await deployProxyWithAddresses(addresses)
  addresses.userProxy = proxyAddress

  console.log("writing changed address to output file 'addresses/sepolia.json'")

  fs.writeFileSync(
    'addresses/sepolia.json',
    JSON.stringify(addresses, null, '\t'),
    'utf8'
  )
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const sepolia: YieldForGoodAddresses = _sepolia as any
      await deployAll(sepolia, signer)
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
