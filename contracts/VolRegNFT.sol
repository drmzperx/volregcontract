// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "hardhat/console.sol";

contract VolRegNFT is ERC721URIStorage, ERC721Enumerable, AccessControlEnumerable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address _contractAddress;
    address payable _owner;
    string private _internalBaseURI;
    string private _contractBaseURI;
    uint256 _nftBasePrice = 1.0 ether;
    mapping (uint256 => bool) private _isPublic;
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        string memory contractBaseURI,
        address marketplaceAddress
    ) ERC721(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _owner = payable(_msgSender());
        _internalBaseURI = baseURI;
        _contractAddress = marketplaceAddress;
        _contractBaseURI = contractBaseURI;
    }

    function createToken(string memory tokenURI_, bool isPublic_) payable public returns (uint) {
        require(msg.value >= _nftBasePrice, 'VolRel: Not enough MATIC sent: check price.');
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(msg.sender, newItemId);
        //TokenURI store meta-data IPFS CID string
        _setTokenURI(newItemId, tokenURI_);
        // _setupRole(MINTER_ROLE, _msgSender());
        _setPublic(newItemId, isPublic_);
        _owner.transfer(msg.value);
        setApprovalForAll(_contractAddress, true);
        return newItemId;
    }

    function burn(uint256 tokenId) public virtual {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721Burnable: caller is not owner nor approved"
        );
        _burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, AccessControlEnumerable, ERC721)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Enumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function setBaseURI(string memory newBaseUri) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "ERC721: must have admin role to change baseUri"
        );
        _internalBaseURI = newBaseUri;
    }

    function setContractBaseURI(string memory newContractBaseUri) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "ERC721: must have admin role to change baseUri"
        );
        _contractBaseURI = newContractBaseUri;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage, ERC721)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _setPublic(
        uint256 tokenId,
        bool isPublic_
    ) private {
        _isPublic[tokenId] = isPublic_;
    }

    function setPublic(
        uint256 tokenId,
        bool isPublic_
    ) payable public returns (bool) {
        // require(
        //     hasRole(MINTER_ROLE, _msgSender()),
        //     "ERC721: must have mint role to change publicity"
        // );
        // require(ownerOf(tokenId) == msg.sender, "Only token owner can put up token for sell");
        require(ownerOf(tokenId) == _msgSender(), "Ownable: caller is not the NFT owner");
        require(msg.value >= _nftBasePrice, 'VolRel: Not enough MATIC sent: check price.');
        _setPublic(tokenId, isPublic_);
        _owner.transfer(msg.value);
        return isPublic_;
    }

    function isPublic(uint256 tokenId) public view returns (bool) {
        return _isPublic[tokenId];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
        // _setupRole(MINTER_ROLE, _msgSender());
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _internalBaseURI;
    }

    function setPrice(
        uint256 price_
    ) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "ERC721: must have admin role to change nft price."
        );
        require(price_ > 0.0 ether, 'VolRel: Not enough MATIC sent: check price.');
        _nftBasePrice = price_;
    }

    function getPrice() public view returns (uint256) {
        return _nftBasePrice;
    }

    /**
     * Override isApprovedForAll to auto-approve OS's proxy contract
     * https://docs.opensea.io/docs/polygon-basic-integration
     */
    function isApprovedForAll(
        address owner_,
        address _operator
    ) public override view returns (bool isOperator) {
        // if OpenSea's ERC721 Proxy Address is detected, auto-return true
        if (_operator == address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)) {
            return true;
        }

        // if VolReg Market contract address is detected, auto-return true
        if (_operator == address(_contractAddress)) {
            return true;
        }
        
        // otherwise, use the default ERC721.isApprovedForAll()
        return ERC721.isApprovedForAll(owner_, _operator);
    }

    //https://docs.opensea.io/docs/contract-level-metadata
    function contractURI() public view returns (string memory) {
        return _contractBaseURI;
    }

}