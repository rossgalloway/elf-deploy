import { ERC20Permit } from '../typechain/ERC20Permit'
import {
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer'
import { BigNumberish, BytesLike, ethers, Signer } from 'ethers'

export interface PermitCallData {
  tokenContract: string
  who: string
  amount: BigNumberish
  expiration: BigNumberish
  r: BytesLike
  s: BytesLike
  v: BigNumberish
}

// Uses a default infinite permit expiration time
/**
 *
 * @param signer accepts a signer
 * @param token ERC20Permit TokenContract of the underlying asset
 * @param tokenName underlying asset token name
 * @param sourceAddr where the underlying assets are coming from (the signer)
 * @param spenderAddr the userProxy contract address
 * @param nonce underlying token nonce
 * @param version the permit version (typically '1' for most ERC20Permit tokens)
 * @returns
 */
export async function fetchPermitData(
  signer: Signer,
  token: ERC20Permit,
  tokenName: string,
  sourceAddr: string,
  spenderAddr: string,
  nonce: number,
  // '1' for every ERC20Permit.  Except USDC which is '2' ¯\_(ツ)_/¯
  version: string
): Promise<PermitCallData | undefined> {
  const typedSigner = signer as unknown as TypedDataSigner
  // don't use metdata, must match exactly

  // The following line is commented out due a bug in our token's PERMIT_HASH's.  Our tokens are
  // appending a datestring to the name after the PERMIT_HASH is created, which breaks permit calls.
  // After we fix this we can uncomment this line instead of passing in the name as an argument to
  // this function.
  // const name = await token.name();

  const chainId = await signer.getChainId()

  const domain: TypedDataDomain = {
    name: tokenName,
    version: version,
    chainId: chainId,
    verifyingContract: token.address
  }

  const types: Record<string, TypedDataField[]> = {
    Permit: [
      {
        name: 'owner',
        type: 'address'
      },
      {
        name: 'spender',
        type: 'address'
      },
      {
        name: 'value',
        type: 'uint256'
      },
      {
        name: 'nonce',
        type: 'uint256'
      },
      {
        name: 'deadline',
        type: 'uint256'
      }
    ]
  }

  if (nonce === undefined || chainId === undefined) {
    return
  }

  const data = {
    owner: sourceAddr,
    spender: spenderAddr,
    value: ethers.constants.MaxUint256,
    nonce: nonce,
    deadline: ethers.constants.MaxUint256
  }

  // _signTypedData is an experimental feature and is not on the type signature!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigString: string = await typedSigner._signTypedData(
    domain,
    types,
    data
  )

  const r = `0x${sigString.slice(2, 66)}`
  const s = `0x${sigString.slice(66, 130)}`
  const v = `0x${sigString.slice(130, 132)}`

  return {
    tokenContract: token.address,
    who: spenderAddr,
    amount: ethers.constants.MaxUint256,
    expiration: ethers.constants.MaxUint256,
    r,
    s,
    v
  }
}

// USDC is normally uses version '2'.  In development and goerli we are using a simple ERC20 for our USDC
// contract so we keep it at version '1'.
export function getPermitVersion(
  tokenAddress: string,
  network: number
): string {
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  if (network !== 1) {
    return '1'
  }

  const version = tokenAddress === usdcAddress ? '2' : '1'
  return version
}
