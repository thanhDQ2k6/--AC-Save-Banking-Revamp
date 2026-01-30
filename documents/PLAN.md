# Saving Banking - Kế Hoạch Thực Thi

Tài liệu mô tả các bước triển khai hệ thống theo thứ tự dependency.

---

## Phase 1: Chuẩn bị môi trường

Mục tiêu: Có môi trường dev hoạt động được.

1. Khởi tạo project với Hardhat + TypeScript
2. Cài đặt dependencies: OpenZeppelin contracts, hardhat-deploy, ethers
3. Cấu hình compiler Solidity 0.8.x
4. Tạo cấu trúc thư mục: contracts/, test/, deploy/, scripts/

Kết quả: `npx hardhat compile` chạy thành công.

---

## Phase 2: Implement contracts

Thứ tự implement theo dependency (contract không phụ thuộc làm trước).

### 2.1 InterestCalculator (Library)

Không phụ thuộc contract nào. Implement trước để các contract khác dùng.

Chức năng:

- Tính lãi đơn theo công thức: principal _ rate _ days / (365 \* 10000)
- Tính phí phạt: principal \* penaltyRate / 10000

### 2.2 MockUSDC (Token)

Token ERC20 giả lập USDC để test. Có hàm mint cho phép mint tự do trong môi trường test.

### 2.3 Vault

Phụ thuộc: ERC20 token

Chức năng:

- Nhận tiền gửi vào (deposit)
- Cho phép rút tiền (withdraw) - chỉ address có quyền WITHDRAW
- Trả về balance hiện tại

### 2.4 DepositCertificate (NFT)

Phụ thuộc: không

Chức năng:

- Mint NFT với tokenId = depositId
- Burn NFT khi tất toán
- Enumerable: liệt kê tất cả NFT của một address

### 2.5 SavingBank (Core)

Phụ thuộc: Vault, DepositCertificate, InterestCalculator, ERC20 token

Chức năng Admin:

- createSavingPlan
- updateSavingPlanStatus
- updatePenaltyReceiver

Chức năng User:

- createDeposit
- withdrawDeposit
- renewDeposit

Chức năng View:

- getSavingPlan
- getDeposit
- getUserDeposits

---

## Phase 3: Deploy scripts

Viết deploy scripts theo thứ tự:

1. Deploy MockUSDC
2. Deploy DepositCertificate
3. Deploy Vault (truyền địa chỉ USDC)
4. Deploy SavingBank (truyền địa chỉ USDC, Vault, Certificate)
5. Setup roles:
   - Grant MINTER role cho SavingBank trên Certificate
   - Grant WITHDRAW role cho SavingBank trên Vault

Kết quả: `npx hardhat deploy` chạy thành công trên local.

---

## Phase 4: Testing

Viết test theo nhóm chức năng, từ đơn giản đến phức tạp.

### 4.1 Unit tests

Thứ tự viết:

1. InterestCalculator - test công thức tính toán
2. SavingPlan - test CRUD gói tiết kiệm
3. Deposit - test mở sổ tiết kiệm
4. Withdraw - test rút tiền đúng hạn và sớm
5. Renew - test gia hạn
6. Vault - test nạp/rút vốn

### 4.2 Integration tests

Test luồng end-to-end:

- User mở sổ → đợi đáo hạn → rút tiền
- User mở sổ → rút sớm → nhận tiền trừ phạt
- User mở sổ → gia hạn → rút tiền sổ mới

### 4.3 Edge cases

- Deposit với amount = minDeposit và maxDeposit
- Withdraw đúng thời điểm maturity
- Renew sang gói khác
- Pause/unpause giữa chừng

Kết quả: Tất cả test pass, coverage > 90%.

---

## Phase 5: Deployment

### 5.1 Testnet (Sepolia)

1. Deploy contracts lên Sepolia
2. Verify contracts trên Etherscan
3. Test thủ công các chức năng chính
4. Setup multi-sig wallet cho Admin role

### 5.2 Mainnet

1. External security audit
2. Fix findings (nếu có)
3. Deploy với multi-sig
4. Monitor transactions

---

## Checklist tổng quan

| Phase | Mục tiêu   | Tiêu chí hoàn thành                |
| ----- | ---------- | ---------------------------------- |
| 1     | Setup      | `hardhat compile` thành công       |
| 2     | Contracts  | Tất cả contracts compile không lỗi |
| 3     | Deploy     | `hardhat deploy` local thành công  |
| 4     | Testing    | 100% test pass                     |
| 5     | Production | Contracts live trên mainnet        |
