// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankEvents {
    // Plan events
    event PlanCreated(uint256 indexed planId, string name);
    event PlanUpdated(uint256 indexed planId);
    event PlanActiveChanged(uint256 indexed planId, bool active);
    
    // Deposit events
    event DepositCreated(
        uint256 indexed depositId,
        address indexed user,
        uint256 planId,
        uint256 amount,
        uint256 maturityTime
    );
    
    event Withdrawn(
        uint256 indexed depositId,
        address indexed user,
        uint256 payout,
        uint256 interest,
        uint256 penalty,
        bool early
    );
    
    event Renewed(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256 newAmount
    );
    
    // Vault events
    event VaultDeposited(uint256 amount);
    event VaultWithdrawn(uint256 amount);
    
    // Config events
    event PenaltyReceiverChanged(address receiver);
}
