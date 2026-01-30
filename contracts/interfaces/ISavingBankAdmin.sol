// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

interface ISavingBankAdmin is ISavingBankStructs {
    function createPlan(PlanInput calldata input) external;
    function updatePlan(uint256 planId, PlanInput calldata input) external;
    function setPlanActive(uint256 planId, bool active) external;
    function setPenaltyReceiver(address receiver) external;
    function depositToVault(uint256 amount) external;
    function withdrawFromVault(uint256 amount) external;
    function pause() external;
    function unpause() external;
}
