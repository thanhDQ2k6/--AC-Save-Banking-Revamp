# Deploy Plan - Sepolia Testnet

## 1. Chuẩn bị

### Yêu cầu

- Node.js >= 18.x
- `npx hardhat compile` thành công
- `npx hardhat test` pass 91/91

### Tài khoản cần có

| Mục               | Nguồn                                            |
| ----------------- | ------------------------------------------------ |
| Deployer wallet   | Tạo ví mới hoặc dùng ví test                     |
| Sepolia ETH       | https://www.alchemy.com/faucets/ethereum-sepolia |
| Etherscan API key | https://etherscan.io/myapikey                    |
| Infura API key    | https://app.infura.io/                           |

### File .env

```bash
TESTNET_PRIVATE_KEY=<private_key_without_0x>
ETHERSCAN_API_KEY=<your_etherscan_api_key>
INFURA_API_KEY=<your_infura_api_key>
```

---

## 2. Deploy

### Step 1: Deploy Contracts

```bash
npx hardhat deploy --network sepolia
```

Deploy tự động theo thứ tự: MockUSDC → DepositCertificate → Vault → SavingBank

Sau deploy, script tự động:

- `Vault.setSavingBank(savingBankAddress)`
- `Certificate.grantRole(MINTER_ROLE, savingBankAddress)`

### Step 2: Setup (Plans, Vault Funding)

```bash
npx hardhat run scripts/sepolia/setup.ts --network sepolia
```

Script thực hiện:

1. Tạo 2 saving plans (Standard & Premium)
2. Set penalty receiver = deployer (đổi sang treasury wallet cho production)
3. Mint test USDC cho deployer
4. Fund vault với 100,000 USDC

### Step 3: Verify Contracts

```bash
# MockUSDC
npx hardhat verify --network sepolia <USDC_ADDRESS>

# DepositCertificate
npx hardhat verify --network sepolia <CERT_ADDRESS> "SavingBank Deposit Certificate" "SBDC"

# Vault
npx hardhat verify --network sepolia <VAULT_ADDRESS> <USDC_ADDRESS>

# SavingBank
npx hardhat verify --network sepolia <BANK_ADDRESS> <USDC_ADDRESS> <CERT_ADDRESS> <VAULT_ADDRESS>
```

---

## 3. Test

### Test trên Sepolia

```bash
npx hardhat run scripts/sepolia/test.ts --network sepolia
```

### Debug (nếu cần)

```bash
npx hardhat run scripts/sepolia/debug.ts --network sepolia
```

### Test local (full suite)

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/manual-tests/run-all.ts --network localhost
```

---

## 4. Troubleshooting

| Lỗi                   | Nguyên nhân        | Giải pháp              |
| --------------------- | ------------------ | ---------------------- |
| Insufficient funds    | Thiếu ETH          | Lấy thêm từ faucet     |
| Nonce too low         | Tx pending         | Đợi hoặc cancel tx     |
| Gas estimation failed | Contract error     | Kiểm tra lại input     |
| Already verified      | Đã verify rồi      | Bỏ qua                 |
| PRIVATE_KEY not found | Chưa setup .env    | Thêm key vào .env      |
| RPC rate limit        | Quá nhiều requests | Đợi 1 phút rồi thử lại |

---

## 5. Architecture

```
┌─────────────────┐
│    User/Admin   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌───────────────────┐
│   SavingBank    │◄────►│ DepositCertificate│
│  (Main Logic)   │      │    (NFT ERC721)   │
└────────┬────────┘      └───────────────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│     Vault       │◄────►│    MockUSDC     │
│  (Liquidity)    │      │    (ERC20)      │
└─────────────────┘      └─────────────────┘
```

**Roles:**

- **Admin** (deployer): createPlan, pause, setPenaltyReceiver
- **User** (anyone): createDeposit, withdraw, renew
- **NFT Owner**: Ai giữ NFT = chủ sở hữu deposit
