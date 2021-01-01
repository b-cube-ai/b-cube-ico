// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "./BCubePrivateSale.sol";

contract Treasury is BCubePrivateSale {
    using SafeMath for uint256;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    address payable public team;
    mapping(address => uint256) advisors;

    uint256 public teamShareWithdrawn;
    uint256 public teamAllowance;
    uint256 public devFundShareWithdrawn;
    uint256 public devFundAllowance;
    uint256 public reservesWithdrawn;
    uint256 public communityShareWithdrawn;
    uint256 public bountyWithdrawn;
    uint256 public publicSaleShareWithdrawn;

    uint256 public publicSaleStartTime;

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
        uint256 _teamReleaseTime,
        IERC20 _bcubeAddress,
        address payable _team,
        uint256 _publicSaleStartTime
    ) public {
        teamReleaseTime = _teamReleaseTime;
        bcube = IERC20(_bcubeAddress);
        team = _team;
        publicSaleStartTime = _publicSaleStartTime;
        teamAllowance = 625_000e18;
    }

    function setPublicSaleStartTime(uint256 _startTime) external onlyOwner {
        publicSaleStartTime = _startTime;
    }

    function teamShareWitdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalTeamShareWithdrawn;
        finalTeamShareWithdrawn = teamShareWithdrawn.add(bcubeAmount);
        require(finalTeamShareWithdrawn <= teamAllowance, "Out of team share");
        teamShareWithdrawn = finalTeamShareWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
        if (
            now >= publicSaleStartTime + 24 weeks &&
            teamAllowance + 625_000e18 <= 5_000_000e18
        ) teamAllowance = teamAllowance.add(625_000e18);
    }

    function devFundShareWitdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalDevFundShareWithdrawn;
        finalDevFundShareWithdrawn = devFundShareWithdrawn.add(bcubeAmount);
        require(
            finalDevFundShareWithdrawn <= devFundAllowance,
            "Out of dev fund share"
        );
        devFundShareWithdrawn = finalDevFundShareWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
        if (
            now >= publicSaleStartTime + 24 weeks &&
            devFundAllowance + 1_875_000e18 <= 7_500_000e18
        ) devFundAllowance = devFundAllowance.add(625_000e18);
    }

    function reservesShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalReservesWithdrawn;
        finalReservesWithdrawn = reservesWithdrawn.add(bcubeAmount);
        require(
            finalReservesWithdrawn <= 7_000_000e18,
            "Out of reserves share"
        );
        reservesWithdrawn = finalReservesWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
    }

    function communityShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalCommunityShareWithdrawn;
        finalCommunityShareWithdrawn = communityShareWithdrawn.add(bcubeAmount);
        require(
            finalCommunityShareWithdrawn <= 2_500_000e18,
            "Out of community share"
        );
        communityShareWithdrawn = finalCommunityShareWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
    }

    function bountyShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalBountyWithdrawn;
        finalBountyWithdrawn = bountyWithdrawn.add(bcubeAmount);
        require(finalBountyWithdrawn <= 500_000e18, "Out of bounty share");
        bountyWithdrawn = finalBountyWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
    }

    function publicSaleShareWithdraw(uint256 bcubeAmount) external onlyTeam {
        uint256 finalPSSWithdrawn;
        finalPSSWithdrawn = publicSaleShareWithdrawn.add(bcubeAmount);
        require(finalPSSWithdrawn <= 15_000_000e18, "Out of public sale share");
        publicSaleShareWithdrawn = finalPSSWithdrawn;
        bcube.safeTransfer(team, bcubeAmount);
    }
}
