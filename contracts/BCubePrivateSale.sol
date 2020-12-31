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

contract BCubePrivateSale is Ownable, TimedCrowdsale, WhitelistCrowdsale {
    using SafeMath for uint256;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 dollarUnitsPayed;
        uint256 allocatedBcube;
    }

    mapping(address => UserInfo) public bCubeAllocationRegistry;
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

    function rate() public view returns (uint256) {
        revert("BCubePrivateSale: rate() called");
    }

    function buyTokens() public pure returns (uint256) {
        revert("BCubePrivateSale: buyTokens() called");
    }

    function fetchETHPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedETH.latestRoundData();
        return price;
    }

    function fetchUSDTPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedUSDT.latestRoundData();
        int256 ethUSD = fetchETHPrice();
        return price * ethUSD;
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

    function buyBcubeUsingETH() external payable onlyWhileOpen tokensRemaining {
        uint256 ethPrice = uint256(fetchETHPrice());
        uint256 dollarUnits = ethPrice.div(10e18).mul(msg.value);
        super._preValidatePurchase(_msgSender(), msg.value);
        executeAllocation(dollarUnits);
        _forwardFunds();
    }

    function buyBcubeUsingUSDT(uint256 incomingUsdt)
        external
        payable
        onlyWhileOpen
        tokensRemaining
    {
        uint256 usdtPrice = uint256(fetchUSDTPrice());
        uint256 dollarUnits = usdtPrice.div(10e18).mul(incomingUsdt);
        super._preValidatePurchase(_msgSender(), incomingUsdt);
        executeAllocation(dollarUnits);
        usdt.safeTransferFrom(_msgSender(), wallet(), incomingUsdt);
    }

    function executeAllocation(uint256 dollarUnits) private {
        uint256 finalAllocation;
        uint256 bcubeAllocatedToUser;
        uint256 minDollarUnits;
        uint256 netUserDollarUnits;
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
            .allocatedBcube = bCubeAllocationRegistry[_msgSender()]
            .allocatedBcube
            .add(bcubeAllocatedToUser);
    }
}
