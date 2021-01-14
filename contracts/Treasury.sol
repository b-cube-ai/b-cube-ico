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

    address payable public team;
    mapping(address => Advisor) advisors;

    uint256 public teamShareWithdrawn;
    uint256 public teamAllowance;
    uint256 public devFundShareWithdrawn;
    uint256 public devFundAllowance;
    uint256 public reservesWithdrawn;
    uint256 public communityShareWithdrawn;
    uint256 public bountyWithdrawn;
    uint256 public publicSaleShareWithdrawn;

    uint256 public listingTime;

    IERC20 bcube;

    event LogEtherReceived(address indexed sender, uint256 value);

    modifier onlyTeam() {
        require(_msgSender() == team, "Only team can call");
        _;
    }

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        IERC20 _bcubeAddress,
        address payable _team,
        uint256 _listingTime
    ) public {
        bcube = IERC20(_bcubeAddress);
        team = _team;
        listingTime = _listingTime;
    }

    function setListingTime(uint256 _startTime) external onlyOwner {
        listingTime = _startTime;
    }

    function addAdvisor(address _newAdvisor, uint256 _netAllowance)
        external
        onlyOwner
    {
        require(_newAdvisor != address(0), "Invalid advisor address");
        advisors[_newAdvisor].increaseInAllowance = _netAllowance.div(4);
    }

    function setAdvisorAllowance(address _advisor, uint256 _newNetAllowance)
        external
        onlyOwner
    {
        require(advisors[_advisor].increaseInAllowance > 0, "Invalid advisor");
        advisors[_advisor].increaseInAllowance = _newNetAllowance.div(4);
    }

    function removeAdvisor(address _advisor) external onlyOwner {
        require(advisors[_advisor].increaseInAllowance > 0, "Invalid advisor");
        delete advisors[_advisor];
    }

    function advisorShareWithdraw(uint256 bcubeAmount) external {
        require(
            advisors[_msgSender()].currentAllowance >= bcubeAmount,
            "!advisor || insufficient allowance"
        );
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
        bcube.safeTransfer(_msgSender(), bcubeAmount);
        uint256 finalAllowance =
            advisors[_msgSender()].currentAllowance.add(
                advisors[_msgSender()].increaseInAllowance
            );
        if (
            now >= listingTime + 24 weeks &&
            finalAllowance <= advisors[_msgSender()].increaseInAllowance.mul(4)
        ) advisors[_msgSender()].currentAllowance = finalAllowance;
    }

    function teamShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalTeamShareWithdrawn;
        finalTeamShareWithdrawn = teamShareWithdrawn.add(bcubeAmount);
        require(finalTeamShareWithdrawn <= teamAllowance, "Out of team share");
        teamShareWithdrawn = finalTeamShareWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
        if (
            now >= listingTime + 24 weeks &&
            teamAllowance.add(625_000e18) <= 5_000_000e18
        ) teamAllowance = teamAllowance.add(625_000e18);
    }

    function devFundShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalDevFundShareWithdrawn;
        finalDevFundShareWithdrawn = devFundShareWithdrawn.add(bcubeAmount);
        require(
            finalDevFundShareWithdrawn <= devFundAllowance,
            "Out of dev fund share"
        );
        devFundShareWithdrawn = finalDevFundShareWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
        if (
            now >= listingTime + 24 weeks &&
            devFundAllowance.add(1_875_000e18) <= 7_500_000e18
        ) devFundAllowance = devFundAllowance.add(625_000e18);
    }

    function reservesShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            reservesWithdrawn,
            7_000_000e18,
            "Out of reserves share",
            0
        );
    }

    function communityShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            communityShareWithdrawn,
            2_500_000e18,
            "Out of community share",
            1
        );
    }

    function bountyShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            bountyWithdrawn,
            500_000e18,
            "Out of bounty share",
            2
        );
    }

    function publicSaleShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        shareWithdraw(
            bcubeAmount,
            publicSaleShareWithdrawn,
            25_000_000e18 - netAllocatedBcube,
            "Out of publicSale share",
            3
        );
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
        bcube.safeTransfer(team, bcubeAmount);
    }

    function privateSaleShareWithdraw(uint256 bcubeAmount) external {
        require(
            bcubeAllocationRegistry[_msgSender()].allocatedBcube > 0,
            "0 BCUBE allocated"
        );
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
        bcube.safeTransfer(_msgSender(), bcubeAmount);
        uint256 finalAllowance =
            bcubeAllocationRegistry[_msgSender()].currentAllowance.add(
                bcubeAllocationRegistry[_msgSender()].allocatedBcube.div(4)
            );
        if (
            now >= listingTime + 4 weeks &&
            finalAllowance <=
            bcubeAllocationRegistry[_msgSender()].allocatedBcube
        )
            bcubeAllocationRegistry[_msgSender()]
                .currentAllowance = finalAllowance;
    }
}
