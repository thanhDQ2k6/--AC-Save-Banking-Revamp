import { ethers } from "hardhat";
import { ONE_USDC, DEFAULT_PLAN } from "./constants";

/**
 * Deploy fixture theo kế hoạch mới:
 * - 2 roles: Admin (deployer) và User
 * - Vault chỉ cho SavingBank gọi
 * - NFT ownership là source of truth
 */
export async function deployFixture() {
  const [admin, user1, user2, penaltyReceiver] = await ethers.getSigners();

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();

  // Deploy DepositCertificate
  const DepositCertificate = await ethers.getContractFactory("DepositCertificate");
  const certificate = await DepositCertificate.deploy("SavingBank Deposit Certificate", "SBDC");

  // Deploy Vault
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(usdc.target);

  // Deploy SavingBank (admin = deployer)
  const SavingBank = await ethers.getContractFactory("SavingBank");
  const savingBank = await SavingBank.deploy(usdc.target, certificate.target, vault.target);

  // Setup: Vault chỉ cho SavingBank gọi
  await vault.setSavingBank(savingBank.target);

  // Setup: Certificate cho SavingBank mint/burn
  const MINTER_ROLE = await certificate.MINTER_ROLE();
  await certificate.grantRole(MINTER_ROLE, savingBank.target);

  // Mint tokens cho users
  await usdc.mint(user1.address, 100_000n * ONE_USDC);
  await usdc.mint(user2.address, 100_000n * ONE_USDC);
  await usdc.mint(admin.address, 1_000_000n * ONE_USDC);

  return {
    usdc,
    certificate,
    vault,
    savingBank,
    admin,
    user1,
    user2,
    penaltyReceiver,
  };
}

/**
 * Deploy fixture với plan và vault liquidity sẵn
 */
export async function deployWithPlanFixture() {
  const fixture = await deployFixture();
  const { savingBank, usdc, vault, admin } = fixture;

  // Admin tạo plan mặc định
  await savingBank.createPlan(DEFAULT_PLAN);

  // Admin nạp liquidity vào vault
  const liquidityAmount = 500_000n * ONE_USDC;
  await usdc.connect(admin).approve(savingBank.target, liquidityAmount);
  await savingBank.depositToVault(liquidityAmount);

  return fixture;
}
