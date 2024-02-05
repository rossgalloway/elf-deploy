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
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 7500
          }
        }
      }
    ]
  },
  mocha: { timeout: 0 },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`,
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
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`,
      accounts: [`0x${MAINNET_DEPLOYER_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
}

export default config
