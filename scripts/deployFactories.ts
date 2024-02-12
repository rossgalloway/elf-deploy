import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import * as readline from 'readline-sync'
import fs from 'fs'

import { TrancheFactory__factory } from '../typechain/factories/TrancheFactory__factory'
import { TrancheFactory } from 'typechain/TrancheFactory'
import { InterestTokenFactory__factory } from '../typechain/factories/InterestTokenFactory__factory'
import { InterestTokenFactory } from 'typechain/InterestTokenFactory'
import { DateString__factory } from '../typechain/factories/DateString__factory'
import { DateString } from 'typechain/DateString'

import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import Logger from '../utils/logger'
import { sleep } from '../utils/misc'

export async function deployInterestTokenFactory(signer: SignerWithAddress) {
  const interestTokenFactoryFactory = new InterestTokenFactory__factory(signer)
  const ytFactoryGas = readline.question('yt factory gasPrice: ')
  Logger.deployContract('Interest Token Factory')
  const interestTokenFactory = await interestTokenFactoryFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(ytFactoryGas, 'gwei')
  })
  await interestTokenFactory.deployed()
  Logger.successfulDeploy('Interest Token Factory', interestTokenFactory)
  console.log('Address: ', interestTokenFactory.address)

  return interestTokenFactory
}

export async function deployDateLibFactory(signer: SignerWithAddress) {
  //get datestring lib

  const dateLibFactory = new DateString__factory(signer)
  const dateLibGas = readline.question('datelib gasPrice: ')
  Logger.deployContract('Date Library')
  const dateLib = await dateLibFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(dateLibGas, 'gwei')
  })
  await dateLib.deployed()
  Logger.successfulDeploy('Date Library', dateLib)
  console.log('Address: ', dateLib.address)
  return dateLib
}

// Deploy the tranche factory
export async function deployTrancheFactory(
  signer: SignerWithAddress,
  interestTokenFactoryAddress: string,
  dateLibAddress: string
) {
  const trancheFactoryFactory = new TrancheFactory__factory(signer)
  const trancheFactoryGas = readline.question('tranche factory gasPrice: ')
  Logger.deployContract('Tranche Factory')
  const trancheFactory = await trancheFactoryFactory.deploy(
    interestTokenFactoryAddress,
    dateLibAddress,
    {
      maxFeePerGas: ethers.utils.parseUnits(trancheFactoryGas, 'gwei')
    }
  )
  await trancheFactory.deployed()
  Logger.successfulDeploy('Tranche Factory', trancheFactory)
  console.log('Address: ', trancheFactory.address)

  return trancheFactory
}

async function verifyInterestTokenFactory(
  network: string,
  interestTokenFactoryAddress: string
) {
  // make sure you wait 1 min before verifying
  await hre.run('verify:verify', {
    network: network,
    address: interestTokenFactoryAddress,
    constructorArguments: []
  })
}

async function verifyDateLib(network: string, dateLibAddress: string) {
  // make sure you wait 1 min before verifying
  await hre.run('verify:verify', {
    network: network,
    address: dateLibAddress,
    constructorArguments: []
  })
}

async function verifyTrancheFactory(
  network: string,
  trancheFactoryAddress: string,
  interestTokenFactoryAddress: string,
  dateLibAddress: string
) {
  // make sure you wait 1 min before verifying
  await hre.run('verify:verify', {
    network: network,
    address: trancheFactoryAddress,
    constructorArguments: [interestTokenFactoryAddress, dateLibAddress]
  })

  return {
    trancheFactory: trancheFactoryAddress,
    interestTokenFactory: interestTokenFactoryAddress,
    dateLib: dateLibAddress
  }
}

async function main() {
  const [signer] = await ethers.getSigners()
  if (signer.provider === undefined) {
    console.log('Error: no provider found')
    return
  }
  const network = await signer.provider.getNetwork()
  const networkName = network.name
  switch (network?.chainId) {
    case 11155111: {
      console.log(`Running factory deployment script on ${networkName}`)
      const sepolia: YieldForGoodAddresses = _sepolia as any
      const interestTokenFactoryAddress = sepolia.interestTokenFactory
      const dateLibAddress = sepolia.dateStringLibrary

      // run deployments here
      // const interestTokenFactory = await deployInterestTokenFactory(signer)
      // const interestTokenFactoryAddress = interestTokenFactory.address
      // const dateLib = await deployDateLibFactory(signer)
      // const dateLibAddress = dateLib.address
      const trancheFactory = await deployTrancheFactory(
        signer,
        interestTokenFactoryAddress,
        dateLibAddress
      )
      const trancheFactoryAddress = trancheFactory.address

      // verify here after waiting 1 min
      console.log('\nwaiting 1 min before verifying deployments')
      await sleep(60000)

      // await verifyInterestTokenFactory(networkName, interestTokenFactoryAddress)
      // await verifyDateLib(networkName, dateLibAddress)
      await verifyTrancheFactory(
        networkName,
        trancheFactoryAddress,
        interestTokenFactoryAddress,
        dateLibAddress
      )

      //write new addresses to file
      console.log(
        "writing changed address to output file 'addresses/sepolia.json'"
      )
      // sepolia.interestTokenFactory = interestTokenFactoryAddress
      // sepolia.dateStringLibrary = dateLibAddress
      sepolia.trancheFactory = trancheFactoryAddress

      fs.writeFileSync(
        'addresses/sepolia.json',
        JSON.stringify(sepolia, null, '\t'),
        'utf8'
      )
      break
    }
    case 5: {
      console.log('goerli is deprecated')
      break
    }
    case 1: {
      console.log('no code for mainnet yet')
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
