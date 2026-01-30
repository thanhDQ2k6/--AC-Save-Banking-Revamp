/**
 * 01-deploy.ts - Deploy all contracts and setup
 *
 * Usage: npx hardhat run scripts/manual-tests/01-deploy.ts --network localhost
 */
import { ethers } from "hardhat";
import { ONE_USDC, ONE_DAY, saveAddresses, logHeader, logSuccess, logInfo, formatUSDC } from "./shared";

async function main() {
  logHeader("STEP 1: DEPLOY CONTRACTS");

  const [admin, user1, user2] = await ethers.getSigners();
  logInfo(`Admin: ${admin.address}`);
  logInfo(`User1: ${user1.address}`);
  logInfo(`User2: ${user2.address}`);

  // Deploy MockUSDC
  console.log("\n📦 Deploying contracts...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  logSuccess(`MockUSDC: ${await usdc.getAddress()}`);

  // Deploy DepositCertificate
  const DepositCertificate = await ethers.getContractFactory("DepositCertificate");
  const certificate = await DepositCertificate.deploy("SavingBank Deposit", "SBD");
  await certificate.waitForDeployment();
  logSuccess(`DepositCertificate: ${await certificate.getAddress()}`);

  // Deploy Vault
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(await usdc.getAddress());
  await vault.waitForDeployment();
  logSuccess(`Vault: ${await vault.getAddress()}`);

  // Deploy SavingBank
  const SavingBank = await ethers.getContractFactory("SavingBank");
  const savingBank = await SavingBank.deploy(
    await usdc.getAddress(),
    await certificate.getAddress(),
    await vault.getAddress()
  );
  await savingBank.waitForDeployment();
  logSuccess(`SavingBank: ${await savingBank.getAddress()}`);

  // Setup permissions
  console.log("\n🔐 Setting up permissions...");
  await vault.setSavingBank(await savingBank.getAddress());
  logSuccess("Vault.setSavingBank()");

  const MINTER_ROLE = await certificate.MINTER_ROLE();
  await certificate.grantRole(MINTER_ROLE, await savingBank.getAddress());
  logSuccess("Certificate.grantRole(MINTER_ROLE)");

  // Set penalty receiver
  await savingBank.setPenaltyReceiver(admin.address);
  logSuccess("SavingBank.setPenaltyReceiver(admin)");

  // Create saving plans
  console.log("\n📋 Creating saving plans...");
  // Plan 1: Standard (30-365 days, 8% APR, 5% penalty)
  await savingBank.createPlan({
    name: "Standard Plan",
    minAmount: 100n * ONE_USDC,
    maxAmount: 0n, // no limit
    minTermDays: 30,
    maxTermDays: 365,
    interestRateBps: 800, // 8% APR
    penaltyRateBps: 500, // 5% penalty
  });
  logSuccess("Plan 1: Standard (8% APR, 5% penalty, 30-365 days)");

  // Plan 2: Premium (90-730 days, 12% APR, 3% penalty)
  await savingBank.createPlan({
    name: "Premium Plan",
    minAmount: 1000n * ONE_USDC,
    maxAmount: 100_000n * ONE_USDC,
    minTermDays: 90,
    maxTermDays: 730,
    interestRateBps: 1200, // 12% APR
    penaltyRateBps: 300, // 3% penalty
  });
  logSuccess("Plan 2: Premium (12% APR, 3% penalty, 90-730 days)");

  // Mint USDC
  console.log("\n💵 Minting USDC...");
  await usdc.mint(user1.address, 50_000n * ONE_USDC);
  await usdc.mint(user2.address, 50_000n * ONE_USDC);
  await usdc.mint(admin.address, 500_000n * ONE_USDC);
  logSuccess(`User1: ${formatUSDC(50_000n * ONE_USDC)}`);
  logSuccess(`User2: ${formatUSDC(50_000n * ONE_USDC)}`);
  logSuccess(`Admin: ${formatUSDC(500_000n * ONE_USDC)}`);

  // Fund vault (transfer directly since only SavingBank can call deposit)
  console.log("\n🏦 Funding vault for interest payments...");
  await usdc.connect(admin).transfer(await vault.getAddress(), 100_000n * ONE_USDC);
  const vaultBalance = await vault.getBalance();
  logSuccess(`Vault funded: ${formatUSDC(vaultBalance)}`);

  // Save addresses
  const addresses = {
    usdc: await usdc.getAddress(),
    certificate: await certificate.getAddress(),
    vault: await vault.getAddress(),
    savingBank: await savingBank.getAddress(),
  };
  saveAddresses(addresses);
  logSuccess("Addresses saved to .addresses.json");

  logHeader("DEPLOY COMPLETE ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
