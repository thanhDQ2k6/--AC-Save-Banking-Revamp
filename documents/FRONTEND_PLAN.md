# Saving Banking - Kế Hoạch Frontend

Giao diện Vue.js + Tailwind CSS + Ethers.js, chia làm 2 phần: User và Admin.

---

## 1. Tech Stack

| Layer     | Công nghệ               |
| --------- | ----------------------- |
| Framework | Vue 3 (Composition API) |
| Router    | Vue Router              |
| Build     | Vite + TypeScript       |
| Styling   | Tailwind CSS            |
| Web3      | Ethers.js v6            |

---

## 2. Cấu trúc thư mục

```
frontend/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── views/
│   │   ├── user/
│   │   │   ├── Dashboard.vue
│   │   │   ├── Plans.vue
│   │   │   ├── MyDeposits.vue
│   │   │   └── DepositDetail.vue
│   │   └── admin/
│   │       ├── Dashboard.vue
│   │       ├── Plans.vue
│   │       └── Vault.vue
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.vue
│   │   │   ├── ConnectWallet.vue
│   │   │   └── StatCard.vue
│   │   ├── user/
│   │   │   ├── PlanCard.vue
│   │   │   ├── DepositCard.vue
│   │   │   ├── DepositForm.vue
│   │   │   ├── WithdrawModal.vue
│   │   │   └── RenewModal.vue
│   │   └── admin/
│   │       ├── PlanForm.vue
│   │       ├── PlanTable.vue
│   │       └── VaultPanel.vue
│   ├── composables/
│   │   ├── useWallet.ts
│   │   ├── useContracts.ts
│   │   ├── usePlans.ts
│   │   ├── useDeposits.ts
│   │   └── useAdmin.ts
│   ├── contracts/
│   │   ├── addresses.ts
│   │   └── abis/
│   └── types/
│       └── index.ts
└── ...
```

---

## 3. Giao diện User

### 3.1 User Dashboard (`/`)

Trang tổng quan hiển thị thống kê cá nhân.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Navbar: Logo | Plans | My Deposits | [Connect Wallet]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ Tổng gửi │  │ Số sổ    │  │ Lãi dự   │  │ USDC    │  │
│  │ 10,000   │  │ đang gửi │  │ kiến     │  │ Balance │  │
│  │ USDC     │  │ 3        │  │ 800 USDC │  │ 5,000   │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                         │
│  Sổ tiết kiệm sắp đáo hạn                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Deposit #1 | 1,000 USDC | Còn 5 ngày | [Xem]    │    │
│  │ Deposit #2 | 2,000 USDC | Còn 12 ngày | [Xem]   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [Gửi tiết kiệm mới]                                    │
└─────────────────────────────────────────────────────────┘
```

**Dữ liệu cần đọc:**

- `usdc.balanceOf(user)` - Số dư USDC
- `depositCertificate.tokensOfOwner(user)` - Danh sách deposit IDs
- `savingBank.getDeposit(id)` - Chi tiết từng deposit
- Tính tổng principal, tổng expected interest

### 3.2 Danh sách gói tiết kiệm (`/plans`)

Hiển thị các gói đang active để user chọn gửi.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Các gói tiết kiệm                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Gói Linh Hoạt   │  │ Gói Tiêu Chuẩn  │               │
│  │ 30-90 ngày      │  │ 90-365 ngày     │               │
│  │ Lãi suất: 5%    │  │ Lãi suất: 8%    │               │
│  │ Min: 100 USDC   │  │ Min: 500 USDC   │               │
│  │ Phạt rút: 3%    │  │ Phạt rút: 5%    │               │
│  │ [Gửi ngay]      │  │ [Gửi ngay]      │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Dữ liệu cần đọc:**

- Loop qua planId từ 1, gọi `savingBank.getSavingPlan(planId)` cho đến khi hết
- Chỉ hiển thị plan có `isActive = true`

### 3.3 Form gửi tiết kiệm (Modal)

Khi click "Gửi ngay" trên PlanCard.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Gửi tiết kiệm - Gói Tiêu Chuẩn         │
├─────────────────────────────────────────┤
│                                         │
│  Số tiền (USDC)                         │
│  ┌─────────────────────────────┐ [Max]  │
│  │ 1000                        │        │
│  └─────────────────────────────┘        │
│  Min: 500 | Max: 50,000                 │
│                                         │
│  Kỳ hạn (ngày)                          │
│  ──●────────────────────────── 180      │
│  90 ngày                    365 ngày    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Tóm tắt:                        │    │
│  │ Gốc:        1,000 USDC          │    │
│  │ Kỳ hạn:     180 ngày            │    │
│  │ Lãi suất:   8% / năm            │    │
│  │ Lãi dự kiến: 39.45 USDC         │    │
│  │ Tổng nhận:  1,039.45 USDC       │    │
│  │ Đáo hạn:    30/07/2026          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Hủy]              [Approve & Gửi]     │
└─────────────────────────────────────────┘
```

**Flow:**

1. Kiểm tra allowance
2. Nếu chưa đủ → Approve
3. Gọi `createDeposit(planId, amount, termInDays)`

### 3.4 Danh sách sổ của tôi (`/my-deposits`)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Sổ tiết kiệm của tôi (3 sổ)                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ #1 | Gói Tiêu Chuẩn                             │    │
│  │ Gốc: 2,000 USDC | Lãi: 78.90 USDC               │    │
│  │ Đáo hạn: 15/03/2026 | Còn 44 ngày               │    │
│  │ Trạng thái: Đang gửi                            │    │
│  │ [Xem chi tiết]                                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ #2 | Gói Linh Hoạt                              │    │
│  │ Gốc: 500 USDC | Lãi: 6.85 USDC                  │    │
│  │ Đáo hạn: 28/02/2026 | ĐÃ ĐÁO HẠN                │    │
│  │ Trạng thái: Sẵn sàng rút                        │    │
│  │ [Rút tiền] [Gia hạn]                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.5 Chi tiết sổ tiết kiệm (`/deposit/:id`)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Sổ tiết kiệm #1                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Tiền gốc │  │ Lãi dự   │  │ Tổng     │               │
│  │ 2,000    │  │ kiến     │  │ nhận     │               │
│  │ USDC     │  │ 78.90    │  │ 2,078.90 │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  Thông tin chi tiết                                     │
│  ├─ Gói: Tiêu Chuẩn                                     │
│  ├─ Lãi suất: 8% / năm                                  │
│  ├─ Ngày gửi: 30/01/2026                                │
│  ├─ Ngày đáo hạn: 30/07/2026                            │
│  ├─ Kỳ hạn: 180 ngày                                    │
│  └─ Trạng thái: Đang gửi                                │
│                                                         │
│  Tiến độ                                                │
│  ██████████░░░░░░░░░░░░░░░░░░░░ 33% (60/180 ngày)       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Nếu rút ngay (trước hạn):                       │    │
│  │ Phí phạt: 100 USDC (5%)                         │    │
│  │ Bạn nhận: 1,900 USDC                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [Rút trước hạn]                      [Gia hạn]         │
│  (chỉ hiện khi đáo hạn)                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Giao diện Admin

### 4.1 Admin Dashboard (`/admin`)

Tổng quan hệ thống cho admin.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ Tổng TVL │  │ Tổng số  │  │ Vault    │  │ Gói     │  │
│  │ 150,000  │  │ deposits │  │ Balance  │  │ Active  │  │
│  │ USDC     │  │ 45       │  │ 20,000   │  │ 3       │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                         │
│  Phân bổ theo gói                                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Gói Linh Hoạt    | 15 deposits | 25,000 USDC    │    │
│  │ Gói Tiêu Chuẩn   | 20 deposits | 80,000 USDC    │    │
│  │ Gói Cao Cấp      | 10 deposits | 45,000 USDC    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Lãi phải trả (ước tính)                                │
│  ├─ Tháng này: 1,200 USDC                               │
│  ├─ Tháng sau: 1,500 USDC                               │
│  └─ Vault còn đủ trả: 16 tháng                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Dữ liệu cần đọc:**

- Loop qua tất cả deposits (từ events hoặc on-chain)
- Tính tổng principal theo từng plan
- `vault.getBalance()` - Số dư Vault
- Ước tính lãi phải trả dựa trên deposits active

### 4.2 Quản lý gói tiết kiệm (`/admin/plans`)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Quản lý gói tiết kiệm                    [+ Tạo mới]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ID │ Tên          │ Lãi  │ Kỳ hạn   │ Deposits │ TT ││
│  ├────┼──────────────┼──────┼──────────┼──────────┼────┤│
│  │ 1  │ Linh Hoạt    │ 5%   │ 30-90    │ 15       │ ON ││
│  │ 2  │ Tiêu Chuẩn   │ 8%   │ 90-365   │ 20       │ ON ││
│  │ 3  │ Cao Cấp      │ 10%  │ 180-365  │ 10       │ ON ││
│  │ 4  │ Khuyến Mãi   │ 12%  │ 30-60    │ 0        │ OFF││
│  └────┴──────────────┴──────┴──────────┴──────────┴────┘│
│                                                         │
│  Ghi chú: Không thể xóa gói có deposits đang active     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Form tạo/sửa gói (Modal)

```
┌─────────────────────────────────────────┐
│  Tạo gói tiết kiệm mới                  │
├─────────────────────────────────────────┤
│                                         │
│  Tên gói                                │
│  ┌─────────────────────────────┐        │
│  │ Gói Tiết Kiệm Xuân 2026     │        │
│  └─────────────────────────────┘        │
│                                         │
│  Lãi suất (% / năm)                     │
│  ┌─────────────────────────────┐        │
│  │ 8                           │        │
│  └─────────────────────────────┘        │
│                                         │
│  Kỳ hạn (ngày)                          │
│  Min: [30]  Max: [365]                  │
│                                         │
│  Số tiền gửi (USDC)                     │
│  Min: [100]  Max: [50000]               │
│                                         │
│  Phí phạt rút sớm (%)                   │
│  ┌─────────────────────────────┐        │
│  │ 5                           │        │
│  └─────────────────────────────┘        │
│                                         │
│  [Hủy]                    [Tạo gói]     │
└─────────────────────────────────────────┘
```

### 4.4 Quản lý Vault (`/admin/vault`)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Quản lý Vault (Quỹ thanh khoản)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Vault Balance│  │ Tổng nợ lãi  │  │ Dự trữ       │   │
│  │ 20,000 USDC  │  │ 12,000 USDC  │  │ 8,000 USDC   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                         │
│  Nạp thêm vốn                                           │
│  ┌─────────────────────────────┐                        │
│  │ 5000                        │  [Nạp]                 │
│  └─────────────────────────────┘                        │
│  Admin USDC: 100,000 USDC                               │
│                                                         │
│  Rút vốn dư                                             │
│  ┌─────────────────────────────┐                        │
│  │ 1000                        │  [Rút]                 │
│  └─────────────────────────────┘                        │
│  Tối đa có thể rút: 8,000 USDC (phần dự trữ)            │
│                                                         │
│  Lịch sử giao dịch                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 29/01/2026 | Nạp    | +10,000 USDC | 0x1234...  │    │
│  │ 25/01/2026 | Trả lãi| -500 USDC    | 0xabcd...  │    │
│  │ 20/01/2026 | Nạp    | +5,000 USDC  | 0x5678...  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Routes

```typescript
const routes = [
  // User routes
  { path: "/", component: UserDashboard },
  { path: "/plans", component: Plans },
  { path: "/my-deposits", component: MyDeposits },
  { path: "/deposit/:id", component: DepositDetail },

  // Admin routes (protected)
  { path: "/admin", component: AdminDashboard },
  { path: "/admin/plans", component: AdminPlans },
  { path: "/admin/vault", component: AdminVault },
];
```

---

## 6. Composables

| Composable   | Chức năng                                                 |
| ------------ | --------------------------------------------------------- |
| useWallet    | Connect/disconnect, address, signer                       |
| useContracts | Contract instances (usdc, savingBank, vault, certificate) |
| usePlans     | Đọc danh sách plans, tạo plan mới                         |
| useDeposits  | Đọc deposits của user, create/withdraw/renew              |
| useAdmin     | Check admin role, vault operations                        |
| useStats     | Tính toán thống kê (tổng TVL, số deposits, etc.)          |

---

## 7. Các bước thực hiện

### Phase 1: Setup (ngày 1-2)

- [ ] Khởi tạo Vue + Vite + TypeScript
- [ ] Cài Vue Router, Tailwind CSS, Ethers.js
- [ ] Tạo cấu trúc thư mục
- [ ] Copy ABIs
- [ ] useWallet, useContracts composables
- [ ] Navbar + ConnectWallet

### Phase 2: User - Đọc dữ liệu (ngày 3-4)

- [ ] User Dashboard với stats
- [ ] Plans page với PlanCard
- [ ] MyDeposits page với DepositCard
- [ ] DepositDetail page

### Phase 3: User - Ghi dữ liệu (ngày 5-6)

- [ ] DepositForm modal
- [ ] Approve flow
- [ ] WithdrawModal
- [ ] RenewModal

### Phase 4: Admin (ngày 7-8)

- [ ] Admin role check
- [ ] Admin Dashboard với stats
- [ ] AdminPlans với PlanForm
- [ ] AdminVault với deposit/withdraw

### Phase 5: Polish (ngày 9-10)

- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design
- [ ] Test trên testnet

---

## 8. Timeline

| Ngày | Task                                    |
| ---- | --------------------------------------- |
| 1-2  | Setup + useWallet + Navbar              |
| 3-4  | User pages (đọc dữ liệu)                |
| 5-6  | User actions (deposit, withdraw, renew) |
| 7-8  | Admin pages                             |
| 9-10 | Polish + Test                           |

Tổng: khoảng 2 tuần cho bản đầy đủ.
