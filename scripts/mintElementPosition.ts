import {
  fetchPermitData,
  getPermitVersion,
  PermitCallData
} from '../utils/fetchPermitData'
import { UserProxy__factory } from 'typechain/factories/UserProxy__factory'
import { ERC20Permit__factory } from 'typechain/factories/ERC20Permit__factory'
import { makeMintCallArgs } from '../utils/minting'
import { ethers } from 'hardhat'
import * as readline from 'readline-sync'

import _sepolia from '../addresses/sepolia.json'
import { YieldForGoodAddresses } from 'addresses/AddressesJsonFile'

async function ApproveTokens(addresses: YieldForGoodAddresses) {
  // approve the proxy contract to spend the base asset on behalf of the signer.
  // In this case, WETH
}

export async function mintElementPosition(addresses: YieldForGoodAddresses) {
  const [signer] = await ethers.getSigners()
  if (signer.provider === undefined) {
    console.log('Error: no provider found')
    return
  }
  const network = await signer.provider.getNetwork()

  // create and connect to userProxy
  const userProxyContract = UserProxy__factory.connect(
    addresses.userProxy,
    signer
  )
  const spenderAddr = userProxyContract.address

  const wrappedPositions = addresses.wrappedPositions.v1.yearn
  const tokenOptions = Object.keys(wrappedPositions)
  // query for which token to deposit
  const tokenIndex = readline.keyInSelect(
    tokenOptions,
    'Which token do you want to select?'
  )
  const tokenSymbol = tokenOptions[tokenIndex]
  const tokenAddress = addresses.tokens[tokenSymbol]
  const tokenContract = ERC20Permit__factory.connect(tokenAddress, signer)
  const tokenName = await tokenContract.name()
  const nonceBN = await tokenContract.nonces(signer.address)
  const nonce = nonceBN.toNumber()

  // check to confirm there is a tranche for the selected token
  const tranches = addresses.tranches
  if (!Object.keys(tranches).includes(tokenSymbol)) {
    console.log('Error: no tranches for selected token.')
    return
  }
  const selectedAssetTranches = tranches[tokenSymbol]
  const selectedAssetTrancheTimestamps = selectedAssetTranches.map(
    (tranche) => tranche.expiration
  )
  // console.log('tranches: ', tranches)
  const currentUnixTime = Math.floor(Date.now() / 1000)
  //check if there are tranches that have not expired
  const activeTranches = selectedAssetTrancheTimestamps.filter(
    (timestamp) => timestamp > currentUnixTime
  )
  if (activeTranches.length === 0) {
    console.log('Error: no active tranches for selected token')
    return
  }
  const wrappedPositionAddress =
    addresses.wrappedPositions.v1.yearn[tokenSymbol]
  if (wrappedPositionAddress === undefined) {
    console.error('Error: no wrapped Position found for selected token')
    return
  }

  const permitVersion = getPermitVersion(tokenContract.address, network.chainId)
  console.log(`token selected: ${tokenSymbol} (${tokenAddress})`)

  //prompt to select tranche expiry
  const dateOptions = activeTranches.map((unixTime) =>
    new Date(unixTime * 1000).toLocaleString()
  )
  const timestampIndex = readline.keyInSelect(
    dateOptions,
    'Select a tranche to deposit into'
  )
  const selectedExpiration = activeTranches[timestampIndex]
  console.log('Selected Unix time:', selectedExpiration)

  //query for how much to deposit
  const amount = readline.question(
    `how much ${tokenSymbol} do you want to deposit?: `
  )
  const formattedAmount = ethers.utils.parseUnits(
    amount,
    await tokenContract.decimals()
  )

  console.log('fetching permit data...')
  // let permitCallData: PermitCallData | undefined
  // try {
  const permitCallData = await fetchPermitData(
    signer,
    tokenContract,
    tokenName,
    signer.address,
    spenderAddr,
    nonce,
    permitVersion
  )
  //   if (permitCallData) {
  //     return permitCallData
  //   }
  // } catch (error) {}

  if (!permitCallData) {
    console.log('Error: permit call data not found')
    return
  }
  const mintCallArgs = makeMintCallArgs(
    formattedAmount,
    tokenAddress,
    selectedExpiration, // expiration
    wrappedPositionAddress, //YVaultAssetProxy
    [permitCallData]
  )

  // I eventually need to call mint on the userProxy contract
  if (mintCallArgs === undefined) {
    console.error('Invalid mint call arguments')
    return
  }
  console.log('calling mint function on userProxy contract')
  const mintTX = await userProxyContract.mint(...mintCallArgs)
  await mintTX.wait(1)
  console.log('mint transaction complete')
  console.log(mintTX)
}

async function main() {
  const [signer] = await ethers.getSigners()
  const network = await signer.provider?.getNetwork()
  switch (network?.chainId) {
    case 11155111: {
      let sepolia: YieldForGoodAddresses = _sepolia as any
      await mintElementPosition(sepolia)
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
