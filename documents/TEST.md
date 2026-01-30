# Saving Banking - Kiểm Thử

Danh sách các test case để xác nhận hệ thống hoạt động đúng.

**Trạng thái**: 90/90 tests passed (30/01/2026)

---

## 1. Quản lý gói tiết kiệm

### Tạo gói

- [x] Admin tạo gói với đầy đủ thông số hợp lệ
- [x] Từ chối tạo gói với thông số không hợp lệ
- [x] Từ chối tạo gói với minTerm > maxTerm
- [x] Từ chối khi người không có quyền ADMIN tạo gói

### Cập nhật gói

- [x] Admin bật/tắt trạng thái gói
- [x] Admin cập nhật thông số gói
- [x] Cập nhật gói không ảnh hưởng deposit đã tạo

---

## 2. Mở sổ tiết kiệm

### Luồng thành công

- [x] User mở sổ với số tiền trong khoảng cho phép
- [x] User nhận được NFT sau khi mở sổ
- [x] Thông tin deposit được lưu đúng (planId, principal, startTime, maturityTime)
- [x] Tính và lưu expected interest chính xác

### Validation

- [x] Từ chối mở sổ với gói đã bị tắt
- [x] Từ chối mở sổ với amount < minDeposit
- [x] Từ chối mở sổ với amount > maxDeposit
- [x] Từ chối mở sổ với term ngoài khoảng cho phép

### Multi-user

- [x] Nhiều user deposit cùng lúc
- [x] Track deposit history cho từng user
- [x] Deposit với nhiều gói khác nhau

---

## 3. Rút tiền đúng hạn

### Luồng thành công

- [x] User rút tiền sau maturityTime, nhận đủ principal + interest
- [x] Nhiều user rút tiền đúng hạn

### Tính toán lãi

- [x] Lãi tính đúng công thức
- [x] Lãi đúng với nhiều mốc thời gian (30, 90, 365 ngày)
- [x] Xử lý số lớn không overflow

### Validation

- [x] Từ chối rút nếu không sở hữu NFT
- [x] Từ chối rút nếu deposit đã withdrawn
- [x] Từ chối rút deposit không tồn tại

---

## 4. Rút tiền trước hạn

### Luồng thành công

- [x] User rút trước hạn, nhận principal - penalty
- [x] Penalty tính đúng với nhiều mốc thời gian còn lại

### Tính toán phạt

- [x] Phạt tính đúng công thức
- [x] Xử lý edge case: rút 1 ngày trước đáo hạn

### Validation

- [x] Từ chối nếu không sở hữu NFT

---

## 5. Gia hạn sổ tiết kiệm

### Luồng thành công

- [x] User gia hạn sau maturityTime
- [x] Tiền gốc mới = principal cũ + interest (compound)
- [x] Track renewal history

### Gia hạn sang gói khác

- [x] User gia hạn với term mới
- [x] User gia hạn sang gói khác

### Validation

- [x] Từ chối gia hạn nếu không sở hữu NFT
- [x] Validate term mới đáp ứng yêu cầu gói
- [x] Emit đúng events

---

## 6. Quản lý Vault

### Access Control

- [x] Grant LIQUIDITY_MANAGER_ROLE cho SavingBank
- [x] Grant WITHDRAW_ROLE cho SavingBank
- [x] Từ chối deposit không có quyền
- [x] Từ chối withdraw không có quyền

### Admin Liquidity

- [x] Admin nạp vốn vào Vault
- [x] Admin rút vốn từ Vault
- [x] Từ chối rút quá số dư

### SavingBank Integration

- [x] SavingBank deposit liquidity
- [x] SavingBank withdraw cho user

### Security

- [x] Chống reentrancy attack
- [x] Xử lý amount = 0
- [x] Validate recipient address
- [x] Emit đúng events

---

## 7. Bảo mật

### Access Control

- [x] Chỉ ADMIN mới tạo/cập nhật gói
- [x] Chỉ PAUSER mới pause/unpause
- [x] Chỉ NFT owner mới rút/gia hạn deposit

### Pause

- [x] Pause chặn các operations
- [x] Unpause khôi phục hoạt động

---

## 8. Integration Tests

### Full Flow

- [x] Deposit → đợi đáo hạn → withdraw
- [x] Deposit → early withdrawal với penalty
- [x] Deposit → renew tại maturity

### Multi-User

- [x] Nhiều user deposit cùng lúc
- [x] User1 withdraw trong khi user2 tiếp tục

### Vault Liquidity

- [x] Track liquidity qua deposit/withdraw cycles

### Admin Operations

- [x] Pause/unpause ảnh hưởng tất cả users
- [x] Update plan chỉ ảnh hưởng deposit mới
- [x] Deactivate plan chặn deposit mới

### Edge Cases

- [x] Deposit với minimum amount
- [x] Deposit với maximum term
- [x] Rapid sequential deposits
- [x] Withdraw đúng timestamp maturity

### Cross-Contract

- [x] Sync state giữa SavingBank, Vault, Certificate
- [x] Transfer NFT rồi user mới rút tiền

---

## Tổng kết

| Nhóm                  | Passed    |
| --------------------- | --------- |
| SavingBank Core       | 13/13     |
| Deposit Operations    | 12/12     |
| Withdraw Operations   | 13/13     |
| Renew Operations      | 10/10     |
| Vault Operations      | 13/13     |
| SavingPlan Management | 12/12     |
| InterestCalculator    | 5/5       |
| Integration Tests     | 15/15     |
| **Tổng**              | **90/90** |
