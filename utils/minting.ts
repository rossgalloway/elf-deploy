import { PermitCallData } from './fetchPermitData'
import { UserProxy } from '../typechain/UserProxy'
import { BigNumber, CallOverrides, Contract } from 'ethers'

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
  const USER_PROXY_ETH_SENTINEL = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  // Don't send any eth in this transaction if the base asset is a different token.
  if (baseAssetAddress === USER_PROXY_ETH_SENTINEL) {
    return { value: amount }
  }
}
