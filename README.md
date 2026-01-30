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

## Deployed Contracts (Sepolia Testnet)

> **Deploy Date:** 30/1/2026 | **Status:** ✅ Success | **Network:** Sepolia (chainId: 11155111)

| Contract           | Address                                      | Etherscan                                                                               |
| ------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| **SavingBank**     | `0x8906C80462cAA66610937D240cd8a4D4Ea51b1dE` | [View](https://sepolia.etherscan.io/address/0x8906C80462cAA66610937D240cd8a4D4Ea51b1dE) |
| **Vault**          | `0xdeA0F7D168a0A1367550687e80d7Ab85eADcf1d2` | [View](https://sepolia.etherscan.io/address/0xdeA0F7D168a0A1367550687e80d7Ab85eADcf1d2) |
| DepositCertificate | `0x8d4aa2A5c9E33AE2FF41A6453fE75C99c5ec57B9` | [View](https://sepolia.etherscan.io/address/0x8d4aa2A5c9E33AE2FF41A6453fE75C99c5ec57B9) |
| MockUSDC           | `0x3d45852a524595B255Dc2b45CF92a45e2c368312` | [View](https://sepolia.etherscan.io/address/0x3d45852a524595B255Dc2b45CF92a45e2c368312) |

**Tất cả contracts đã được verified trên Etherscan** ✅

📋 Chi tiết: [Deploy History](documents/Deploy_History/1st_attempt.md)

---

## Tài liệu

| File                                                           | Nội dung           |
| -------------------------------------------------------------- | ------------------ |
| [QUEST.md](documents/QUEST.md)                                 | Yêu cầu sản phẩm   |
| [REQUIREMENT.md](documents/REQUIREMENT.md)                     | Kiến trúc hệ thống |
| [CONTRACT_ARCHITECTURE.md](documents/CONTRACT_ARCHITECTURE.md) | Sơ đồ contract     |
| [PLAN.md](documents/PLAN.md)                                   | Kế hoạch thực thi  |
| [TEST.md](documents/TEST.md)                                   | Checklist kiểm thử |
| [DEPLOY_PLAN.md](documents/DEPLOY_PLAN.md)                     | Kế hoạch deploy    |
| [FRONTEND_PLAN.md](documents/FRONTEND_PLAN.md)                 | Kế hoạch frontend  |

---

## License

MIT
