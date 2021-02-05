import { Tranche, Elf } from "../typechain/";
import hre from "hardhat";

export async function deployTranche(elfContract: Elf) {
  const TrancheDeployer = await hre.ethers.getContractFactory("Tranche");
  const trancheContract = (await TrancheDeployer.deploy(
    elfContract.address,
    86400 // time length of tranche in seconds
  )) as Tranche;

  console.log("Tranche deployed to:", trancheContract.address);
  return trancheContract;
}
