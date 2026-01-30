# Saving Banking - Yêu Cầu Sản Phẩm

Hệ thống tiết kiệm ngân hàng trên blockchain cho phép người dùng gửi tiền có kỳ hạn và nhận lãi suất. Tài sản được quản lý bởi smart contract, đảm bảo minh bạch và không cần tin tưởng bên thứ ba.

---

## 1. Đối tượng sử dụng

**Người gửi tiền (User)**

- Mở sổ tiết kiệm với gói và số tiền tùy chọn
- Tất toán khi đáo hạn để nhận gốc và lãi
- Rút trước hạn (chịu phí phạt)
- Gia hạn sổ tiết kiệm khi đến hạn

**Quản trị viên (Admin)**

- Tạo và cấu hình các gói tiết kiệm
- Nạp/rút vốn từ quỹ thanh khoản (Vault)
- Tạm dừng hệ thống khi cần thiết

---

## 2. Đơn vị thanh toán

Sử dụng ERC20 Stablecoin (USDC hoặc tương đương) với 6 hoặc 18 decimals.

---

## 3. Các tính năng chính

### 3.1 Quản lý gói tiết kiệm

Admin tạo các gói với thông số:

- Kỳ hạn gửi (ngày)
- Lãi suất năm (basis points, ví dụ 800 = 8%/năm)
- Số tiền gửi tối thiểu và tối đa
- Tỷ lệ phạt rút trước hạn
- Trạng thái kích hoạt

### 3.2 Mở sổ tiết kiệm

Người dùng chọn gói và số tiền gửi. Hệ thống:

- Nhận và giữ tiền gốc (principal)
- Ghi nhận: chủ sở hữu, mã gói, tiền gốc, thời điểm bắt đầu, thời điểm đáo hạn
- Phát hành NFT đại diện quyền sở hữu

### 3.3 Tất toán đúng hạn

Khi đáo hạn, người dùng nhận lại tiền gốc cộng lãi.

Công thức tính lãi đơn:
$$Interest = \frac{Principal \times APR_{bps} \times Days}{365 \times 10000}$$

Nguồn lãi lấy từ Liquidity Vault do Admin nạp trước.

### 3.4 Rút tiền trước hạn

Người dùng không nhận lãi và chịu phí phạt.

Công thức tính phạt:
$$Penalty = \frac{Principal \times Penalty_{bps}}{10000}$$

Người dùng nhận: Principal - Penalty. Phí phạt chuyển về địa chỉ cấu hình hoặc Vault.

### 3.5 Gia hạn sổ tiết kiệm

Khi đến hạn, người dùng có thể gộp gốc và lãi thành tiền gốc mới, mở kỳ tiết kiệm tiếp theo (cùng gói hoặc gói khác).

### 3.6 Quản trị hệ thống

- Nạp vốn vào Vault để trả lãi
- Rút vốn dư từ Vault
- Cấu hình địa chỉ nhận phí phạt
- Tạm dừng/mở lại hệ thống

---

## 4. Sự kiện cần ghi nhận

- Tạo/cập nhật gói tiết kiệm
- Mở sổ tiết kiệm mới
- Rút tiền (đúng hạn hoặc trước hạn)
- Gia hạn sổ tiết kiệm

---

## 5. Quy tắc nghiệp vụ

- Mỗi sổ tiết kiệm có ID duy nhất, đại diện bằng NFT (ERC721)
- NFT có thể chuyển nhượng, người sở hữu NFT có quyền rút tiền
- Hệ thống tuân thủ nguyên tắc minh bạch và an toàn tài sản
