import { ethers } from 'hardhat'
import { ContractTransaction } from 'ethers'
import { TestERC20, TestERC20__factory } from 'typechain'
import * as readline from 'readline-sync'
import Logger from '../utils/logger'

import sepolia from '../addresses/sepolia.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

async function main() {
  const [signer] = await ethers.getSigners()
  const gasPrice = readline.question('> Choose gasPrice: ')

  const daiAddress = sepolia.tokens['dai']
  const daiMint = 1_000_000
  const usdcAddress = sepolia.tokens['usdc']
  const usdcMint = 1_000_000
  const wethAddress = sepolia.tokens['weth']
  const wethMint = 100_000

  // Mint tokens to signer
  console.log('minting tokens to signer')
  const daiTX = await giveTokens(signer, daiAddress, daiMint, gasPrice)
  Logger.successfulMint('DAI', daiTX, daiMint)
  const usdcTX = await giveTokens(signer, usdcAddress, usdcMint, gasPrice)
  Logger.successfulMint('USDC', usdcTX, usdcMint)
  const wethTX = await giveTokens(signer, wethAddress, wethMint, gasPrice)
  Logger.successfulMint('WETH', wethTX, wethMint)
}

async function giveTokens(
  signer: SignerWithAddress,
  tokenAddress: string,
  amount: number,
  gasPrice: string
): Promise<ContractTransaction> {
  const token = TestERC20__factory.connect(tokenAddress, signer)
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
