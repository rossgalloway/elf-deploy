import {
  UserProxyData,
  WrappedPositionData,
  TrancheData,
  deployTranche,
  deployUserProxy,
  deployWrappedPosition
} from './deployer/deployer'
import { fetchPermitData, PermitCallData } from './fetchPermitData'
import {
  UserProxy,
  UserProxy__factory,
  ERC20Permit__factory,
  ERC20Permit,
  Tranche,
  Tranche__factory,
  InterestToken,
  InterestToken__factory
} from 'typechain'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'
import fs from 'fs'
import data from '../artifacts/contracts/Tranche.sol/Tranche.json'

import goerli from '../addresses/goerli.json'
import mainnet from '../addresses/mainnet.json'
import { parseUnits } from 'ethers/lib/utils'
import { BigNumber, CallOverrides, Contract } from 'ethers'

async function ApproveTokens(addresses: any) {
  // approve the proxy contract to spend the base asset on behalf of the signer.
  // In this case, WETH
}

async function MintTokens(addresses: any) {
  const [signer] = await ethers.getSigners()
  //make call to user proxy to mint tokens
  // get user proxy address from addresses.json
  //    - addresses.userProxy
  const tokenAddress = addresses.tokens.weth
  const tokenContract = ERC20Permit__factory.connect(tokenAddress, signer)
  const tokenName = await tokenContract.name()
  // assumed signer and account are the same
  // create and connect to userProxy
  const userProxyContract = UserProxy__factory.connect(
    addresses.userProxy,
    signer
  )
  const baseAssetAmount = '1'
  const baseAssetContract = tokenContract
  const baseAssetAddress = baseAssetContract.address
  const baseAssetDecimals = await baseAssetContract.decimals()
  const amountInBigNumber = parseUnits(
    baseAssetAmount || '0',
    baseAssetDecimals
  )
  const yieldTokenAddress = addresses.tokens.yieldToken
  const yieldTokenContract = InterestToken__factory.connect(
    yieldTokenAddress,
    signer
  )
  const yieldTokenDecimals = await yieldTokenContract.decimals()
  const principalTokenAddress = addresses.tokens.principalToken
  const principalTokenContract = Tranche__factory.connect(
    principalTokenAddress,
    signer
  )
  const principalTokenDecimals = await principalTokenAddress.decimals()
  const principalTokenExpiry = await principalTokenContract.unlockTimestamp()
  const spenderAddr = userProxyContract.address

  // if there is already an approval, dont submit permit?
  // check approval for proxy to spend asset
  // confirm approved amount > amount to mint
  // if approved, can I just submit an empty array into the permit field?
  // if not, submit permit

  // once approved, get PermitCallData

  const nonceBN = await baseAssetContract.nonces(signer.address)
  const nonce = nonceBN.toNumber()

  // version is 1 for all ERC20Permit except USDC which is 2
  const version = getPermitVersion(tokenContract.address)
  let permitCallData
  try {
    permitCallData = await fetchPermitData(
      signer,
      tokenContract,
      tokenName,
      signer.address,
      spenderAddr,
      nonce,
      version
    )
    if (permitCallData) {
      return permitCallData
    }
  } catch (error) {}

  const mintCallArgs = makeMintCallArgs(
    amountInBigNumber,
    baseAssetAddress,
    unlockTimestamp, // expiration
    position, //YVaultAssetProxy
    permitCallData
  )
}

// USDC is normally uses version '2'.  In development and goerli we are using a simple ERC20 for our USDC
// contract so we keep it at verion '1'.
export function getPermitVersion(tokenAddress: string): string {
  const { usdcAddress } = ContractAddresses
  const { chainId } = AddressesJson
  if (chainId !== ChainId.MAINNET) {
    return '1'
  }

  const version = tokenAddress === usdcAddress ? '2' : '1'
  return version
}

/**
 * Gets a type for the methods available on a given contract
 */
export type ContractMethodName<TContract extends Contract> =
  keyof TContract['functions']
/**
 * Gets a type for the specific contract call
 */
export type ContractFunctionCall<
  TContract extends Contract,
  TMethodName extends ContractMethodName<TContract>
> = TContract['functions'][TMethodName]
/**
 * Gets a type for 'callStatic' contract call
 */
export type StaticContractCall<
  TContract extends Contract,
  TMethodName extends ContractMethodName<TContract>
> = TContract['callStatic'][TMethodName]
/**
 * Gets a type for the call arguments of a given contract and method name
 */
export type ContractMethodArgs<
  TContract extends Contract,
  TMethodName extends ContractMethodName<TContract>
> = Parameters<ContractFunctionCall<TContract, TMethodName>>

export type StaticContractMethodArgs<
  TContract extends Contract,
  TMethodName extends ContractMethodName<TContract>
> = Parameters<StaticContractCall<TContract, TMethodName>>

export function makeMintCallArgs(
  amount: BigNumber,
  baseAssetAddress: string,
  trancheUnlockTimestamp: number,
  positionAddress: string,
  permitCallData: PermitCallData[]
): StaticContractMethodArgs<UserProxy, 'mint'> | undefined {
  if (
    !amount?.gt(0) ||
    !baseAssetAddress ||
    !trancheUnlockTimestamp ||
    !positionAddress
  ) {
    return undefined
  }

  const ethValueOverride = getMintOverrides(baseAssetAddress, amount)

  const callArgs: ContractMethodArgs<UserProxy, 'mint'> = [
    amount,
    baseAssetAddress,
    trancheUnlockTimestamp,
    positionAddress,
    permitCallData
  ]
  if (ethValueOverride) {
    callArgs.push(ethValueOverride)
  }

  return callArgs
}
function getMintOverrides(
  baseAssetAddress: string,
  amount: BigNumber
): CallOverrides | undefined {
  // Don't send any eth in this transaction if the base asset is a different token.
  if (baseAssetAddress === USER_PROXY_ETH_SENTINEL) {
    return { value: amount }
  }
}
