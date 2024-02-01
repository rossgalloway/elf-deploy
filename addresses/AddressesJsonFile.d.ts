export interface AddressesJsonFile {
  chainId: number
  addresses: {
    balancerVaultAddress: string
    trancheFactoryAddress: string
    wbtcAddress: string
    weightedPoolFactoryAddress: string
    convergentPoolFactoryAddress: {
      latestVersion: string
      v1: string
      v1_1: string
    }
    userProxyContractAddress: string
    wethAddress: string
    daiAddress: string
    usdcAddress: string
    eurscrvAddress: string
    stecrvAddress: string
    crv3cryptoAddress: string
    crvtricryptoAddress: string
    'lusd3crv-fAddress': string
    'alusd3crv-fAddress': string
    'mim-3lp3crv-fAddress': string
    'bb-a-usdAddress': string
  }
  safelist: string[]
}

export interface YieldForGoodAddresses {
  tokens: { [key: string]: string }
  interestTokenFactory: string
  dateStringLibrary: string
  trancheFactory: string
  tranches: Tranches
  userProxy: string
  vaults: Vaults
  wrappedPositions: WrappedPositions
}

interface Tranche {
  address: string
  expiration: number
  trancheFactory: string
}

interface Tranches {
  [key: string]: Tranche[]
}

interface Vaults {
  yearn: { [key: string]: string }
}

interface WrappedPositions {
  v1: {
    yearn: { [key: string]: string }
  }
}
