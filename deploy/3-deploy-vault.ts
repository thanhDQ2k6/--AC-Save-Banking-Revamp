import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("");
  console.log("=".repeat(60));
  console.log("[3/4] Vault");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer);

  const mockUSDC = await get("MockUSDC");
  console.log("Token:   ", mockUSDC.address);

  const deployment = await deploy("Vault", {
    from: deployer,
    args: [mockUSDC.address],
    log: true,
    waitConfirmations: 1,
  });

  console.log("");
  console.log("Vault deployed:", deployment.address);

  // Grant LIQUIDITY_MANAGER_ROLE to deployer
  console.log("");
  console.log("Setting up roles...");
  const vault = await ethers.getContractAt("Vault", deployment.address);
  const LIQUIDITY_MANAGER_ROLE = await vault.LIQUIDITY_MANAGER_ROLE();
  const tx = await vault.grantRole(LIQUIDITY_MANAGER_ROLE, deployer);
  await tx.wait();
  console.log("  LIQUIDITY_MANAGER_ROLE -> deployer");

  console.log("");
  console.log("Vault setup complete");
  console.log("");

  return true;
};

export default func;
func.tags = ["Vault"];
func.dependencies = ["MockUSDC"];
func.id = "deploy_vault";
