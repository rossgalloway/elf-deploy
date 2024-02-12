import { UserProxy__factory } from '../typechain/factories/UserProxy__factory'
import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import * as readline from 'readline-sync'
import fs from 'fs'
import data from '../artifacts/contracts/Tranche.sol/Tranche.json'

import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import Logger from '../utils/logger'
import { sleep } from '../utils/misc'

export interface UserProxyData {
  weth: string // weth address
  trancheFactory: string // tranche factory address
  trancheBytecodeHash: string // hash of the Tranche bytecode.
}

/**
 * deploys a user proxy contract that takes in the weth address, tranche factory address, and tranche bytecode hash
 * @param deploymentData
 * @returns the address of the UserProxy contract
 */
export async function deployUserProxy(
  signer: SignerWithAddress,
  deploymentData: UserProxyData
) {
  const proxyFactory = new UserProxy__factory(signer)
  const gas = readline.question('user proxy gasPrice: ')
  Logger.deployContract('User Proxy')
  const proxy = await proxyFactory.deploy(
    deploymentData.weth,
    deploymentData.trancheFactory,
    deploymentData.trancheBytecodeHash,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
    }
  )
  await proxy.deployed()
  Logger.successfulDeploy('User Proxy', proxy)
  console.log('Address: ', proxy.address)

  console.log('\nwaiting 1 min to verify user Proxy contract')
  await sleep(60000)

  const network = await signer.provider?.getNetwork()
  await hre.run('verify:verify', {
    network: network?.name,
    address: proxy.address,
    constructorArguments: [
      deploymentData.weth,
      deploymentData.trancheFactory,
      deploymentData.trancheBytecodeHash
    ]
  })

  return proxy.address
}

// unused. bring back with multiple deployment networks
async function deployProxyWithAddresses(addresses: YieldForGoodAddresses) {
  const [signer] = await ethers.getSigners()
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
  const proxyAddress = await deployUserProxy(signer, userProxyDeployData)
  return proxyAddress
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const sepolia: YieldForGoodAddresses = _sepolia as any
      console.log(`Deploying UserProxy contract on ${network.name}...`)
      const weth = sepolia.tokens.weth
      const trancheFactory = sepolia.trancheFactory
      const trancheBytecodeHash = ethers.utils.solidityKeccak256(
        ['bytes'],
        [data.bytecode]
      )

      const userProxyDeployData: UserProxyData = {
        weth,
        trancheFactory,
        trancheBytecodeHash
      }
      const proxyAddress = await deployUserProxy(signer, userProxyDeployData)
      sepolia.userProxy = proxyAddress

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
