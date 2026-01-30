// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVault {
    /// @notice Thiết lập địa chỉ SavingBank (chỉ gọi 1 lần)
    function setSavingBank(address bank) external;
    
    /// @notice Nạp token vào vault (chỉ SavingBank)
    function deposit(uint256 amount) external;
    
    /// @notice Rút token từ vault (chỉ SavingBank)
    function withdraw(uint256 amount, address to) external;
    
    /// @notice Số dư hiện tại
    function getBalance() external view returns (uint256);
    
    /// @notice Địa chỉ SavingBank
    function savingBank() external view returns (address);
}