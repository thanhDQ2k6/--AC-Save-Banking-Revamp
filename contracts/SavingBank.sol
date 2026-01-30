// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISavingBankStructs.sol";
import "./interfaces/ISavingBankErrors.sol";
import "./interfaces/ISavingBankEvents.sol";
import "./interfaces/IDepositCertificate.sol";
import "./interfaces/IVault.sol";
import "./libraries/InterestCalculator.sol";

/**
 * @title SavingBank
 * @notice Core contract cho hệ thống tiết kiệm on-chain
 * @dev Kiến trúc đơn giản: Admin (deployer) và User (bất kỳ ai)
 */
contract SavingBank is Pausable, ReentrancyGuard, ISavingBankErrors, ISavingBankEvents {
    using SafeERC20 for IERC20;
    using InterestCalculator for uint256;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    address public immutable admin;
    IERC20 public immutable token;
    IVault public immutable vault;
    IDepositCertificate public immutable certificate;
    
    address public penaltyReceiver;
    
    mapping(uint256 => ISavingBankStructs.SavingPlan) private _plans;
    mapping(uint256 => ISavingBankStructs.Deposit) private _deposits;
    
    uint256 private _nextPlanId = 1;
    uint256 private _nextDepositId = 1;

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(address tokenAddress, address certificateAddress, address vaultAddress) {
        require(tokenAddress != address(0) && certificateAddress != address(0) && vaultAddress != address(0));
        
        admin = msg.sender;
        token = IERC20(tokenAddress);
        certificate = IDepositCertificate(certificateAddress);
        vault = IVault(vaultAddress);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Plan Management
    // ═══════════════════════════════════════════════════════════════════════════

    function createPlan(ISavingBankStructs.PlanInput calldata input) external onlyAdmin {
        _validatePlanInput(input);
        
        uint256 planId = _nextPlanId++;
        
        _plans[planId] = ISavingBankStructs.SavingPlan({
            id: planId,
            name: input.name,
            minAmount: input.minAmount,
            maxAmount: input.maxAmount,
            minTermDays: input.minTermDays,
            maxTermDays: input.maxTermDays,
            interestRateBps: input.interestRateBps,
            penaltyRateBps: input.penaltyRateBps,
            isActive: true
        });

        emit PlanCreated(planId, input.name);
    }

    function updatePlan(uint256 planId, ISavingBankStructs.PlanInput calldata input) external onlyAdmin {
        if (_plans[planId].id == 0) revert PlanNotFound();
        _validatePlanInput(input);
        
        ISavingBankStructs.SavingPlan storage plan = _plans[planId];
        plan.name = input.name;
        plan.minAmount = input.minAmount;
        plan.maxAmount = input.maxAmount;
        plan.minTermDays = input.minTermDays;
        plan.maxTermDays = input.maxTermDays;
        plan.interestRateBps = input.interestRateBps;
        plan.penaltyRateBps = input.penaltyRateBps;

        emit PlanUpdated(planId);
    }

    function setPlanActive(uint256 planId, bool active) external onlyAdmin {
        if (_plans[planId].id == 0) revert PlanNotFound();
        _plans[planId].isActive = active;
        emit PlanActiveChanged(planId, active);
    }

    function _validatePlanInput(ISavingBankStructs.PlanInput calldata input) internal pure {
        if (input.minTermDays == 0) revert InvalidPlan();
        if (input.maxTermDays <= input.minTermDays) revert InvalidPlan();
        if (input.interestRateBps == 0) revert InvalidPlan();
        if (input.penaltyRateBps > 10000) revert InvalidPlan();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Vault Management
    // ═══════════════════════════════════════════════════════════════════════════

    function depositToVault(uint256 amount) external onlyAdmin {
        if (amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.forceApprove(address(vault), amount);
        vault.deposit(amount);
        emit VaultDeposited(amount);
    }

    function withdrawFromVault(uint256 amount) external onlyAdmin {
        if (amount == 0) revert InvalidAmount();
        vault.withdraw(amount, msg.sender);
        emit VaultWithdrawn(amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Configuration
    // ═══════════════════════════════════════════════════════════════════════════

    function setPenaltyReceiver(address receiver) external onlyAdmin {
        penaltyReceiver = receiver;
        emit PenaltyReceiverChanged(receiver);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - Deposit
    // ═══════════════════════════════════════════════════════════════════════════

    function createDeposit(
        uint256 planId,
        uint256 amount,
        uint32 termDays
    ) external nonReentrant whenNotPaused returns (uint256 depositId) {
        ISavingBankStructs.SavingPlan memory plan = _plans[planId];
        if (plan.id == 0) revert PlanNotFound();
        if (!plan.isActive) revert PlanNotActive();
        
        _validateDepositParams(plan, amount, termDays);

        depositId = _nextDepositId++;
        uint256 maturityTime = block.timestamp + (uint256(termDays) * 1 days);

        _deposits[depositId] = ISavingBankStructs.Deposit({
            id: depositId,
            planId: planId,
            amount: amount,
            termDays: termDays,
            startTime: block.timestamp,
            maturityTime: maturityTime,
            isClosed: false
        });

        // Transfer tokens to vault
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.forceApprove(address(vault), amount);
        vault.deposit(amount);
        
        // Mint NFT
        certificate.mintCertificate(msg.sender, depositId);

        emit DepositCreated(depositId, msg.sender, planId, amount, maturityTime);
    }

    function _validateDepositParams(
        ISavingBankStructs.SavingPlan memory plan,
        uint256 amount,
        uint32 termDays
    ) internal pure {
        if (amount < plan.minAmount) revert InvalidAmount();
        if (plan.maxAmount > 0 && amount > plan.maxAmount) revert InvalidAmount();
        if (termDays < plan.minTermDays) revert InvalidTerm();
        if (termDays > plan.maxTermDays) revert InvalidTerm();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - Withdraw
    // ═══════════════════════════════════════════════════════════════════════════

    function withdraw(uint256 depositId) external nonReentrant whenNotPaused {
        ISavingBankStructs.Deposit storage d = _deposits[depositId];
        if (d.id == 0) revert DepositNotFound();
        if (d.isClosed) revert DepositClosed();
        if (certificate.ownerOf(depositId) != msg.sender) revert NotOwner();

        ISavingBankStructs.SavingPlan memory plan = _plans[d.planId];
        bool early = block.timestamp < d.maturityTime;

        uint256 payout;
        uint256 interest;
        uint256 penalty;

        if (early) {
            penalty = d.amount.calculatePenalty(plan.penaltyRateBps);
            payout = d.amount - penalty;

            if (penaltyReceiver != address(0)) {
                vault.withdraw(d.amount, address(this));
                token.safeTransfer(msg.sender, payout);
                token.safeTransfer(penaltyReceiver, penalty);
            } else {
                vault.withdraw(payout, msg.sender);
                // penalty stays in vault
            }
        } else {
            interest = d.amount.calculateSimpleInterest(plan.interestRateBps, d.termDays);
            payout = d.amount + interest;
            vault.withdraw(payout, msg.sender);
        }

        d.isClosed = true;
        certificate.burn(depositId);

        emit Withdrawn(depositId, msg.sender, payout, interest, penalty, early);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - Renew
    // ═══════════════════════════════════════════════════════════════════════════

    function renew(
        uint256 depositId,
        uint256 newPlanId,
        uint32 newTermDays
    ) external nonReentrant whenNotPaused returns (uint256 newDepositId) {
        ISavingBankStructs.Deposit storage old = _deposits[depositId];
        if (old.id == 0) revert DepositNotFound();
        if (old.isClosed) revert DepositClosed();
        if (certificate.ownerOf(depositId) != msg.sender) revert NotOwner();
        if (block.timestamp < old.maturityTime) revert DepositNotMature();

        ISavingBankStructs.SavingPlan memory oldPlan = _plans[old.planId];
        uint256 interest = old.amount.calculateSimpleInterest(oldPlan.interestRateBps, old.termDays);
        uint256 newAmount = old.amount + interest;

        // Close old deposit
        old.isClosed = true;
        certificate.burn(depositId);

        // Validate new plan
        ISavingBankStructs.SavingPlan memory newPlan = _plans[newPlanId];
        if (newPlan.id == 0) revert PlanNotFound();
        if (!newPlan.isActive) revert PlanNotActive();
        _validateDepositParams(newPlan, newAmount, newTermDays);

        // Create new deposit (no token transfer, funds already in vault)
        newDepositId = _nextDepositId++;
        uint256 newMaturityTime = block.timestamp + (uint256(newTermDays) * 1 days);

        _deposits[newDepositId] = ISavingBankStructs.Deposit({
            id: newDepositId,
            planId: newPlanId,
            amount: newAmount,
            termDays: newTermDays,
            startTime: block.timestamp,
            maturityTime: newMaturityTime,
            isClosed: false
        });

        certificate.mintCertificate(msg.sender, newDepositId);

        emit Renewed(depositId, newDepositId, newAmount);
        emit DepositCreated(newDepositId, msg.sender, newPlanId, newAmount, newMaturityTime);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function getPlan(uint256 planId) external view returns (ISavingBankStructs.SavingPlan memory) {
        if (_plans[planId].id == 0) revert PlanNotFound();
        return _plans[planId];
    }

    function getDeposit(uint256 depositId) external view returns (ISavingBankStructs.Deposit memory) {
        if (_deposits[depositId].id == 0) revert DepositNotFound();
        return _deposits[depositId];
    }

    function calculateInterest(
        uint256 amount,
        uint256 planId,
        uint32 termDays
    ) external view returns (uint256) {
        ISavingBankStructs.SavingPlan memory plan = _plans[planId];
        if (plan.id == 0) revert PlanNotFound();
        return amount.calculateSimpleInterest(plan.interestRateBps, termDays);
    }
}
