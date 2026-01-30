# Saving Banking

Hệ thống tiết kiệm ngân hàng trên blockchain. Người dùng gửi tiền có kỳ hạn và nhận lãi suất, tài sản được quản lý bởi smart contract.

---

## Tổng quan

Hệ thống cho phép:

- Người dùng mở sổ tiết kiệm, chọn gói và kỳ hạn
- Rút tiền khi đáo hạn (nhận gốc + lãi) hoặc rút sớm (chịu phạt)
- Gia hạn sổ tiết kiệm với lãi kép
- Admin tạo các gói tiết kiệm và quản lý quỹ thanh khoản

Mỗi khoản gửi được đại diện bằng NFT (ERC721), có thể chuyển nhượng.

---

## Cấu trúc

```
contracts/
├── SavingBank.sol          # Logic nghiệp vụ chính
├── vault/Vault.sol         # Quản lý quỹ thanh khoản
├── certificates/           # NFT đại diện sổ tiết kiệm
├── libraries/              # Thư viện tính lãi suất
├── interfaces/             # Các interface
└── tokens/MockUSDC.sol     # Token test

deploy/                     # Scripts triển khai
test/                       # Test cases
documents/                  # Tài liệu dự án
```

---

## Cài đặt

```bash
npm install --legacy-peer-deps
npx hardhat compile
npx hardhat test
```

Chạy local:

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

---

## Triển khai Testnet

1. Cấu hình file .env:

```
TESTNET_PRIVATE_KEY=<private_key>
ETHERSCAN_API_KEY=<api_key>
```

2. Deploy:

```bash
npx hardhat deploy --network sepolia
```

3. Verify contracts:

```bash
npx hardhat verify --network sepolia <ADDRESS> [constructor_args]
```

---

## Tài liệu

| File                                       | Nội dung           |
| ------------------------------------------ | ------------------ |
| [QUEST.md](documents/QUEST.md)             | Yêu cầu sản phẩm   |
| [REQUIREMENT.md](documents/REQUIREMENT.md) | Kiến trúc hệ thống |
| [PLAN.md](documents/PLAN.md)               | Kế hoạch thực thi  |
| [TEST.md](documents/TEST.md)               | Checklist kiểm thử |

---

## License

MIT
