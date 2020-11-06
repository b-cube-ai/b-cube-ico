// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";

contract BCUBEToken is Ownable, ERC20, ERC20Capped, ERC20Snapshot {
    constructor(uint256 initialSupply)
        public
        ERC20("b-cube.ai Token", "BCUBE")
        ERC20Capped(50_000_000e18)
    {
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) onlyOwner {
        _mint(account, amount);
    }

    function burn(uint256 amount) onlyOwner {
        _burn(_owner, amount);
    }
}
