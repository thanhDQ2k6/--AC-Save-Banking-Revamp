/**
 * Shared utilities for manual tests
 */
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

export const ONE_USDC = 1_000_000n;
export const ONE_DAY = 24 * 60 * 60;

// File to store deployed addresses
const ADDRESSES_FILE = path.join(__dirname, ".addresses.json");

export interface DeployedAddresses {
  usdc: string;
  certificate: string;
  vault: string;
  savingBank: string;
}

export function saveAddresses(addresses: DeployedAddresses) {
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
}

export function loadAddresses(): DeployedAddresses {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error("Addresses not found. Run 01-deploy.ts first!");
  }
  return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"));
}

export async function getContracts() {
  const addr = loadAddresses();
  return {
    usdc: await ethers.getContractAt("MockUSDC", addr.usdc),
    certificate: await ethers.getContractAt("DepositCertificate", addr.certificate),
    vault: await ethers.getContractAt("Vault", addr.vault),
    savingBank: await ethers.getContractAt("SavingBank", addr.savingBank),
  };
}

export async function getSigners() {
  const [admin, user1, user2] = await ethers.getSigners();
  return { admin, user1, user2 };
}

export function formatUSDC(amount: bigint): string {
  return `${Number(amount) / 1_000_000} USDC`;
}

export function logSuccess(msg: string) {
  console.log(`✅ ${msg}`);
}

export function logError(msg: string) {
  console.log(`❌ ${msg}`);
}

export function logInfo(msg: string) {
  console.log(`ℹ️  ${msg}`);
}

export function logHeader(title: string) {
  console.log("\n" + "=".repeat(50));
  console.log(title);
  console.log("=".repeat(50));
}
