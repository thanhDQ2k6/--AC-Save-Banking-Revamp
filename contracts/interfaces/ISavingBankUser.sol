// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankUser {
    function createDeposit(uint256 planId, uint256 amount, uint32 termDays) external returns (uint256 depositId);
    function withdraw(uint256 depositId) external;
    function renew(uint256 depositId, uint256 newPlanId, uint32 newTermDays) external returns (uint256 newDepositId);
}
