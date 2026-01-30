# Saving Banking - Kiến Trúc Hệ Thống

Tài liệu mô tả cấu trúc kỹ thuật của hệ thống, bao gồm các thành phần, quan hệ giữa chúng, và cấu trúc dữ liệu.

---

## 1. Tổng quan

Hệ thống gồm 4 thành phần chính:

| Thành phần         | Vai trò                                                    |
| ------------------ | ---------------------------------------------------------- |
| SavingBank         | Điều phối nghiệp vụ chính (gói tiết kiệm, gửi/rút/gia hạn) |
| Vault              | Quản lý quỹ thanh khoản để trả lãi                         |
| DepositCertificate | NFT đại diện quyền sở hữu sổ tiết kiệm                     |
| InterestCalculator | Thư viện tính toán lãi suất                                |

Tách riêng từng thành phần để:

- Vault bị tấn công không ảnh hưởng logic SavingBank
- NFT có thể nâng cấp độc lập
- Thư viện tính toán dễ kiểm tra và tái sử dụng

---

## 2. Quan hệ giữa các thành phần

```
User
  │
  ▼
SavingBank ──uses──► InterestCalculator (library)
  │
  ├──calls──► Vault (chuyển tiền gốc vào, rút tiền + lãi ra)
  │
  └──calls──► DepositCertificate (mint NFT khi mở sổ, burn khi tất toán)
```

Luồng hoạt động:

1. User gọi SavingBank để mở sổ tiết kiệm
2. SavingBank nhận tiền từ User, chuyển vào Vault
3. SavingBank gọi DepositCertificate mint NFT cho User
4. Khi rút tiền, SavingBank tính lãi bằng InterestCalculator
5. SavingBank gọi Vault rút tiền gốc + lãi trả User
6. SavingBank burn NFT

---

## 3. Cấu trúc dữ liệu

### 3.1 Gói tiết kiệm (SavingPlan)

Định nghĩa các thông số cho một loại sản phẩm tiết kiệm.

| Field                     | Type    | Ý nghĩa                                      |
| ------------------------- | ------- | -------------------------------------------- |
| name                      | string  | Tên gói (hiển thị)                           |
| interestRateBps           | uint256 | Lãi suất năm, đơn vị basis points (100 = 1%) |
| minTermInDays             | uint256 | Kỳ hạn tối thiểu (ngày)                      |
| maxTermInDays             | uint256 | Kỳ hạn tối đa (ngày)                         |
| minDepositAmount          | uint256 | Số tiền gửi tối thiểu                        |
| maxDepositAmount          | uint256 | Số tiền gửi tối đa                           |
| earlyWithdrawalPenaltyBps | uint256 | Phí phạt rút sớm (basis points)              |
| isActive                  | bool    | Gói còn hoạt động không                      |

### 3.2 Sổ tiết kiệm (Deposit)

Thông tin một khoản gửi cụ thể của người dùng.

| Field            | Type          | Ý nghĩa                                  |
| ---------------- | ------------- | ---------------------------------------- |
| planId           | uint256       | ID gói tiết kiệm đã chọn                 |
| principal        | uint256       | Số tiền gốc                              |
| startTime        | uint256       | Thời điểm bắt đầu (timestamp)            |
| maturityTime     | uint256       | Thời điểm đáo hạn (timestamp)            |
| interestRateBps  | uint256       | Lãi suất tại thời điểm mở (snapshot)     |
| expectedInterest | uint256       | Lãi dự kiến khi đáo hạn                  |
| status           | DepositStatus | Trạng thái: Active / Withdrawn / Renewed |

### 3.3 Trạng thái sổ tiết kiệm (DepositStatus)

```
Active    - Đang hoạt động, chưa tất toán
Withdrawn - Đã rút tiền (đúng hạn hoặc sớm)
Renewed   - Đã gia hạn sang sổ mới
```

---

## 4. Phân quyền

Hệ thống sử dụng Role-Based Access Control với các vai trò:

| Role              | Quyền hạn                                             |
| ----------------- | ----------------------------------------------------- |
| DEFAULT_ADMIN     | Cấp/thu hồi các role khác                             |
| ADMIN             | Tạo/cập nhật gói tiết kiệm, cấu hình penalty receiver |
| PAUSER            | Tạm dừng/mở lại hệ thống                              |
| LIQUIDITY_MANAGER | Nạp/rút vốn từ Vault                                  |
| MINTER            | Mint NFT (chỉ SavingBank có quyền này)                |
| WITHDRAW          | Rút tiền từ Vault (chỉ SavingBank có quyền này)       |

Nguyên tắc: Mỗi role chỉ có quyền tối thiểu cần thiết. SavingBank được cấp MINTER và WITHDRAW để thực hiện nghiệp vụ, Admin không có quyền rút tiền trực tiếp từ Vault.

---

## 5. Bảo mật

Các cơ chế bảo vệ:

| Cơ chế          | Mục đích                                           |
| --------------- | -------------------------------------------------- |
| ReentrancyGuard | Chống tấn công reentrancy trên các hàm chuyển tiền |
| Pausable        | Dừng khẩn cấp khi phát hiện vấn đề                 |
| SafeERC20       | Xử lý an toàn các token ERC20 không chuẩn          |
| Access Control  | Phân quyền chặt chẽ từng chức năng                 |
| Ownership check | Kiểm tra quyền sở hữu NFT trước khi rút/gia hạn    |

---

## 6. Nguyên tắc thiết kế

Hệ thống tuân theo các nguyên tắc:

1. **Single Responsibility**: Mỗi contract làm một việc (SavingBank = logic, Vault = giữ tiền, Certificate = ownership)

2. **Dependency Injection**: SavingBank nhận địa chỉ Vault và Certificate qua constructor, dễ thay thế khi test

3. **Interface Segregation**: Tách interface theo chức năng (Admin, User, View) để client chỉ phụ thuộc những gì cần

4. **Guard Clauses**: Kiểm tra điều kiện và return/revert sớm, tránh nested if-else sâu

5. **Custom Errors**: Dùng error thay vì require string để tiết kiệm gas và rõ ràng hơn
