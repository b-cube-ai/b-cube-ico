// SPDX-License-Identifier: Unlicense
pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./BCubePublicSale.sol";

/**
 * @title BCUBE Treasury for Public Sale
 * @notice Contract in which 15m BCUBE will be transfered after public sale,
 * and distributed to stakeholders to whomever applicable
 **/

contract PublicSaleTreasury is BCubePublicSale {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice timestamp at which BCUBE will be listed on CEXes/DEXes
    uint256 public listingTime;

    IERC20 public token;

    event LogEtherReceived(address indexed sender, uint256 value);
    event LogListingTimeChange(uint256 prevListingTime, uint256 newListingTime);
    event LogPublicSaleShareWithdrawn(
        address indexed participant,
        uint256 bcubeAmountWithdrawn
    );

    modifier onlyAfterListing() {
        require(now >= listingTime, "Only callable after listing");
        _;
    }

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        address payable _wallet,
        address _admin,
        IERC20 _token,
        uint256 _openingTime,
        uint256 _closingTime,
        address _chainlinkETHPriceFeed,
        address _chainlinkUSDTPriceFeed,
        address _usdtContract,
        address _privateSale,
        uint256 _listingTime
    )
        public
        BCubePublicSale(
            _openingTime,
            _closingTime,
            _chainlinkETHPriceFeed,
            _chainlinkUSDTPriceFeed,
            _usdtContract,
            _privateSale,
            _wallet
        )
    {
        setAdmin(_admin);
        token = _token;
        listingTime = _listingTime;
    }

    /// @dev WhitelistAdmin is the deployer
    /// @dev allows deployer to change listingTime, before current listingTime
    function setListingTime(uint256 _startTime) external onlyWhitelistAdmin {
        require(now < listingTime, "listingTime unchangable after listing");
        uint256 prevListingTime = listingTime;
        listingTime = _startTime;
        emit LogListingTimeChange(prevListingTime, listingTime);
    }

    /// @dev allows private sale participants to withdraw their allocated share of
    function publicSaleShareWithdraw(uint256 bcubeAmount)
        external
        onlyAfterListing
    {
        require(
            bcubeAllocationRegistry[_msgSender()].allocatedBcube > 0,
            "!publicSaleParticipant || 0 BCUBE allocated"
        );
        uint256 finalWithdrawn = bcubeAllocationRegistry[_msgSender()]
            .shareWithdrawn
            .add(bcubeAmount);
        require(
            finalWithdrawn <= bcubeAllocationRegistry[_msgSender()].allocatedBcube,
            "Insufficient allocatedBcube"
        );
        bcubeAllocationRegistry[_msgSender()].shareWithdrawn = finalWithdrawn;
        token.safeTransfer(_msgSender(), bcubeAmount);
        emit LogPublicSaleShareWithdrawn(_msgSender(), bcubeAmount);
    }
}
