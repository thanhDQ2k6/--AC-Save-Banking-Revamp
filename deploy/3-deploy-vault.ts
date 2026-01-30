import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

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
  console.log("(setSavingBank will be called in SavingBank deploy script)");
  console.log("");

  return true;
};

export default func;
func.tags = ["Vault"];
func.dependencies = ["MockUSDC"];
func.id = "deploy_vault";
