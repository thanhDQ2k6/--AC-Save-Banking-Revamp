// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankErrors {
    // Access
    error NotAdmin();
    error NotOwner();
    
    // Plan
    error PlanNotFound();
    error PlanNotActive();
    error InvalidPlan();
    
    // Deposit
    error DepositNotFound();
    error DepositClosed();
    error DepositNotMature();
    
    // Amount & Term
    error InvalidAmount();
    error InvalidTerm();
    
    // Vault
    error InsufficientLiquidity();
}
