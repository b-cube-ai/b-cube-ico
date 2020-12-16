// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract BCubePrivateSale is Ownable {
    using SafeMath for uint256;

    mapping(address => uint256) public bCubeAllocationRegistry;
    uint256 public releaseTime;
    uint256 public bCubePrice;
    uint256 public ethPrice;
    uint256 public hardCap;
    uint256 public softCap;

    receive() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(
        uint256 _bCubePrice,
        uint256 _releaseTime,
        uint256 _hardCap,
        uint256 _softCap
    ) public {
        bCubePrice = _bCubePrice;
        releaseTime = _releaseTime;
        hardCap = _hardCap;
        softCap = _softCap;
    }

    function setBCubePrice(uint256 _bCubePrice) external onlyOwner {
        bCubePrice = _bCubePrice;
    }

    function buyBCubeUsingEther() external payable {
        uint256 bCubeAllocated;
        require(
            (1000_000_000 <= ethPrice.mul(msg.value).div(10e18)) &&
                (ethPrice.mul(msg.value).div(10e18) <= 25000_000_000),
            "Contribution has to be in the range $1000 - $25000!"
        );
        bCubeAllocated = ethPrice.mul(msg.value).div(bCubePrice);
        bCubeAllocationRegistry[_msgSender()] = bCubeAllocated;
        if (hardCap.sub(bCubeAllocated) >= 0) {
            hardCap = hardCap.sub(bCubeAllocated);
        } else {
            revert("Hard cap reached. Cannot buy more BCUBE!");
        }
    }
}
