// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BCUBEToken is ERC20 {
    constructor(uint256 initialSupply) public ERC20("BCube", "BCUBE") {
        _mint(msg.sender, initialSupply);
    }
}
