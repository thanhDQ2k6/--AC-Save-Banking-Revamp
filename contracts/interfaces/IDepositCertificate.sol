// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IDepositCertificate is IERC721 {
    function mintCertificate(address to, uint256 depositId) external returns (uint256 tokenId);
    function burn(uint256 depositId) external;
    function exists(uint256 depositId) external view returns (bool);
}
