import {
  deployMockYearnVault,
  deployMockPermitToken
} from './deployer/deployer'
import { MockERC20Permit } from '../manual-typechain-files/MockERC20Permit'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import Logger from '../utils/logger'

import goerli from '../addresses/goerli.json'
import mainnet from '../addresses/mainnet.json'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import { TestERC20 } from 'typechain/TestERC20'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ContractTransaction } from 'ethers'
import { MockERC20YearnVault } from 'typechain/MockERC20YearnVault'

interface MockTokens {
  dai: TestERC20
  usdc: TestERC20
  weth: TestERC20
}

interface MockVaults {
  yvDAI: MockERC20YearnVault
  yvUSDC: MockERC20YearnVault
  yvWETH: MockERC20YearnVault
}

export async function deployMockERCTokens(
  addresses: YieldForGoodAddresses,
  signer: SignerWithAddress
): Promise<MockTokens> {
  console.log('deploying mock token contracts')
  console.log('deploying DAI...')
  const dai = await deployMockPermitToken(signer, 'Dai Stablecoin', 'DAI', 18)
  Logger.successfulDeploy('DAI Token', dai)

  console.log('deploying USDC...')
  const usdc = await deployMockPermitToken(signer, 'USD Coin', 'USDC', 6)
  Logger.successfulDeploy('USDC Token', usdc)

  console.log('deploying WETH...')
  const weth = await deployMockPermitToken(signer, 'Wrapped Ether', 'WETH', 18)
  Logger.successfulDeploy('WETH Token', weth)
  return { dai, usdc, weth }
}

export async function deployMockVaults(
  signer: SignerWithAddress,
  tokens: MockTokens
): Promise<MockVaults> {
  console.log('deploying mock yearn vaults')

  console.log('deploying yvDAI...')
  const yvDAI = await deployMockYearnVault(signer, tokens.dai.address)
  Logger.successfulDeploy('DAI Yearn Vault', yvDAI)

  console.log('deploying yvUSDC...')
  const yvUSDC = await deployMockYearnVault(signer, tokens.usdc.address)
  Logger.successfulDeploy('USDC Yearn Vault', yvUSDC)

  console.log('deploying yvWETH...')
  const yvWETH = await deployMockYearnVault(signer, tokens.weth.address)
  Logger.successfulDeploy('WETH Yearn Vault', yvWETH)

  return { yvDAI, yvUSDC, yvWETH }
}

export async function mintTokens(
  signer: SignerWithAddress,
  tokens: MockTokens,
  amounts: { dai: number; usdc: number; weth: number } = {
    dai: 1_000_000,
    usdc: 1_000_000,
    weth: 100_000
  }
) {
  // Mint tokens to signer
  console.log('minting tokens to signer')

  const gasPrice = readline.question('> Choose Mint gasPrice: ')

  const daiTX = await giveTokens(signer, tokens.usdc, amounts.dai, gasPrice)
  Logger.successfulMint('DAI', daiTX, amounts.dai)

  const usdcTX = await giveTokens(signer, tokens.dai, amounts.usdc, gasPrice)
  Logger.successfulMint('USDC', usdcTX, amounts.usdc)

  const wethTX = await giveTokens(signer, tokens.weth, amounts.weth, gasPrice)
  Logger.successfulMint('WETH', wethTX, amounts.weth)
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      const sepolia: YieldForGoodAddresses = _sepolia as any

      const mockERCs = await deployMockERCTokens(sepolia, signer)
      const mockVaults = await deployMockVaults(signer, mockERCs)
      await mintTokens(signer, mockERCs)

      console.log(
        "writing changed addresses to output file 'addresses/sepolia.json'"
      )

      sepolia.tokens.dai = mockERCs.dai.address
      sepolia.tokens.usdc = mockERCs.usdc.address
      sepolia.tokens.weth = mockERCs.weth.address
      sepolia.vaults.yearn.dai = mockVaults.yvDAI.address
      sepolia.vaults.yearn.usdc = mockVaults.yvUSDC.address
      sepolia.vaults.yearn.weth = mockVaults.yvWETH.address

      fs.writeFileSync(
        'addresses/sepolia.json',
        JSON.stringify(sepolia, null, '\t'),
        'utf8'
      )
      break
    }
    case 5: {
      console.log('no code for goerli deployment yet')
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
      console.log('no code for mainnet deployment yet')
      //TODO: add for whatever "mainnet" is used.
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

async function giveTokens(
  signer: SignerWithAddress,
  token: TestERC20,
  amount: number,
  gasPrice: string
): Promise<ContractTransaction> {
  const amountToMint = ethers.utils.parseUnits(
    amount.toString(),
    await token.decimals()
  )
  const txReceipt = await token.mint(signer.address, amountToMint, {
    maxFeePerGas: ethers.utils.parseUnits(gasPrice, 'gwei')
  })
  return txReceipt
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
