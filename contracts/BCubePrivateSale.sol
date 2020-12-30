// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

contract BCubePrivateSale is Ownable, TimedCrowdsale, WhitelistCrowdsale {
    using SafeMath for uint256;
    using SafeCast for uint256;

    struct UserInfo {
        uint256 dollarUnitsPayed;
        uint256 allocatedBcube;
    }

    mapping(address => UserInfo) public bCubeAllocationRegistry;
    uint256 public releaseTime;
    uint256 public netAllocatedBcube;
    uint256 public constant HARD_CAP = 10_000_000;

    AggregatorV3Interface internal priceFeed;

    event LogEtherReceived(address indexed sender, uint256 value);

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        uint256 rate_,
        address payable wallet_,
        IERC20 token_,
        uint256 _releaseTime,
        uint256 openingTime_,
        uint256 closingTime_
    )
        public
        TimedCrowdsale(openingTime_, closingTime_)
        Crowdsale(rate_, wallet_, token_)
    {
        releaseTime = _releaseTime;
        priceFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    }

    function setReleaseTime(uint256 _releaseTime) external onlyOwner {
        releaseTime = _releaseTime;
    }

    function rate() public view returns (uint256) {
        revert("BCubePrivateSale: rate() called");
    }

    function fetchEthPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return price;
    }

    function calcRate() private view returns (uint256) {
        if (netAllocatedBcube <= 2500000) {
            return 25e10;
        } else if (netAllocatedBcube <= 5000000) {
            return 222222222222;
        } else if (netAllocatedBcube <= 7500000) {
            return 20e10;
        } else if (netAllocatedBcube <= 10000000) {
            return 181818181818;
        }
    }

    function buyBcubeUsingEther() external payable onlyWhileOpen {
        uint256 finalAllocation;
        uint256 bcubeAllocatedToUser;
        uint256 minDollarUnits;
        uint256 netUserDollarUnits;
        uint256 ethPrice = uint256(fetchEthPrice());
        uint256 dollarUnits = ethPrice.div(10e18).mul(msg.value);
        if (netAllocatedBcube <= 2500000) {
            minDollarUnits = 1000_0000_0000;
        } else if (netAllocatedBcube <= 5000000) {
            minDollarUnits = 500_0000_0000;
        } else if (netAllocatedBcube <= 7500000) {
            minDollarUnits = 250_0000_0000;
        } else if (netAllocatedBcube <= 10000000) {
            minDollarUnits = 100_0000_0000;
        }
        require(
            (minDollarUnits <= dollarUnits) && (dollarUnits <= 25000_0000_0000),
            "Contribution range for this round exceeded"
        );
        netUserDollarUnits = bCubeAllocationRegistry[_msgSender()]
            .dollarUnitsPayed
            .add(dollarUnits);
        require(
            netUserDollarUnits <= 25000_0000_0000,
            "Contribution upper limit exceeded"
        );
        bcubeAllocatedToUser = calcRate().mul(dollarUnits);
        finalAllocation = netAllocatedBcube.add(bcubeAllocatedToUser);
        require(finalAllocation <= HARD_CAP, "Hard cap exceeded");
        netAllocatedBcube = finalAllocation;
        bCubeAllocationRegistry[_msgSender()]
            .dollarUnitsPayed = netUserDollarUnits;
        bCubeAllocationRegistry[_msgSender()]
            .allocatedBcube = bcubeAllocatedToUser;
    }
}
