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
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

contract Treasury is BCubePrivateSale {
    using SafeMath for uint256;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 dollarUnitsPayed;
        uint256 allocatedBcube;
    }

    mapping(address => UserInfo) public bCubeAllocationRegistry;
    uint256 public releaseTime;
    uint256 public netAllocatedBcube;
    uint256 public constant HARD_CAP = 10_000_000;

    AggregatorV3Interface internal priceFeedETH;
    AggregatorV3Interface internal priceFeedUSDT;
    IERC20 public usdt;

    event LogEtherReceived(address indexed sender, uint256 value);

    modifier tokensRemaining() {
        require(netAllocatedBcube <= HARD_CAP, "All tokens allocated");
        _;
    }

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
        priceFeedETH = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
        priceFeedUSDT = AggregatorV3Interface(
            0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46
        );
        usdt = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    }
}
