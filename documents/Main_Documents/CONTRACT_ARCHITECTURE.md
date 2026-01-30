# Contract Architecture

## Tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                            EXTERNAL │
│     ┌──────────┐                             ┌────────────┐         │
│     │   User   │                             │   Admin    │         │
│     │ (anyone) │                             │ (deployer) │         │
│     └────┬─────┘                             └─────┬──────┘         │
└──────────┼─────────────────────────────────────────┼────────────────┘
           │                                         │
           │ createDeposit                           │ createPlan
           │ withdraw                                │ depositToVault
           │ renew                                   │ withdrawFromVault
           ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          ┌─────────────────┐              CONTRACTS │
│                          │   SavingBank    │                        │
│                          │                 │                        │
│                          │  admin (immut)  │                        │
│                          │  plans mapping  │                        │
│                          │  deposits map   │                        │
│                          └───────┬─────────┘                        │
│                                  │                                  │
│               ┌──────────────────┼───────────────────┐              │
│               ▼                  ▼                   ▼              │
│    ┌────────────────┐    ┌─────────────┐    ┌──────────────────┐    │
│    │   Deposit      │    │             │    │   Interest       │    │
│    │   Certificate  │    │    Vault    │    │   Calculator     │    │
│    │   (ERC721)     │    │─────────────│    │   (Library)      │    │
│    │────────────────│    │  savingBank │    │──────────────────│    │
│    │  - mint        │    │  (address)  │    │  - calculate     │    │
│    │  - burn        │    │             │    │    Interest      │    │
│    │  - ownerOf     │    │ - deposit   │    │  - calculate     │    │
│    │                │    │ - withdraw  │    │    Penalty       │    │
│    └────────────────┘    └──────┬──────┘    └──────────────────┘    │
│                                 │                                   │
│                                 ▼                                   │
│                          ┌──────────────┐                           │
│                          │   MockUSDC   │                           │
│                          │   (ERC20)    │                           │
│                          └──────────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Access Control

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                          SavingBank │
│  ┌──────────────────────┐             ┌─────────────────┐           │
│  │ onlyAdmin            │             │ User (anyone)   │           │
│  │ - createPlan         │             │ - createDeposit │           │
│  │ - updatePlan         │             │ - withdraw      │           │
│  │ - setPlanActive      │             │ - renew         │           │
│  │ - depositToVault     │             └─────────────────┘           │
│  │ - withdrawFromVault  │                                           │
│  │ - setPenaltyReceiver │                                           │
│  │ - pause/unpause      │                                           │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
           │                                       │
           │                                       │
           ▼ onlySavingBank                        ▼ MINTER_ROLE
┌─────────────────────┐               ┌─────────────────────┐
│       Vault         │               │ DepositCertificate  │
│ - deposit()         │               │ - mint()            │
│ - withdraw()        │               │ - burn()            │
└─────────────────────┘               └─────────────────────┘
```

---

## Data Flow

### User deposits USDC

```
User ────USDC───▶ SavingBank ──USDC──▶ Vault
                     │
                     ▼
          DepositCertificate ──NFT───▶ User
```

### User withdraws (matured)

```
User ──NFT──▶ SavingBank ─────────────burn──────────────▶ DepositCertificate
                  │
                  ▼
                Vault ─────USDC (principal + interest)──▶ User
```

### User withdraws (early)

```
User ──NFT──▶ SavingBank ───────────burn────────────▶ DepositCertificate
                  │
                  ▼
                Vault ──USDC (principal - penalty)──▶ User
```

---

## Data Structures

### SavingPlan

```solidity
struct SavingPlan {
    uint256 id;
    string name;
    uint256 minAmount;
    uint256 maxAmount;      // 0 = no limit
    uint32 minTermDays;
    uint32 maxTermDays;
    uint256 interestRateBps;
    uint256 penaltyRateBps;
    bool isActive;
}
```

### Deposit

```solidity
struct Deposit {
    uint256 id;
    uint256 planId;
    uint256 amount;
    uint32 termDays;
    uint256 startTime;
    uint256 maturityTime;
    bool isClosed;
}
```

> **Note**: Owner được xác định qua `certificate.ownerOf(depositId)`, không lưu trong struct.

---

## Interfaces

| File                    | Mô tả                          |
| ----------------------- | ------------------------------ |
| ISavingBankStructs.sol  | SavingPlan, PlanInput, Deposit |
| ISavingBankAdmin.sol    | Admin functions (8)            |
| ISavingBankUser.sol     | User functions (3)             |
| ISavingBankView.sol     | View functions (3)             |
| ISavingBankEvents.sol   | Events (10)                    |
| ISavingBankErrors.sol   | Custom errors (10)             |
| IVault.sol              | Vault interface (4)            |
| IDepositCertificate.sol | NFT interface                  |

---

## Security

| Cơ chế          | Mục đích                        |
| --------------- | ------------------------------- |
| ReentrancyGuard | Chống reentrancy attack         |
| Pausable        | Dừng khẩn cấp khi có vấn đề     |
| SafeERC20       | Xử lý an toàn ERC20             |
| onlyAdmin       | Chỉ admin gọi được admin funcs  |
| onlySavingBank  | Vault chỉ cho SavingBank gọi    |
| NFT ownership   | Kiểm tra ownerOf trước withdraw |
