// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVault.sol";

/**
 * @title Vault
 * @notice Quản lý quỹ thanh khoản cho SavingBank
 * @dev Chỉ SavingBank được phép deposit/withdraw
 */
contract Vault is IVault, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable token;
    address public savingBank;
    
    error NotSavingBank();
    error AlreadySet();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    
    modifier onlySavingBank() {
        if (msg.sender != savingBank) revert NotSavingBank();
        _;
    }
    
    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        token = IERC20(tokenAddress);
    }
    
    /// @inheritdoc IVault
    function setSavingBank(address bank) external {
        if (savingBank != address(0)) revert AlreadySet();
        if (bank == address(0)) revert ZeroAddress();
        savingBank = bank;
    }
    
    /// @inheritdoc IVault
    function deposit(uint256 amount) external onlySavingBank nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /// @inheritdoc IVault
    function withdraw(uint256 amount, address to) external onlySavingBank nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (token.balanceOf(address(this)) < amount) revert InsufficientBalance();
        token.safeTransfer(to, amount);
    }
    
    /// @inheritdoc IVault
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}