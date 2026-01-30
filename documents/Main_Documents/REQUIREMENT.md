# Saving Banking - Yêu Cầu Sản Phẩm

Hệ thống tiết kiệm ngân hàng trên blockchain cho phép người dùng gửi tiền có kỳ hạn và nhận lãi suất.

---

## 1. Đối tượng sử dụng

**User (Bất kỳ ai)**

- Mở sổ tiết kiệm với gói và số tiền tùy chọn
- Tất toán khi đáo hạn để nhận gốc và lãi
- Rút trước hạn (chịu phí phạt)
- Gia hạn sổ tiết kiệm khi đến hạn

**Admin (Deployer)**

- Tạo và cấu hình các gói tiết kiệm
- Nạp/rút vốn từ quỹ thanh khoản (Vault)
- Tạm dừng hệ thống khi cần thiết

---

## 2. Đơn vị thanh toán

ERC20 Stablecoin (USDC) với 6 decimals.

---

## 3. Các tính năng chính

### 3.1 Quản lý gói tiết kiệm

Admin tạo các gói với thông số:

| Thông số        | Mô tả                             |
| --------------- | --------------------------------- |
| name            | Tên gói                           |
| minAmount       | Số tiền gửi tối thiểu             |
| maxAmount       | Số tiền gửi tối đa (0 = no limit) |
| minTermDays     | Kỳ hạn tối thiểu (ngày)           |
| maxTermDays     | Kỳ hạn tối đa (ngày)              |
| interestRateBps | Lãi suất năm (800 = 8%)           |
| penaltyRateBps  | Tỷ lệ phạt rút sớm (500 = 5%)     |

### 3.2 Mở sổ tiết kiệm

User chọn gói và số tiền gửi. Hệ thống:

1. Nhận tiền gốc từ User
2. Chuyển tiền vào Vault
3. Mint NFT đại diện quyền sở hữu

### 3.3 Tất toán đúng hạn

Khi đáo hạn, User nhận lại tiền gốc + lãi.

```
Interest = Principal × APR(bps) × Days / (365 × 10000)
```

### 3.4 Rút tiền trước hạn

User không nhận lãi và chịu phí phạt.

```
Penalty = Principal × PenaltyRate(bps) / 10000
Payout = Principal - Penalty
```

### 3.5 Gia hạn sổ tiết kiệm

Khi đến hạn, User gộp gốc + lãi thành tiền gốc mới cho kỳ tiếp theo.

---

## 4. Sự kiện (Events)

| Event          | Khi nào emit            |
| -------------- | ----------------------- |
| PlanCreated    | Admin tạo gói mới       |
| PlanUpdated    | Admin cập nhật gói      |
| DepositCreated | User mở sổ tiết kiệm    |
| Withdrawn      | User rút tiền           |
| Renewed        | User gia hạn sổ         |
| VaultDeposited | Admin nạp vốn vào Vault |
| VaultWithdrawn | Admin rút vốn từ Vault  |

---

## 5. Quy tắc nghiệp vụ

- Mỗi sổ có ID duy nhất, đại diện bằng NFT (ERC721)
- NFT có thể chuyển nhượng, người sở hữu có quyền rút tiền
- Vault cần đủ thanh khoản để trả lãi
- Penalty có thể gửi đến địa chỉ cấu hình hoặc giữ lại Vault
