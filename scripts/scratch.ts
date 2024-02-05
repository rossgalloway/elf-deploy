import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import { MockERC20YearnVault__factory } from 'typechain/factories/MockERC20YearnVault__factory'
import { TestERC20__factory } from 'typechain/factories/TestERC20__factory'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestERC20 } from 'typechain/TestERC20'
import { sleep } from '@nomicfoundation/hardhat-verify/internal/utilities'

async function maxApproveVaultToSpendToken(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  signer: SignerWithAddress
) {
  //TODO: failure check
  const vaultAddress = addresses.vaults.yearn[tokenName]
  const tokenAddress = addresses.tokens[tokenName]
  const tokenContract = TestERC20__factory.connect(tokenAddress, signer)
  const gas = readline.question('gasPrice: ')
  const approveTX = await tokenContract.approve(
    vaultAddress,
    ethers.constants.MaxUint256,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
    }
  )
  console.log('Success! ', approveTX.hash)
  return { tokenName, tokenContract }
}

async function depositIntoVault(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  approvedTokenContract: TestERC20,
  signer: SignerWithAddress
) {
  //TODO: failure check
  const vaultAddress = addresses.vaults.yearn[tokenName]
  const VaultContract = MockERC20YearnVault__factory.connect(
    vaultAddress,
    signer
  )
  const decimals = await approvedTokenContract.decimals()
  console.log(`depositing into ${tokenName} vault`)
  const amount = readline.question('deposit amount: ')
  const gas = readline.question('gasPrice: ')
  const depositAmount = ethers.utils.parseUnits(amount, decimals)
  const depositTX = await VaultContract.deposit(depositAmount, signer.address, {
    maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Success! ', depositTX.hash)
}

async function donateYieldToVault(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  approvedTokenContract: TestERC20,
  signer: SignerWithAddress
) {
  //must call approval function first
  const vaultAddress = addresses.vaults.yearn[tokenName]
  const vaultContract = MockERC20YearnVault__factory.connect(
    vaultAddress,
    signer
  )
  const decimals = await approvedTokenContract.decimals()
  console.log(`donating yield into ${tokenName} yearn vault`)
  const amount = readline.question('donation amount: ')
  const gas = readline.question('gasPrice: ')
  const donationAmount = ethers.utils.parseUnits(amount, decimals)
  const donationTx = await vaultContract.report(donationAmount, {
    maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Success! ', donationTx.hash)
}

async function main() {
  const [signer] = await ethers.getSigners()
  if (signer.provider === undefined) {
    console.log('Error: no provider found')
    return
  }
  const network = await signer.provider.getNetwork()
  let addresses: YieldForGoodAddresses = _sepolia as any
  const { tokenName, tokenContract } = await maxApproveVaultToSpendToken(
    addresses,
    'usdc',
    signer
  )
  await depositIntoVault(addresses, tokenName, tokenContract, signer)
  //wait 1 minute
  await sleep(60000)
  await donateYieldToVault(addresses, 'usdc', tokenContract, signer)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
