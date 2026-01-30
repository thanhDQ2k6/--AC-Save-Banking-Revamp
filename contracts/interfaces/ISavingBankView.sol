// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

interface ISavingBankView is ISavingBankStructs {
    function getPlan(uint256 planId) external view returns (SavingPlan memory);
    function getDeposit(uint256 depositId) external view returns (Deposit memory);
    function calculateInterest(uint256 amount, uint256 planId, uint32 termDays) external view returns (uint256);
}
