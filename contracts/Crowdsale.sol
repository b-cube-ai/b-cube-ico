// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Crowdsale is Ownable {
    address public team;
    address[] public advisors;
    address public devFund;
    address public reserves;
    address public community;
    address public bounty;

    receive() external payable {
        emit LogEtherReceived(_msgSender(), msg.value);
    }

    constructor(address _team) public {
        team = _team;
    }

    function addAdvisor(address _newAdvisor) external onlyOwner {
        advisors.push(newAdvisor);
    }

    function removeAdvisor(address _advisor) external onlyOwner {
        advisors.pop(_advisor);
    }
}
