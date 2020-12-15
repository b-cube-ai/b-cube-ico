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

    receive() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(uint256 _bCubePrice, uint256 _releaseTime) public {
        bCubePrice = _bCubePrice;
        releaseTime = _releaseTime;
    }

    function setBCubePrice(uint256 _bCubePrice) external onlyOwner {
        bCubePrice = _bCubePrice;
    }

    function buyBCubeUsingEther() external payable {
        bCubeAllocationRegistry[_msgSender()] = ethPrice.mul(msg.value).div(
            bCubePrice
        );
    }
}
