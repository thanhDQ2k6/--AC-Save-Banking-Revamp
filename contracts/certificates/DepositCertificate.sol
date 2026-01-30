// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IDepositCertificate.sol";

/**
 * @title DepositCertificate
 * @author Saving Banking Team
 * @notice ERC721 NFT contract representing deposit certificates for saving plans
 * @dev Each deposit is represented by a unique, transferable NFT certificate
 * 
 * Features:
 * - Mints NFT when user creates a deposit (tokenId = depositId)
 * - Burns NFT when deposit is closed (optional, currently not used)
 * - Supports enumeration for listing user's certificates
 * - Transferable: allows secondary market for deposit positions
 * 
 * Security:
 * - Only MINTER_ROLE (typically SavingBank) can mint/burn certificates
 * - DEFAULT_ADMIN_ROLE can manage roles and set base URI
 */
contract DepositCertificate is ERC721, ERC721Enumerable, AccessControl, IDepositCertificate {
    /// @notice Role identifier for minting and burning certificates
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Mapping to track which deposit IDs have certificates
    mapping(uint256 => bool) private _depositExists;
    
    /// @dev Base URI for token metadata
    string private _baseTokenURI;

    /**
     * @notice Initializes the NFT collection with name and symbol
     * @dev Grants DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer
     * @param name The name of the NFT collection (e.g., "SavingBank Deposit Certificate")
     * @param symbol The symbol of the NFT collection (e.g., "SBDC")
     */
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mints a certificate NFT to represent a deposit
     * @dev Only callable by addresses with MINTER_ROLE (typically SavingBank)
     * @param to The address that will own the certificate
     * @param depositId The unique deposit ID (also becomes the tokenId)
     * @return The tokenId of the minted certificate (same as depositId)
     * 
     * Requirements:
     * - Certificate for this depositId must not already exist
     * - to must not be zero address
     * 
     * Note: The depositId is used as the tokenId for easy mapping
     */
    function mintCertificate(address to, uint256 depositId) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(!_depositExists[depositId], "Certificate already exists for this deposit");
        require(to != address(0), "Cannot mint to zero address");
        
        _depositExists[depositId] = true;
        _safeMint(to, depositId);
        return depositId; // tokenId is the same as depositId
    }

    /**
     * @notice Burns a certificate NFT when deposit is closed
     * @dev Only callable by addresses with MINTER_ROLE
     * @param depositId The deposit ID whose certificate will be burned
     * 
     * Requirements:
     * - Certificate for this depositId must exist
     */
    function burn(uint256 depositId) external onlyRole(MINTER_ROLE) {
        require(_depositExists[depositId], "Certificate does not exist");
        
        _depositExists[depositId] = false;
        _burn(depositId);
    }

    /**
     * @notice Burns a certificate NFT when deposit is closed (legacy name)
     * @dev Only callable by addresses with MINTER_ROLE
     * @param depositId The deposit ID whose certificate will be burned
     */
    function burnCertificate(uint256 depositId) external onlyRole(MINTER_ROLE) {
        require(_depositExists[depositId], "Certificate does not exist");
        
        _depositExists[depositId] = false;
        _burn(depositId);
    }

    /**
     * @notice Checks if a certificate exists for a given deposit ID
     * @param depositId The deposit ID to check
     * @return True if certificate exists, false otherwise
     */
    function exists(uint256 depositId) external view returns (bool) {
        return _depositExists[depositId];
    }

    /**
     * @notice Sets the base URI for token metadata
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param baseTokenURI The base URI to set (e.g., "https://api.savingbank.com/certificates/")
     */
    function setBaseURI(string memory baseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @notice Returns the base URI for token metadata
     * @return The configured base URI string
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override required for ERC721Enumerable compatibility
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override required for ERC721Enumerable compatibility
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @notice Checks if the contract supports a given interface
     * @param interfaceId The interface identifier to check
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}