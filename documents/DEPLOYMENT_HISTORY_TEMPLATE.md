# Deployment History

## Template

Mỗi lần deploy, copy template bên dưới và điền thông tin:

```markdown
### Deploy #X - [Date]

**Network:** Sepolia (chainId: 11155111)
**Deployer:** 0x...
**Status:** ✅ Success / ❌ Failed

#### Contracts

| Contract           | Address | Etherscan |
| ------------------ | ------- | --------- |
| MockUSDC           | 0x...   | [Link]()  |
| DepositCertificate | 0x...   | [Link]()  |
| Vault              | 0x...   | [Link]()  |
| SavingBank         | 0x...   | [Link]()  |

#### Verification

| Contract           | Verified |
| ------------------ | -------- |
| MockUSDC           | [ ]      |
| DepositCertificate | [ ]      |
| Vault              | [ ]      |
| SavingBank         | [ ]      |

#### Setup

- [ ] Plans created
- [ ] Penalty receiver set
- [ ] Vault funded

#### Tests

- [ ] Create deposit
- [ ] Early withdraw
- [ ] View functions

#### Notes

_Any issues or observations_
```

---

## Deployments

### Deploy #1 - 2026/01/30

**Network:** Sepolia (chainId: 11155111)
**Deployer:**
**Status:** ✅ Success

#### Contracts

| Contract           | Address | Etherscan                                     |
| ------------------ | ------- | --------------------------------------------- |
| MockUSDC           |         | [Link](https://sepolia.etherscan.io/address/) |
| DepositCertificate |         | [Link](https://sepolia.etherscan.io/address/) |
| Vault              |         | [Link](https://sepolia.etherscan.io/address/) |
| SavingBank         |         | [Link](https://sepolia.etherscan.io/address/) |

#### Verification

| Contract           | Verified |
| ------------------ | -------- |
| MockUSDC           | [ ]      |
| DepositCertificate | [ ]      |
| Vault              | [ ]      |
| SavingBank         | [ ]      |

#### Setup

- [ ] Plans created (`npx hardhat run scripts/sepolia/setup.ts --network sepolia`)
- [ ] Penalty receiver set
- [ ] Vault funded (100,000 USDC)

#### Tests

- [ ] Create deposit
- [ ] Early withdraw
- [ ] View functions

#### Verify Commands

```bash
npx hardhat verify --network sepolia <USDC_ADDRESS>
npx hardhat verify --network sepolia <CERT_ADDRESS> "SavingBank Deposit Certificate" "SBDC"
npx hardhat verify --network sepolia <VAULT_ADDRESS> <USDC_ADDRESS>
npx hardhat verify --network sepolia <BANK_ADDRESS> <USDC_ADDRESS> <CERT_ADDRESS> <VAULT_ADDRESS>
```

#### Notes

_First deployment_

---
