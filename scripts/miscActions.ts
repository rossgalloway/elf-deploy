import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'
import { MockERC20YearnVault__factory } from 'typechain/factories/MockERC20YearnVault__factory'
import { TestERC20__factory } from 'typechain/factories/TestERC20__factory'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestERC20 } from 'typechain/TestERC20'
import { sleep, validateAddresses } from '../utils/misc'

/////////// Vault Interactions /////////////

async function maxApproveVaultToSpendToken(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  signer: SignerWithAddress
) {
  //TODO: failure check
  console.log(`approving ${tokenName} vault to spend token...`)
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
  console.log('Transaction has been Broadcasted... ', approveTX.hash)
  await approveTX.wait(1)
  console.log('Transaction confirmed!')
  return { tokenName, tokenContract }
}

async function depositIntoVault(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  approvedTokenContract: TestERC20,
  signer: SignerWithAddress
) {
  //TODO: failure check
  console.log(`depositing into ${tokenName} vault`)
  const vaultAddress = addresses.vaults.yearn[tokenName]
  const VaultContract = MockERC20YearnVault__factory.connect(
    vaultAddress,
    signer
  )
  const decimals = await approvedTokenContract.decimals()
  const amount = readline.question('deposit amount: ')
  const gas = readline.question('gasPrice: ')
  const depositAmount = ethers.utils.parseUnits(amount, decimals)
  const depositTX = await VaultContract.deposit(depositAmount, signer.address, {
    maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Transaction has been Broadcasted... ', depositTX.hash)
  await depositTX.wait(1)
  console.log('Transaction confirmed!')
}

async function donateYieldToVault(
  addresses: YieldForGoodAddresses,
  tokenName: string,
  approvedTokenContract: TestERC20,
  signer: SignerWithAddress
) {
  //must call approval function first
  console.log(`donating yield into ${tokenName} yearn vault`)
  const vaultAddress = addresses.vaults.yearn[tokenName]
  const vaultContract = MockERC20YearnVault__factory.connect(
    vaultAddress,
    signer
  )
  const decimals = await approvedTokenContract.decimals()
  const amount = readline.question('donation amount: ')
  const gas = readline.question('gasPrice: ')
  const donationAmount = ethers.utils.parseUnits(amount, decimals)
  const donationTx = await vaultContract.report(donationAmount, {
    maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Transaction has been Broadcasted... ', donationTx.hash)
  await donationTx.wait(1)
  console.log('Transaction confirmed!')
}

/////////// Token Interactions /////////////

async function sendERC20Tokens(
  addresses: YieldForGoodAddresses,
  recipient: string,
  amount: string,
  signer: SignerWithAddress
) {
  validateAddresses([recipient])
  console.log('creating token transfer...')
  const tokens = addresses.tokens
  let tokenOptions = Object.keys(tokens)
  // query for which token to deposit
  const tokenIndex = readline.keyInSelect(
    tokenOptions,
    'Which token do you want to select?'
  )
  const tokenSymbol = tokenOptions[tokenIndex]
  console.log(tokenSymbol)
  const tokenAddress = addresses.tokens[tokenSymbol]
  console.log(tokenAddress)
  const tokenContract = TestERC20__factory.connect(tokenAddress, signer)
  console.log(tokenContract.address)
  const decimals = await tokenContract.decimals()
  const sendAmount = ethers.utils.parseUnits(amount, decimals)

  console.log(
    `sending\n amount: ${amount}(${sendAmount})\n asset: ${tokenSymbol}\n recipient: ${recipient}`
  )
  const gas = readline.question('enter gasPrice: ')
  const sendTX = await tokenContract.transfer(recipient, sendAmount, {
    maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Transaction Broadcasted... ', sendTX.hash)
  await sendTX.wait(1)
  console.log('Transaction confirmed!')
}

async function ethTransfer(
  recipient: string,
  amount: string,
  signer: SignerWithAddress
) {
  validateAddresses([recipient])
  const gas = readline.question('enter gasPrice: ')
  const sendTX = await signer.sendTransaction({
    to: recipient,
    value: ethers.utils.parseEther(amount),
    gasPrice: ethers.utils.parseUnits(gas, 'gwei')
  })
  console.log('Transaction Broadcasted... ', sendTX.hash)
  await sendTX.wait(1)
  console.log('Transaction confirmed!')
}

async function main() {
  // const provider = ethers.providers.getDefaultProvider('sepolia')
  const [signer] = await ethers.getSigners()
  if (signer.provider === undefined) {
    console.log('Error: no provider found')
    return
  }
  const network = await signer.provider.getNetwork()
  let addresses: YieldForGoodAddresses = _sepolia as any

  // await sendERC20Tokens(
  //   addresses,
  //   '0x7a3aEcD4EC6bFc75cbF78242FfBeCff4C0c4d557',
  //   '1000',
  //   signer
  // )

  const tokenSymbol = 'weth'
  const { tokenName, tokenContract } = await maxApproveVaultToSpendToken(
    addresses,
    tokenSymbol,
    signer
  )
  // await depositIntoVault(addresses, tokenName, tokenContract, signer)
  // //wait 1 minute
  // console.log('waiting 1 minute to donate yield to vault...')
  // await sleep(60000)
  await donateYieldToVault(addresses, tokenSymbol, tokenContract, signer)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
