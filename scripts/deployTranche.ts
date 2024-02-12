import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import { deployTranche } from './deployer/deployer'
import hre from 'hardhat'

// Edit to import the correct version
import goerli from 'addresses/goerli.json'
import mainnet from 'addresses/mainnet.json'
import sepolia from 'addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import { Tranche__factory } from 'typechain/factories/Tranche__factory'
import { YVaultAssetProxy__factory } from 'typechain/factories/YVaultAssetProxy__factory'

async function deployWithAddresses(addresses: YieldForGoodAddresses) {
  if (addresses.trancheFactory == undefined) {
    console.log('Error: please init tranche factory')
    return
  }

  const version = 'v1'
  const wpType = 'yearn'
  const assetSymbol = readline.question('wp underlying symbol: ').toLowerCase()

  if (addresses.wrappedPositions[version][wpType][assetSymbol] == undefined) {
    console.log('Error: please init wp')
    return
  }

  // 900 is 15 minutes
  // 21600 is 6 hours
  // 86400 is 1 day
  const duration = Number.parseInt(readline.question('duration unix seconds: '))
  //TODO: create registry of donation addresses for each recipient
  const donationAddress = '0x34891B08F7B2F427f8ee690ac083DdE27F11C308'

  const data = await deployTranche({
    wrappedPosition: addresses.wrappedPositions[version][wpType][assetSymbol],
    expirations: [duration],
    trancheFactory: addresses.trancheFactory,
    donationAddress: donationAddress
  })

  // create new array if it doesn't exist
  if (addresses.tranches[assetSymbol] == undefined) {
    addresses.tranches[assetSymbol] = []
  }

  addresses.tranches[assetSymbol].push({
    expiration: data[0].trancheExpirations[0],
    address: data[0].trancheAddresses[0],
    trancheFactory: addresses.trancheFactory,
    donationAddress: donationAddress
  })

  // We auto verify on etherscan
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  const networkName = network?.name

  console.log('\nwaiting to verify tranche')
  await sleep(60000)

  // Verify the tranche
  await hre.run('verify:verify', {
    network: networkName,
    address: data[0].trancheAddresses[0],
    constructorArguments: []
  })

  // Load the data to verify the interest token
  const trancheFactory = new Tranche__factory(signer)
  const tranche = trancheFactory.attach(data[0].trancheAddresses[0])
  const ytAddress = await tranche.interestToken()
  const wpFactory = new YVaultAssetProxy__factory(signer)
  const wp = wpFactory.attach(
    addresses.wrappedPositions[version][wpType][assetSymbol]
  )
  const wpSymbol = await wp.symbol()

  // Verify the interest token
  await hre.run('verify:verify', {
    network: networkName,
    address: ytAddress,
    constructorArguments: [
      tranche.address,
      wpSymbol,
      data[0].trancheExpirations[0],
      await tranche.decimals()
    ]
  })

  return addresses
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const result = await deployWithAddresses(sepolia)
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
      // const result = await deployWithAddresses(goerli)
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
      // const result = await deployWithAddresses(mainnet)
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
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
