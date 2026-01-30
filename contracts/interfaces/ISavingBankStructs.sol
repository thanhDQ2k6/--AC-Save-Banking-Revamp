// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankStructs {
    /// @notice Gói tiết kiệm
    struct SavingPlan {
        uint256 id;
        string name;
        uint256 minAmount;
        uint256 maxAmount;         // 0 = unlimited
        uint32 minTermDays;
        uint32 maxTermDays;
        uint256 interestRateBps;   // annual, basis points
        uint256 penaltyRateBps;    // early withdrawal penalty
        bool isActive;
    }

    /// @notice Input để tạo/cập nhật plan
    struct PlanInput {
        string name;
        uint256 minAmount;
        uint256 maxAmount;
        uint32 minTermDays;
        uint32 maxTermDays;
        uint256 interestRateBps;
        uint256 penaltyRateBps;
    }

    /// @notice Sổ tiết kiệm - owner lấy từ NFT ownerOf(id)
    struct Deposit {
        uint256 id;
        uint256 planId;
        uint256 amount;
        uint32 termDays;
        uint256 startTime;
        uint256 maturityTime;
        bool isClosed;
    }
}
