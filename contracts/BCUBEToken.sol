// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract BCUBEToken is ERC20, ERC20Detailed, Ownable {
    uint256 public cap;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 initialSupply,
        uint256 _cap
    ) public ERC20Detailed(_name, _symbol, _decimals) {
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
