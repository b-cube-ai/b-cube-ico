// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

contract BCubePrivateSale is Ownable, TimedCrowdsale, WhitelistCrowdsale {
    using SafeMath for uint256;

    mapping(address => uint256) public bCubeAllocationRegistry;
    uint256 public releaseTime;
    uint256 public hardCap;

    uint256 public bCubePrice;
    uint256 public allocatedBcube;
    uint256 public buperud;

    AggregatorV3Interface internal priceFeed;

    event LogEtherReceived(address indexed sender, uint256 value);

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        uint256 rate_,
        address payable wallet_,
        IERC20 token_,
        uint256 _bCubePrice,
        uint256 _releaseTime,
        uint256 _hardCap,
        uint256 openingTime_,
        uint256 closingTime_
    )
        public
        TimedCrowdsale(openingTime_, closingTime_)
        Crowdsale(rate_, wallet_, token_)
    {
        bCubePrice = _bCubePrice;
        releaseTime = _releaseTime;
        hardCap = _hardCap;
        priceFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    }

    function setReleaseTime(uint256 _releaseTime) external onlyOwner {
        releaseTime = _releaseTime;
    }

    function setHardCap(uint256 _hardCap) external onlyOwner {
        hardCap = _hardCap;
    }

    function fetchEthPrice() public returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return price;
    }

    function calcRate() private returns (uint256) {
        if (allocatedBcube <= 2500000) {
            return 25e10;
        } else if (allocatedBcube <= 5000000) {
            return 222222222222;
        } else if (allocatedBcube <= 7500000) {
            return 20e10;
        } else if (allocatedBcube <= 10000000) {
            return 181818181818;
        }
    }

    function buyBCubeUsingEther() external payable onlyWhileOpen {
        uint256 bCubeAllocated;
        int256 ethPrice = fetchEthPrice();
        uint256 dollarUnits = ethPrice.div(10e18).mul(msg.value);
        bCubeAllocated = calcRate(msg.value).mul(dollarUnits);
        require(
            (1000_000_000 <= ethPrice.mul(msg.value).div(10e18)) &&
                (ethPrice.mul(msg.value).div(10e18) <= 25000_000_000),
            "Contribution has to be in the range $1000 - $25000!"
        );
        bCubeAllocated = ethPrice.mul(msg.value).div(bCubePrice);
        if (hardCap.sub(bCubeAllocated) >= 0) {
            hardCap = hardCap.sub(bCubeAllocated);
            bCubeAllocationRegistry[_msgSender()] = bCubeAllocated;
        } else {
            revert("Hard cap reached. Cannot buy more BCUBE!");
        }
    }
}
