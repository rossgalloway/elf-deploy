import '@nomiclabs/hardhat-waffle'
import 'hardhat-typechain'
import '@typechain/ethers-v5'
import 'solidity-coverage'
import 'dotenv/config'
import 'tsconfig-paths/register'
import '@nomicfoundation/hardhat-verify'

import { HardhatUserConfig } from 'hardhat/config'

const MAINNET_DEPLOYER_PRIVATE_KEY =
  process.env.MAINNET_DEPLOYER_PRIVATE_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000'

const GOERLI_DEPLOYER_PRIVATE_KEY =
  process.env.GOERLI_DEPLOYER_PRIVATE_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000'

const SEPOLIA_DEPLOYER_PRIVATE_KEY =
  process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000'

const config: HardhatUserConfig = {
  defaultNetwork: 'sepolia',
  solidity: {
    compilers: [
      {
        version: '0.7.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000
          }
        }
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 7500
          }
        }
      },
      {
        version: '0.8.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 7500
          }
        }
      },
      {
        version: '0.8.15',
        settings: {
          optimizer: {
            enabled: true,
            runs: 7500
          }
        }
      }
    ],
    overrides: {
      'contracts/balancer-core-v2/vault/Vault.sol': {
        version: '0.7.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 400
          }
        }
      },
      'contracts/balancer-core-v2/pools/weighted/WeightedPoolFactory.sol': {
        version: '0.7.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 800
          }
        }
      }
    }
  },
  mocha: { timeout: 0 },
  networks: {
    hardhat: {
      forking: {
        url: 'https://eth-mainnet.alchemyapi.io/v2/kwjMP-X-Vajdk1ItCfU-56Uaq1wwhamK',
        blockNumber: 11853372
      },
      accounts: {
        accountsBalance: '100000000000000000000000', // 100000 ETH
        count: 5
      }
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_SEPOLIA_API_KEY}`,
      accounts: [`0x${SEPOLIA_DEPLOYER_PRIVATE_KEY}`]
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_API_KEY}`,
      accounts: [`0x${GOERLI_DEPLOYER_PRIVATE_KEY}`]
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`,
      accounts: [`0x${MAINNET_DEPLOYER_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
}

export default config
