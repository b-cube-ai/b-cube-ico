// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";

contract BCUBEToken is ERC20, Ownable {
    uint256 public cap;

    constructor(uint256 initialSupply, uint256 _cap)
        public
        ERC20("b-cube.ai Token", "BCUBE")
    {
        require(_cap > 0, "ERC20Capped: cap is 0");
        cap = _cap;
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        require(totalSupply().add(amount) <= cap, "ERC20Capped: cap exceeded");
        _mint(account, amount);
    }

    function burn(uint256 amount) external onlyOwner {
        _burn(owner(), amount);
    }
}
