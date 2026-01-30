import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("");
  console.log("=".repeat(60));
  console.log("[4/4] SavingBank");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer);

  const mockUSDC = await get("MockUSDC");
  const depositCertificate = await get("DepositCertificate");
  const vault = await get("Vault");

  console.log("Dependencies:");
  console.log("  Token:       ", mockUSDC.address);
  console.log("  Certificate: ", depositCertificate.address);
  console.log("  Vault:       ", vault.address);

  const deployment = await deploy("SavingBank", {
    from: deployer,
    args: [mockUSDC.address, depositCertificate.address, vault.address],
    log: true,
    waitConfirmations: 1,
  });

  console.log("");
  console.log("SavingBank deployed:", deployment.address);

  // Setup role permissions
  console.log("");
  console.log("Setting up roles...");

  const vaultContract = await ethers.getContractAt("Vault", vault.address);
  const depositCert = await ethers.getContractAt("DepositCertificate", depositCertificate.address);

  // Vault roles
  const LIQUIDITY_MANAGER_ROLE = await vaultContract.LIQUIDITY_MANAGER_ROLE();
  let tx = await vaultContract.grantRole(LIQUIDITY_MANAGER_ROLE, deployment.address);
  await tx.wait();
  console.log("  Vault: LIQUIDITY_MANAGER_ROLE -> SavingBank");

  const WITHDRAW_ROLE = await vaultContract.WITHDRAW_ROLE();
  tx = await vaultContract.grantRole(WITHDRAW_ROLE, deployment.address);
  await tx.wait();
  console.log("  Vault: WITHDRAW_ROLE -> SavingBank");

  // Certificate roles
  const MINTER_ROLE = await depositCert.MINTER_ROLE();
  tx = await depositCert.grantRole(MINTER_ROLE, deployment.address);
  await tx.wait();
  console.log("  Certificate: MINTER_ROLE -> SavingBank");

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("MockUSDC:          ", mockUSDC.address);
  console.log("DepositCertificate:", depositCertificate.address);
  console.log("Vault:             ", vault.address);
  console.log("SavingBank:        ", deployment.address);
  console.log("=".repeat(60));
  console.log("");

  return true;
};

export default func;
func.tags = ["SavingBank"];
func.dependencies = ["MockUSDC", "DepositCertificate", "Vault"];
func.id = "deploy_saving_bank";
