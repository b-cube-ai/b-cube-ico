// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

contract BCubePrivateSale is TimedCrowdsale, WhitelistCrowdsale {
    using SafeMath for uint256;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 dollarUnitsPayed;
        uint256 allocatedBcube;
        uint256 currentAllowance;
        uint256 shareWithdrawn;
    }

    mapping(address => UserInfo) public bcubeAllocationRegistry;
    uint256 public netAllocatedBcube;
    uint256 public constant HARD_CAP = 10_000_000e18;

    AggregatorV3Interface internal priceFeedETH;
    AggregatorV3Interface internal priceFeedUSDT;
    IERC20 public usdt;

    event LogEtherReceived(address indexed sender, uint256 value);
    event LogBcubeBuyUsingEth(
        address indexed buyer,
        uint256 incomingWei,
        uint256 allocation
    );
    event LogBcubeBuyUsingUsdt(
        address indexed buyer,
        uint256 incomingUsdtUnits,
        uint256 allocation
    );
    event LogETHPriceFeedChange(address indexed newChainlinkETHPriceFeed);
    event LogUSDTPriceFeedChange(address indexed newChainlinkUSDTPriceFeed);
    event LogUSDTInstanceChange(address indexed newUsdtContract);

    modifier tokensRemaining() {
        require(netAllocatedBcube < HARD_CAP, "All tokens allocated");
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
        address _usdtContract
    )
        public
        TimedCrowdsale(openingTime_, closingTime_)
        Crowdsale(1, wallet_, token_)
    {
        priceFeedETH = AggregatorV3Interface(_chainlinkETHPriceFeed);
        priceFeedUSDT = AggregatorV3Interface(_chainlinkUSDTPriceFeed);
        usdt = IERC20(_usdtContract);
    }

    function rate() public view returns (uint256) {
        revert("BCubePrivateSale: rate() called");
    }

    function buyTokens() public pure returns (uint256) {
        revert("BCubePrivateSale: buyTokens() called");
    }

    function fetchETHPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeedETH.latestRoundData();
        return price;
    }

    function fetchUSDTPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeedUSDT.latestRoundData();
        int256 ethUSD = fetchETHPrice();
        return (price * ethUSD) / 1e18;
    }

    function calcRate() private view returns (uint256, uint8) {
        if (netAllocatedBcube < 2_500_000e18) {
            return (25e10, 1);
        } else if (netAllocatedBcube < 5_000_000e18) {
            return (222222222222, 2);
        } else if (netAllocatedBcube < 7_500_000e18) {
            return (20e10, 3);
        } else if (netAllocatedBcube <= 10_000_000e18) {
            return (181818181818, 4);
        }
    }

    function setETHPriceFeed(address _newChainlinkETHPriceFeed)
        external
        onlyWhitelistAdmin
    {
        priceFeedETH = AggregatorV3Interface(_newChainlinkETHPriceFeed);
        emit LogETHPriceFeedChange(_newChainlinkETHPriceFeed);
    }

    function setUSDTPriceFeed(address _newChainlinkUSDTPriceFeed)
        external
        onlyWhitelistAdmin
    {
        priceFeedUSDT = AggregatorV3Interface(_newChainlinkUSDTPriceFeed);
        emit LogUSDTPriceFeedChange(_newChainlinkUSDTPriceFeed);
    }

    function setUSDTInstance(address _newUsdtContract)
        external
        onlyWhitelistAdmin
    {
        usdt = IERC20(_newUsdtContract);
        emit LogUSDTInstanceChange(_newUsdtContract);
    }

    function extendClosingTime(uint256 _newClosingTime)
        external
        onlyWhitelistAdmin
    {
        _extendTime(_newClosingTime);
    }

    function buyBcubeUsingETH()
        external
        payable
        onlyWhitelisted
        onlyWhileOpen
        tokensRemaining
    {
        uint256 allocation;
        uint256 ethPrice = uint256(fetchETHPrice());
        uint256 dollarUnits = ethPrice.mul(msg.value).div(1e18);
        super._preValidatePurchase(_msgSender(), msg.value);
        allocation = executeAllocation(dollarUnits);
        _forwardFunds();
        emit LogBcubeBuyUsingEth(_msgSender(), msg.value, allocation);
    }

    function buyBcubeUsingUSDT(uint256 incomingUsdt)
        external
        onlyWhitelisted
        onlyWhileOpen
        tokensRemaining
    {
        uint256 allocation;
        uint256 usdtPrice = uint256(fetchUSDTPrice());
        uint256 dollarUnits = usdtPrice.mul(incomingUsdt).div(1e6);
        super._preValidatePurchase(_msgSender(), incomingUsdt);
        allocation = executeAllocation(dollarUnits);
        usdt.safeTransferFrom(_msgSender(), wallet(), incomingUsdt);
        emit LogBcubeBuyUsingUsdt(_msgSender(), incomingUsdt, allocation);
    }

    function executeAllocation(uint256 dollarUnits) private returns (uint256) {
        uint256 finalAllocation;
        uint256 bcubeAllocatedToUser;
        uint256 minDollarUnits;
        uint256 netUserDollarUnits;
        uint256 rate_;
        uint8 stage;
        uint256 stageCap;
        uint256 a1;
        uint256 a2;
        uint256 dollarUnitsUnused;
        (rate_, stage) = calcRate();
        stageCap = 2_500_000e18 * stage;
        if (netAllocatedBcube <= 2_500_000e18) {
            minDollarUnits = 1000_0000_0000;
        } else if (netAllocatedBcube <= 5_000_000e18) {
            minDollarUnits = 500_0000_0000;
        } else if (netAllocatedBcube <= 7_500_000e18) {
            minDollarUnits = 250_0000_0000;
        } else if (netAllocatedBcube <= 10_000_000e18) {
            minDollarUnits = 100_0000_0000;
        }
        require(
            (minDollarUnits <= dollarUnits) && (dollarUnits <= 25000_0000_0000),
            "Contribution range for this round exceeded"
        );
        netUserDollarUnits = bcubeAllocationRegistry[_msgSender()]
            .dollarUnitsPayed
            .add(dollarUnits);
        require(
            netUserDollarUnits <= 25000_0000_0000,
            "Contribution upper limit exceeded"
        );
        bcubeAllocatedToUser = rate_.mul(dollarUnits);
        finalAllocation = netAllocatedBcube.add(bcubeAllocatedToUser);
        require(finalAllocation <= HARD_CAP, "Hard cap exceeded");
        bcubeAllocationRegistry[_msgSender()]
            .dollarUnitsPayed = netUserDollarUnits;
        if (finalAllocation <= stageCap) {
            netAllocatedBcube = finalAllocation;
            bcubeAllocationRegistry[_msgSender()]
                .allocatedBcube = bcubeAllocationRegistry[_msgSender()]
                .allocatedBcube
                .add(bcubeAllocatedToUser);
            return bcubeAllocatedToUser;
        } else {
            uint256 total;
            a1 = stageCap.sub(netAllocatedBcube);
            dollarUnitsUnused = dollarUnits.sub(a1.div(rate_));
            netAllocatedBcube = stageCap;
            (rate_, stage) = calcRate();
            a2 = dollarUnitsUnused.mul(rate_);
            netAllocatedBcube = netAllocatedBcube.add(a2);
            total = a1.add(a2);
            bcubeAllocationRegistry[_msgSender()]
                .allocatedBcube = bcubeAllocationRegistry[_msgSender()]
                .allocatedBcube
                .add(total);
            return total;
        }
    }
}
