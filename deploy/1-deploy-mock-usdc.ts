import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("");
  console.log("=".repeat(60));
  console.log("[1/4] MockUSDC");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer);

  const deployment = await deploy("MockUSDC", {
    contract: "MockUSDC",
    args: [],
    from: deployer,
    log: true,
    autoMine: true,
  });

  console.log("");
  console.log("MockUSDC deployed:", deployment.address);
  console.log("");
};

func.tags = ["MockUSDC", "token"];
export default func;
