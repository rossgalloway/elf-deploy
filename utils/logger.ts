import { Contract, ContractTransaction } from 'ethers'
import * as c from 'ansi-colors'

const Logger = {
  deployContract(name?: string): void {
    console.log(c.bold(`Deploying ${name} contract...`))
    console.log('\n')
  },

  successfulDeploy(name?: string, contract?: Contract): void {
    console.log(c.greenBright(`Successfully deployed ${name} contract! 🎉`))
  },

  successfulMint(
    name?: string,
    tx?: ContractTransaction,
    amount?: number
  ): void {
    console.log(
      c.greenBright(`Successfully minted ${amount} ${name} tokens! 🎉`)
    )
    console.log(c.bold(`Transaction hash: ${tx?.hash}`))
  }
}

export default Logger
