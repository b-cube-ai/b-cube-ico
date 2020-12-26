// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BCubePrivateSale is Ownable {
    using SafeMath for uint256;

    mapping(address => uint256) public bCubeAllocationRegistry;
    uint256 public releaseTime;
    uint256 public hardCap;
    uint256 public openingTime;
    uint256 public closingTime;

    IERC20 public bCubeToken;
    uint256 public bCubePrice;
    uint256 public ethPrice;
    uint256 public weiRaised;

    event LogEtherReceived(address indexed sender, uint256 value);

    function() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    modifier isOpen() {
        require(
            block.timestamp >= openingTime && block.timestamp <= closingTime,
            "Crowdsale not open!"
        );
        _;
    }

    constructor(
        uint256 _bCubePrice,
        uint256 _releaseTime,
        uint256 _hardCap,
        uint256 _openingTime,
        uint256 _closingTime
    ) public {
        bCubePrice = _bCubePrice;
        releaseTime = _releaseTime;
        hardCap = _hardCap;
        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    function setReleaseTime(uint256 _releaseTime) external onlyOwner {
        releaseTime = _releaseTime;
    }

    function setHardCap(uint256 _hardCap) external onlyOwner {
        hardCap = _hardCap;
    }

    function setOpeningTime(uint256 _openingTime) external onlyOwner {
        openingTime = _openingTime;
    }

    function setClosingTime(uint256 _closingTime) external onlyOwner {
        closingTime = _closingTime;
    }

    function buyBCubeUsingEther() external payable isOpen {
        uint256 bCubeAllocated;
        require(
            (1000_000_000 <= ethPrice.mul(msg.value).div(10e18)) &&
                (ethPrice.mul(msg.value).div(10e18) <= 25000_000_000),
            "Contribution has to be in the range $1000 - $25000!"
        );
        bCubeAllocated = ethPrice.mul(msg.value).div(bCubePrice);
        if (hardCap.sub(bCubeAllocated) >= 0) {
            hardCap = hardCap.sub(bCubeAllocated);
            bCubeAllocationRegistry[_msgSender()] = bCubeAllocated;
            weiRaised = weiRaised.add(msg.value);
        } else {
            revert("Hard cap reached. Cannot buy more BCUBE!");
        }
    }
}
