# Deploy Plan - Sepolia Testnet

## 1. Chuẩn bị

### Yêu cầu

- Node.js >= 18.x
- `npx hardhat compile` thành công
- `npx hardhat test` pass 91/91

### Tài khoản

| Mục               | Nguồn                         |
| ----------------- | ----------------------------- |
| Deployer wallet   | Tạo ví mới hoặc dùng ví test  |
| Sepolia ETH       | https://sepoliafaucet.com     |
| Etherscan API key | https://etherscan.io/myapikey |

### File .env

```
TESTNET_PRIVATE_KEY=<private_key_without_0x>
ETHERSCAN_API_KEY=<your_api_key>
```

---

## 2. Deploy

### Thứ tự deploy

```
1. MockUSDC            (không phụ thuộc)
2. DepositCertificate  (không phụ thuộc)
3. Vault               (phụ thuộc MockUSDC)
4. SavingBank          (phụ thuộc tất cả)
```

### Chạy deploy

```bash
npx hardhat deploy --network sepolia
```

### Ghi nhận địa chỉ

| Contract           | Address | Verified |
| ------------------ | ------- | -------- |
| MockUSDC           |         | [ ]      |
| DepositCertificate |         | [ ]      |
| Vault              |         | [ ]      |
| SavingBank         |         | [ ]      |

---

## 3. Post-Deploy Setup

### Tự động (trong deploy script)

1. `Vault.setSavingBank(savingBankAddress)`
2. `Certificate.grantRole(MINTER_ROLE, savingBankAddress)`

### Manual (qua Etherscan hoặc script)

1. Tạo Saving Plan đầu tiên:

```javascript
await savingBank.createPlan({
  name: "Standard 30 Days",
  minAmount: 100_000_000n, // 100 USDC
  maxAmount: 0n, // no limit
  minTermDays: 30,
  maxTermDays: 365,
  interestRateBps: 800n, // 8% APR
  penaltyRateBps: 500n, // 5% penalty
});
```

2. Nạp vốn vào Vault:

```javascript
await usdc.approve(savingBank.target, amount);
await savingBank.depositToVault(amount);
```

---

## 4. Verify Contracts

```bash
# MockUSDC
npx hardhat verify --network sepolia <ADDRESS>

# DepositCertificate
npx hardhat verify --network sepolia <ADDRESS> "SavingBank Deposit Certificate" "SBDC"

# Vault
npx hardhat verify --network sepolia <ADDRESS> <USDC_ADDRESS>

# SavingBank
npx hardhat verify --network sepolia <ADDRESS> <USDC> <CERTIFICATE> <VAULT>
```

---

## 5. Test trên Testnet

### Test cơ bản

| Test           | Mô tả                            | Status |
| -------------- | -------------------------------- | ------ |
| Mint USDC      | Mint test USDC cho user          | [ ]    |
| Approve        | User approve USDC cho SavingBank | [ ]    |
| Create Deposit | Tạo deposit                      | [ ]    |
| Check NFT      | User nhận được NFT               | [ ]    |
| View functions | getPlan, getDeposit hoạt động    | [ ]    |

### Test flow

| Flow             | Các bước                  | Status |
| ---------------- | ------------------------- | ------ |
| Happy path       | Deposit → wait → Withdraw | [ ]    |
| Early withdrawal | Deposit → Withdraw sớm    | [ ]    |
| Renew            | Deposit → wait → Renew    | [ ]    |

---

## 6. Troubleshooting

| Lỗi                   | Nguyên nhân    | Giải pháp          |
| --------------------- | -------------- | ------------------ |
| Insufficient funds    | Thiếu ETH      | Lấy thêm từ faucet |
| Nonce too low         | Tx pending     | Đợi hoặc cancel tx |
| Gas estimation failed | Contract error | Kiểm tra lại code  |
| Already verified      | Đã verify rồi  | Bỏ qua             |

### Khẩn cấp

1. `savingBank.pause()` - Dừng hệ thống
2. Phân tích vấn đề
3. Fix và deploy lại nếu cần

---

## 7. Deployed Addresses

```
Network: Sepolia (chainId: 11155111)
Deploy Date: ____/____/____

MockUSDC: 0x...
DepositCertificate: 0x...
Vault: 0x...
SavingBank: 0x...
```
