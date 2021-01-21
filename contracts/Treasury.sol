// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./BCubePrivateSale.sol";

contract Treasury is BCubePrivateSale {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Advisor {
        uint256 increaseInAllowance;
        uint256 currentAllowance;
        uint256 shareWithdrawn;
    }

    mapping(address => Advisor) public advisors;

    uint256 public teamShareWithdrawn;
    uint256 public teamAllowance;
    uint256 public devFundShareWithdrawn;
    uint256 public devFundAllowance;
    uint256 public reservesWithdrawn;
    uint256 public communityShareWithdrawn;
    uint256 public bountyWithdrawn;
    uint256 public publicSaleShareWithdrawn;

    uint256 public listingTime;

    event LogEtherReceived(address indexed sender, uint256 value);
    event LogListingTimeChange(uint256 prevListingTime, uint256 newListingTime);
    event LogAdvisorAddition(
        address indexed newAdvisor,
        uint256 newNetAllowance
    );
    event LogAdvisorAllowanceChange(
        address indexed advisor,
        uint256 prevNetAllowance,
        uint256 newNetAllowance
    );
    event LogAdvisorRemoval(address indexed removedAdvisor);
    event LogAdvisorShareWithdrawn(
        address indexed advisor,
        uint256 bcubeAmountWithdrawn
    );
    event LogTeamShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogDevFundShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogReservesShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogCommunityShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogBountyShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogPublicSaleShareWithdrawn(uint256 bcubeAmountWithdrawn);
    event LogPrivateSaleShareWithdrawn(
        address indexed participant,
        uint256 bcubeAmountWithdrawn
    );

    modifier onlyTeam() {
        require(_msgSender() == wallet(), "Only team can call");
        _;
    }

    modifier onlyAfterListing() {
        require(now >= listingTime, "Only callable after listing");
        _;
    }

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        address payable wallet_,
        IERC20 token_,
        uint256 openingTime_,
        uint256 closingTime_,
        address _chainlinkETHPriceFeed,
        address _chainlinkUSDTPriceFeed,
        address _usdtContract,
        uint256 _listingTime
    )
        public
        BCubePrivateSale(
            wallet_,
            token_,
            openingTime_,
            closingTime_,
            _chainlinkETHPriceFeed,
            _chainlinkUSDTPriceFeed,
            _usdtContract
        )
    {
        listingTime = _listingTime;
    }

    function setListingTime(uint256 _startTime) external onlyWhitelistAdmin {
        require(now < listingTime, "listingTime unchangable after listing");
        uint256 prevListingTime = listingTime;
        listingTime = _startTime;
        emit LogListingTimeChange(prevListingTime, listingTime);
    }

    function addAdvisor(address _newAdvisor, uint256 _netAllowance)
        external
        onlyWhitelistAdmin
    {
        require(_newAdvisor != address(0), "Invalid advisor address");
        advisors[_newAdvisor].increaseInAllowance = _netAllowance.div(4);
        emit LogAdvisorAddition(_newAdvisor, _netAllowance);
    }

    function setAdvisorAllowance(address _advisor, uint256 _newNetAllowance)
        external
        onlyWhitelistAdmin
    {
        uint256 prevNetAllowance;
        require(advisors[_advisor].increaseInAllowance > 0, "Invalid advisor");
        prevNetAllowance = advisors[_advisor].increaseInAllowance.mul(4);
        advisors[_advisor].increaseInAllowance = _newNetAllowance.div(4);
        emit LogAdvisorAllowanceChange(
            _advisor,
            prevNetAllowance,
            _newNetAllowance
        );
    }

    function removeAdvisor(address _advisor) external onlyWhitelistAdmin {
        require(advisors[_advisor].increaseInAllowance > 0, "Invalid advisor");
        delete advisors[_advisor];
        emit LogAdvisorRemoval(_advisor);
    }

    function advisorShareWithdraw(uint256 bcubeAmount)
        external
        onlyAfterListing
    {
        uint256 allowance;
        require(advisors[_msgSender()].increaseInAllowance > 0, "!advisor");
        uint256 increase = advisors[_msgSender()].increaseInAllowance;
        if (now >= listingTime + 104 weeks) allowance = increase * 4;
        else if (now >= listingTime + 78 weeks) allowance = increase * 3;
        else if (now >= listingTime + 52 weeks) allowance = increase * 2;
        else if (now >= listingTime + 26 weeks) allowance = increase;
        if (allowance != advisors[_msgSender()].currentAllowance)
            advisors[_msgSender()].currentAllowance = allowance;
        uint256 finalAdvisorShareWithdrawn;
        finalAdvisorShareWithdrawn = advisors[_msgSender()].shareWithdrawn.add(
            bcubeAmount
        );
        require(
            finalAdvisorShareWithdrawn <=
                advisors[_msgSender()].currentAllowance,
            "Out of advisor share"
        );
        advisors[_msgSender()].shareWithdrawn = finalAdvisorShareWithdrawn;
        token().safeTransfer(_msgSender(), bcubeAmount);
        emit LogAdvisorShareWithdrawn(_msgSender(), bcubeAmount);
    }

    function devFundShareWithdraw(uint256 bcubeAmount)
        external
        onlyTeam
        onlyAfterListing
    {
        uint256 allowance;
        if (now >= listingTime + 104 weeks) allowance = 1_875_000e18 * 4;
        else if (now >= listingTime + 78 weeks) allowance = 1_875_000e18 * 3;
        else if (now >= listingTime + 52 weeks) allowance = 1_875_000e18 * 2;
        else if (now >= listingTime + 26 weeks) allowance = 1_875_000e18;
        if (allowance != devFundAllowance) devFundAllowance = allowance;
        uint256 finalDevFundShareWithdrawn;
        finalDevFundShareWithdrawn = devFundShareWithdrawn.add(bcubeAmount);
        require(
            finalDevFundShareWithdrawn <= devFundAllowance,
            "Out of dev fund share"
        );
        devFundShareWithdrawn = finalDevFundShareWithdrawn;
        token().safeTransfer(wallet(), bcubeAmount);
        emit LogDevFundShareWithdrawn(bcubeAmount);
    }

    function teamShareWithdraw(uint256 bcubeAmount)
        external
        onlyTeam
        onlyAfterListing
    {
        uint256 allowance;
        if (now >= listingTime + 208 weeks) allowance = 625_000e18 * 8;
        else if (now >= listingTime + 182 weeks) allowance = 625_000e18 * 7;
        else if (now >= listingTime + 156 weeks) allowance = 625_000e18 * 6;
        else if (now >= listingTime + 130 weeks) allowance = 625_000e18 * 5;
        else if (now >= listingTime + 104 weeks) allowance = 625_000e18 * 4;
        else if (now >= listingTime + 78 weeks) allowance = 625_000e18 * 3;
        else if (now >= listingTime + 52 weeks) allowance = 625_000e18 * 2;
        else if (now >= listingTime + 26 weeks) allowance = 625_000e18;
        if (allowance != teamAllowance) teamAllowance = allowance;
        uint256 finalTeamShareWithdrawn;
        finalTeamShareWithdrawn = teamShareWithdrawn.add(bcubeAmount);
        require(finalTeamShareWithdrawn <= teamAllowance, "Out of team share");
        teamShareWithdrawn = finalTeamShareWithdrawn;
        token().safeTransfer(wallet(), bcubeAmount);
        emit LogTeamShareWithdrawn(bcubeAmount);
    }

    function reservesShareWithdraw(uint256 bcubeAmount)
        external
        onlyTeam
        onlyAfterListing
    {
        shareWithdraw(
            bcubeAmount,
            reservesWithdrawn,
            7_000_000e18,
            "Out of reserves share",
            0
        );
        emit LogReservesShareWithdrawn(bcubeAmount);
    }

    function communityShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            communityShareWithdrawn,
            2_500_000e18,
            "Out of community share",
            1
        );
        emit LogCommunityShareWithdrawn(bcubeAmount);
    }

    function bountyShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            bountyWithdrawn,
            500_000e18,
            "Out of bounty share",
            2
        );
        emit LogBountyShareWithdrawn(bcubeAmount);
    }

    function publicSaleShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            publicSaleShareWithdrawn,
            25_000_000e18 - netAllocatedBcube,
            "Out of publicSale share",
            3
        );
        emit LogPublicSaleShareWithdrawn(bcubeAmount);
    }

    function shareWithdraw(
        uint256 bcubeAmount,
        uint256 specificShareWithdrawn,
        uint256 cap,
        string memory errMsg,
        uint256 flag
    ) private {
        uint256 finalShareWithdrawn;
        finalShareWithdrawn = specificShareWithdrawn.add(bcubeAmount);
        require(finalShareWithdrawn <= cap, errMsg);
        if (flag == 0) reservesWithdrawn = finalShareWithdrawn;
        else if (flag == 1) communityShareWithdrawn = finalShareWithdrawn;
        else if (flag == 2) bountyWithdrawn = finalShareWithdrawn;
        else if (flag == 3) publicSaleShareWithdrawn = finalShareWithdrawn;
        token().safeTransfer(wallet(), bcubeAmount);
    }

    function privateSaleShareWithdraw(uint256 bcubeAmount)
        external
        onlyAfterListing
    {
        require(
            bcubeAllocationRegistry[_msgSender()].allocatedBcube > 0,
            "!privateSaleParticipant || 0 BCUBE allocated"
        );
        uint256 allowance;
        uint256 increase =
            bcubeAllocationRegistry[_msgSender()].allocatedBcube.div(4);
        if (now >= listingTime + 120 days) allowance = increase * 4;
        else if (now >= listingTime + 90 days) allowance = increase * 3;
        else if (now >= listingTime + 60 days) allowance = increase * 2;
        else if (now >= listingTime + 30 days) allowance = increase;
        if (allowance != bcubeAllocationRegistry[_msgSender()].currentAllowance)
            bcubeAllocationRegistry[_msgSender()].currentAllowance = allowance;
        uint256 finalPSSWithdrawn;
        finalPSSWithdrawn = bcubeAllocationRegistry[_msgSender()]
            .shareWithdrawn
            .add(bcubeAmount);
        require(
            finalPSSWithdrawn <=
                bcubeAllocationRegistry[_msgSender()].currentAllowance,
            "Insufficient allowance"
        );
        bcubeAllocationRegistry[_msgSender()]
            .shareWithdrawn = finalPSSWithdrawn;
        token().safeTransfer(_msgSender(), bcubeAmount);
        emit LogPrivateSaleShareWithdrawn(_msgSender(), bcubeAmount);
    }
}
