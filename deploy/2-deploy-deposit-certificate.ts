import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("");
  console.log("=".repeat(60));
  console.log("[2/4] DepositCertificate");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer);

  const deployment = await deploy("DepositCertificate", {
    contract: "DepositCertificate",
    args: ["SavingBank Deposit Certificate", "SBDC"],
    from: deployer,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  console.log("");
  console.log("DepositCertificate deployed:", deployment.address);
  console.log("  Name:   SavingBank Deposit Certificate");
  console.log("  Symbol: SBDC");
  console.log("");
};

func.tags = ["DepositCertificate", "nft"];
export default func;
