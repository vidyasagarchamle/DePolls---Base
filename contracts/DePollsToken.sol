// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DePollsToken is ERC20, Ownable {
    constructor() ERC20("DePolls Token", "DPOLL") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function rewardUser(address user, uint256 amount) public {
        require(balanceOf(address(this)) >= amount, "Insufficient reward balance");
        _transfer(address(this), user, amount);
    }
} 