# Saving Banking - Kế Hoạch Deploy Testnet Sepolia

Tài liệu hướng dẫn triển khai hệ thống lên Sepolia testnet từ chuẩn bị đến vận hành.

---

## 1. Chuẩn bị

### 1.1 Yêu cầu

| Mục                | Yêu cầu    | Trạng thái |
| ------------------ | ---------- | ---------- |
| Node.js            | >= 18.x    | [ ]        |
| npm dependencies   | Đã cài đặt | [ ]        |
| Compile thành công | 0 errors   | [ ]        |
| Test pass          | 90/90      | [ ]        |

### 1.2 Tài khoản và API keys

| Mục               | Nguồn                                                                           | Trạng thái |
| ----------------- | ------------------------------------------------------------------------------- | ---------- |
| Deployer wallet   | Tạo ví mới hoặc dùng ví test                                                    | [ ]        |
| Sepolia ETH       | https://sepoliafaucet.com hoặc https://www.alchemy.com/faucets/ethereum-sepolia | [ ]        |
| Etherscan API key | https://etherscan.io/myapikey                                                   | [ ]        |

### 1.3 Cấu hình .env

```
TESTNET_PRIVATE_KEY=<private_key_without_0x>
ETHERSCAN_API_KEY=<your_api_key>
REPORT_GAS=0
```

### 1.4 Checklist trước deploy

- [ ] Ví deployer có đủ Sepolia ETH (tối thiểu 0.1 ETH)
- [ ] ETHERSCAN_API_KEY đã điền
- [ ] `npx hardhat compile` thành công
- [ ] `npx hardhat test` pass 90/90

---

## 2. Deploy Contracts

### 2.1 Thứ tự deploy

Contracts được deploy theo dependency:

```
1. MockUSDC        (không phụ thuộc)
2. DepositCertificate  (không phụ thuộc)
3. Vault           (phụ thuộc MockUSDC)
4. SavingBank      (phụ thuộc MockUSDC, Vault, DepositCertificate)
```

### 2.2 Thực hiện deploy

```bash
npx hardhat deploy --network sepolia
```

### 2.3 Ghi nhận địa chỉ contracts

Sau khi deploy, ghi lại địa chỉ:

| Contract           | Address | Verified |
| ------------------ | ------- | -------- |
| MockUSDC           |         | [ ]      |
| DepositCertificate |         | [ ]      |
| Vault              |         | [ ]      |
| SavingBank         |         | [ ]      |

---

## 3. Verify Contracts

### 3.1 Verify từng contract

```bash
# MockUSDC (không có constructor args)
npx hardhat verify --network sepolia <MOCK_USDC_ADDRESS>

# DepositCertificate
npx hardhat verify --network sepolia <CERTIFICATE_ADDRESS> "SavingBank Deposit Certificate" "SBDC"

# Vault
npx hardhat verify --network sepolia <VAULT_ADDRESS> <MOCK_USDC_ADDRESS>

# SavingBank
npx hardhat verify --network sepolia <SAVINGBANK_ADDRESS> <MOCK_USDC_ADDRESS> <CERTIFICATE_ADDRESS> <VAULT_ADDRESS>
```

### 3.2 Kiểm tra trên Etherscan

- [ ] MockUSDC: https://sepolia.etherscan.io/address/<ADDRESS>#code
- [ ] DepositCertificate: https://sepolia.etherscan.io/address/<ADDRESS>#code
- [ ] Vault: https://sepolia.etherscan.io/address/<ADDRESS>#code
- [ ] SavingBank: https://sepolia.etherscan.io/address/<ADDRESS>#code

---

## 4. Post-Deploy Setup

### 4.1 Grant roles

Chạy script hoặc thực hiện qua Etherscan:

```
Trên DepositCertificate:
- Grant MINTER_ROLE cho SavingBank

Trên Vault:
- Grant WITHDRAW_ROLE cho SavingBank
- Grant LIQUIDITY_MANAGER_ROLE cho SavingBank (hoặc admin wallet)
```

### 4.2 Checklist roles

| Contract           | Role                   | Granted To   | Status |
| ------------------ | ---------------------- | ------------ | ------ |
| DepositCertificate | MINTER_ROLE            | SavingBank   | [ ]    |
| Vault              | WITHDRAW_ROLE          | SavingBank   | [ ]    |
| Vault              | LIQUIDITY_MANAGER_ROLE | Admin wallet | [ ]    |

### 4.3 Tạo Saving Plan đầu tiên

Gọi `createSavingPlan` trên SavingBank với params:

```
name: "Standard 30 Days"
interestRateBps: 800 (8% APR)
minTermInDays: 30
maxTermInDays: 365
minDepositAmount: 100000000 (100 USDC với 6 decimals)
maxDepositAmount: 10000000000 (10,000 USDC)
earlyWithdrawalPenaltyBps: 500 (5%)
```

---

## 5. Kiểm tra trên Testnet

### 5.1 Test cơ bản

| Test           | Mô tả                               | Status |
| -------------- | ----------------------------------- | ------ |
| Mint USDC      | Mint test USDC cho user             | [ ]    |
| Approve        | User approve USDC cho SavingBank    | [ ]    |
| Create Deposit | Tạo deposit 30 ngày                 | [ ]    |
| Check NFT      | User nhận được NFT                  | [ ]    |
| View functions | getSavingPlan, getDeposit hoạt động | [ ]    |

### 5.2 Test flow hoàn chỉnh

| Flow             | Các bước                                  | Status |
| ---------------- | ----------------------------------------- | ------ |
| Happy path       | Deposit → đợi → Withdraw                  | [ ]    |
| Early withdrawal | Deposit → Withdraw sớm → kiểm tra penalty | [ ]    |
| Renew            | Deposit → đợi → Renew → kiểm tra compound | [ ]    |

### 5.3 Test admin functions

| Function               | Mô tả         | Status |
| ---------------------- | ------------- | ------ |
| createSavingPlan       | Tạo plan mới  | [ ]    |
| updateSavingPlanStatus | Bật/tắt plan  | [ ]    |
| pause/unpause          | Dừng khẩn cấp | [ ]    |
| Fund vault             | Nạp liquidity | [ ]    |

---

## 6. Monitoring

### 6.1 Theo dõi transactions

- Etherscan: https://sepolia.etherscan.io/address/<SAVINGBANK_ADDRESS>
- Events tab để xem DepositCreated, Withdrawn, Renewed

### 6.2 Kiểm tra state

| Metric         | Cách kiểm tra               |
| -------------- | --------------------------- |
| Total deposits | Đếm DepositCreated events   |
| Vault balance  | Gọi `usdc.balanceOf(vault)` |
| Active plans   | Gọi `getSavingPlan(planId)` |

---

## 7. Xử lý sự cố

### 7.1 Deploy fail

| Lỗi                   | Nguyên nhân         | Giải pháp                  |
| --------------------- | ------------------- | -------------------------- |
| Insufficient funds    | Thiếu ETH           | Lấy thêm từ faucet         |
| Nonce too low         | Transaction pending | Đợi hoặc cancel pending tx |
| Gas estimation failed | Contract error      | Kiểm tra lại code          |

### 7.2 Verify fail

| Lỗi                       | Nguyên nhân        | Giải pháp         |
| ------------------------- | ------------------ | ----------------- |
| Already verified          | Contract đã verify | Bỏ qua            |
| Constructor args mismatch | Args sai           | Kiểm tra lại args |
| API rate limit            | Gọi quá nhiều      | Đợi 5 phút        |

### 7.3 Khẩn cấp

Nếu phát hiện lỗi nghiêm trọng:

1. Gọi `pause()` trên SavingBank
2. Thông báo cho users
3. Phân tích và fix
4. Deploy contract mới nếu cần
5. Migrate data (nếu có thể)

---

## 8. Rollback Plan

Nếu cần deploy lại từ đầu:

1. Pause contracts hiện tại (nếu có thể)
2. Ghi nhận tất cả deposits đang active
3. Deploy contracts mới
4. Setup roles
5. Tạo lại saving plans
6. Hỗ trợ users migrate (nếu cần)

---

## 9. Timeline

| Ngày | Task                              | Owner | Status |
| ---- | --------------------------------- | ----- | ------ |
| D    | Chuẩn bị wallet, ETH, API keys    |       | [ ]    |
| D    | Deploy contracts                  |       | [ ]    |
| D    | Verify contracts                  |       | [ ]    |
| D    | Setup roles                       |       | [ ]    |
| D    | Tạo saving plans                  |       | [ ]    |
| D+1  | Test cơ bản trên testnet          |       | [ ]    |
| D+1  | Test flow hoàn chỉnh              |       | [ ]    |
| D+2  | Monitor và fix issues             |       | [ ]    |
| D+3  | Sẵn sàng cho frontend integration |       | [ ]    |

---

## 10. Ghi chú sau deploy

### Deployed Addresses (Sepolia)

```
Network: Sepolia (chainId: 11155111)
Deploy Date: ____/____/____
Deployer: 0x...

MockUSDC: 0x...
DepositCertificate: 0x...
Vault: 0x...
SavingBank: 0x...
```

### Saving Plans đã tạo

| ID  | Name | APR | Term | Status |
| --- | ---- | --- | ---- | ------ |
| 1   |      |     |      |        |
| 2   |      |     |      |        |

### Issues gặp phải

| Issue | Giải pháp | Ngày |
| ----- | --------- | ---- |
|       |           |      |
