// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";

contract BCUBEToken is Ownable, ERC20Capped, ERC20Snapshot {
    constructor(uint256 initialSupply)
        public
        ERC20("b-cube.ai Token", "BCUBE")
        ERC20Capped(500_000_000e18)
    {
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burn(uint256 amount) external onlyOwner {
        _burn(owner(), amount);
    }

    function takeSnapshot() external onlyOwner returns (uint256) {
        return _snapshot();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Capped, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0)) {
            require(
                totalSupply().add(amount) <= cap(),
                "BCUBEToken: cap exceeded"
            );
        }
    }
}
