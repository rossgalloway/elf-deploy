import { ethers } from 'hardhat'
import { BigNumberish, providers, Signer, utils } from 'ethers'
import hre from 'hardhat'
// Smart contract imports
import { TrancheFactory__factory } from '../../typechain/factories/TrancheFactory__factory'
import { InterestTokenFactory__factory } from '../../typechain/factories/InterestTokenFactory__factory'
import { YVaultAssetProxy__factory } from '../../typechain/factories/YVaultAssetProxy__factory'
import { DateString__factory } from '../../typechain/factories/DateString__factory'
import { UserProxy__factory } from '../../typechain/factories/UserProxy__factory'
import { MockERC20YearnVault__factory } from '../../typechain/factories/MockERC20YearnVault__factory'
import { MockERC20YearnVault } from '../../typechain/MockERC20YearnVault'
import { TestERC20 } from 'typechain/TestERC20'
import { TestERC20__factory } from 'typechain/factories/TestERC20__factory'
import * as readline from 'readline-sync'
import Logger from '../../utils/logger'

const provider = ethers.providers.getDefaultProvider('sepolia')

export interface UserProxyData {
  weth: string // weth address
  trancheFactory: string // tranche factory address
  trancheBytecodeHash: string // hash of the Tranche bytecode.
}

export interface WrappedPositionData {
  name: string // name - ie 'element yvUSDC'
  symbol: string // token symbol - ie 'yvUSDC' since the vault doesn't return a token
  underlying: string // underlying token address - ie USDC address
  vault: string // yearn vault address
  version: string
}

export interface TrancheData {
  wrappedPosition: string // Address of the Wrapped Position contract the tranche will use
  expirations: number[] // tranche lengths
  trancheFactory: string // Address of a tranche factory
}

// An interface to allow us to access the ethers log return
interface LogData {
  event: string
  data: unknown
}

// A partially extended interface for the post mining transaction receipt
interface PostExecutionTransactionReceipt extends providers.TransactionReceipt {
  events: LogData[]
}

/**
 * deploys a user proxy contract that takes in the weth address, tranche factory address, and tranche bytecode hash
 * @param deploymentData
 * @returns the address of the UserProxy contract
 */
export async function deployUserProxy(deploymentData: UserProxyData) {
  const [signer] = await ethers.getSigners()
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
    network: network?.name, //TODO: make this dynamic
    address: proxy.address,
    constructorArguments: [
      deploymentData.weth,
      deploymentData.trancheFactory,
      deploymentData.trancheBytecodeHash
    ]
  })

  return proxy.address
}

export async function deployFactories() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  let networkName
  switch (network?.chainId) {
    case 11155111: {
      networkName = 'sepolia'
      break
    }
    case 1: {
      networkName = 'mainnet'
      break
    }
    default: {
      console.log('Unsupported network')
    }
  }

  const interestTokenFactoryFactory = new InterestTokenFactory__factory(signer)
  const ytFactoryGas = readline.question('yt factory gasPrice: ')
  Logger.deployContract('Interest Token Factory')
  const interestTokenFactory = await interestTokenFactoryFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(ytFactoryGas, 'gwei')
  })
  await interestTokenFactory.deployed()
  Logger.successfulDeploy('Interest Token Factory', interestTokenFactory)
  console.log('Address: ', interestTokenFactory.address)

  console.log('\nwaiting 1 min to verify interest Token Factory')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: 'sepolia',
    address: interestTokenFactory.address,
    constructorArguments: []
  })

  //get datestring lib
  const trancheFactoryFactory = new TrancheFactory__factory(signer)
  const dateLibFactory = new DateString__factory(signer)
  const dateLibGas = readline.question('datelib gasPrice: ')
  Logger.deployContract('Date Library')
  const dateLib = await dateLibFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(dateLibGas, 'gwei')
  })
  await dateLib.deployed()
  Logger.successfulDeploy('Date Library', dateLib)
  console.log('Address: ', dateLib.address)

  console.log('\nwaiting 1 min to verify date library')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: 'sepolia',
    address: dateLib.address,
    constructorArguments: []
  })

  // Deploy the tranche factory
  const trancheFactoryGas = readline.question('tranche factory gasPrice: ')
  Logger.deployContract('Tranche Factory')
  const trancheFactory = await trancheFactoryFactory.deploy(
    interestTokenFactory.address,
    dateLib.address,
    {
      maxFeePerGas: ethers.utils.parseUnits(trancheFactoryGas, 'gwei')
    }
  )
  await trancheFactory.deployed()
  Logger.successfulDeploy('Tranche Factory', trancheFactory)
  console.log('Address: ', trancheFactory.address)

  console.log('\nwaiting 1 min to verify tranche factory')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: 'sepolia',
    address: trancheFactory.address,
    constructorArguments: [interestTokenFactory.address, dateLib.address]
  })

  return {
    trancheFactory: trancheFactory.address,
    interestTokenFactory: interestTokenFactory.address,
    dateLib: dateLib.address
  }
}

export async function deployWrappedPosition(
  deploymentData: WrappedPositionData
) {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()

  const yAssetWPFactory = new YVaultAssetProxy__factory(signer)

  // TODO: deal with governance and pausers for prod
  // const pauser = readline.question('pauser address: ')
  const pauser = signer.address
  // const governance = readline.question('governance address: ')
  const governance = signer.address
  const gas = readline.question('wrapped position gasPrice: ')
  Logger.deployContract('Wrapped Position')
  const wrappedPosition = await yAssetWPFactory.deploy(
    deploymentData.vault,
    deploymentData.underlying,
    deploymentData.name,
    deploymentData.symbol,
    governance,
    pauser,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
    }
  )
  await wrappedPosition.deployed()
  Logger.successfulDeploy('Wrapped Position', wrappedPosition)
  console.log('Address: ', wrappedPosition.address)

  console.log('\nwaiting 1 min to verify Wrapped Position contract')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: network?.name,
    address: wrappedPosition.address,
    constructorArguments: [
      deploymentData.vault,
      deploymentData.underlying,
      deploymentData.name,
      deploymentData.symbol,
      governance,
      pauser
    ]
  })
  return wrappedPosition.address
}

export async function deployTranche(deploymentData: TrancheData) {
  const [signer] = await ethers.getSigners()

  interface AssetDeployment {
    wrappedPositionAddress: string
    trancheAddresses: string[]
    trancheExpirations: number[]
  }

  const deploymentResult = {
    elfDeployments: [] as AssetDeployment[]
  }

  const trancheAddresses: string[] = []
  const trancheExpirations: number[] = []

  const trancheFactory = TrancheFactory__factory.connect(
    deploymentData.trancheFactory,
    signer
  )

  const blockNumber = await provider.getBlockNumber()
  const block = await provider.getBlock(blockNumber)
  const timestamp = block.timestamp

  for (let i = 0; i < deploymentData.expirations.length; i++) {
    let expiration = deploymentData.expirations[i]
    // Deploy the tranche for this timestamp
    const gas = readline.question('tranche gasPrice: ')

    Logger.deployContract('Tranche')
    const txReceipt = (await (
      await trancheFactory.deployTranche(
        expiration + timestamp,
        deploymentData.wrappedPosition,
        {
          maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
        }
      )
    ).wait(1)) as PostExecutionTransactionReceipt

    const returned = txReceipt.events.filter(
      (event) => event.event == 'TrancheCreated'
    )

    const trancheAddress = (returned[0] as any).args[0] as string
    trancheExpirations.push(expiration + timestamp)
    trancheAddresses.push(trancheAddress)

    console.log('Tranche', trancheAddress)
    console.log('Expiration', expiration + timestamp)
  }

  deploymentResult.elfDeployments.push({
    wrappedPositionAddress: deploymentData.wrappedPosition,
    trancheAddresses: trancheAddresses,
    trancheExpirations: trancheExpirations
  })

  return deploymentResult.elfDeployments
}

export async function deployMockPermitToken(
  signer: Signer,
  name: string,
  symbol: string,
  decimal: BigNumberish
): Promise<TestERC20> {
  const gasPrice = readline.question('token deploy gasPrice: ')
  const erc20Factory = new TestERC20__factory(signer)
  const mockERC20Permit = await erc20Factory.deploy(name, symbol, decimal, {
    maxFeePerGas: ethers.utils.parseUnits(gasPrice, 'gwei')
  })
  await mockERC20Permit.deployed()

  console.log('\nwaiting 1 min to verify Token Contract')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: 'sepolia',
    address: mockERC20Permit.address,
    constructorArguments: [name, symbol, decimal]
  })

  return mockERC20Permit
}

// Deploys a mock yearn vault
// The vault is based off of ERC-20, no ERC-4626
// for V3, A ERC-4626 adaptor should be created to wrap the vault
export async function deployMockYearnVault(
  signer: Signer,
  tokenAddress: string
): Promise<MockERC20YearnVault> {
  validateAddresses([tokenAddress])
  const gasPrice = readline.question('tranche factory gasPrice: ')
  const vaultFactory = new MockERC20YearnVault__factory(signer)
  const vault = await vaultFactory.deploy(tokenAddress, {
    maxFeePerGas: ethers.utils.parseUnits(gasPrice, 'gwei')
  })
  await vault.deployed()

  console.log('\nwaiting 1 min to verify Vault Contract')
  await sleep(60000)

  await hre.run('verify:verify', {
    network: 'sepolia',
    address: vault.address,
    constructorArguments: [tokenAddress]
  })

  return vault
}

function validateAddresses(addresses: string[]): void | never {
  addresses.forEach((address) => {
    const isAddress = utils.isAddress(address)
    if (!isAddress) {
      throw new Error(`Invalid parameter ${address} is not a valid address!`)
    }
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
