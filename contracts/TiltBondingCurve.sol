// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TiltBondingCurve
 * @dev A bonding curve token game where holders can choose Up or Down sides.
 * When Up holders have more tokens, only minting is enabled.
 * When Down holders have more tokens, only burning is enabled.
 */
contract TiltBondingCurve is ERC20, ReentrancyGuard, Ownable {
    enum Side { None, Up, Down }

    mapping(address => Side) public holderSide;
    
    uint256 public ups;      // Total tokens held by Up-aligned holders
    uint256 public downs;    // Total tokens held by Down-aligned holders
    
    uint256 public constant CURVE_COEFFICIENT = 1e12; // Pricing coefficient
    uint256 public constant FEE_PERCENT = 1;          // 1% fee on transactions
    
    uint256 public collectedFees;

    event Mint(address indexed buyer, uint256 amount, uint256 cost, Side side);
    event Burn(address indexed seller, uint256 amount, uint256 refund, Side side);
    event SwitchSides(address indexed holder, uint256 amount, Side newSide);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    constructor() ERC20("TILT", "TILT") Ownable(msg.sender) {}

    /**
     * @dev Returns true if minting is enabled (Up holders have more tokens)
     */
    function isUpOnly() public view returns (bool) {
        return ups >= downs;
    }

    /**
     * @dev Returns true if burning is enabled (Down holders have more tokens)
     */
    function isDownOnly() public view returns (bool) {
        return downs > ups;
    }

    /**
     * @dev Calculate the cost to mint `amount` tokens using bonding curve
     * Price = CURVE_COEFFICIENT * supply^2
     * Cost = integral from currentSupply to (currentSupply + amount)
     */
    function getMintCost(uint256 amount) public view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 newSupply = supply + amount;
        
        // Integral of x^2 = x^3/3
        // Cost = CURVE_COEFFICIENT * (newSupply^3 - supply^3) / 3
        uint256 oldCubed = (supply * supply * supply) / 3;
        uint256 newCubed = (newSupply * newSupply * newSupply) / 3;
        
        return (newCubed - oldCubed) * CURVE_COEFFICIENT / 1e18;
    }

    /**
     * @dev Calculate the refund for burning `amount` tokens
     */
    function getBurnRefund(uint256 amount) public view returns (uint256) {
        uint256 supply = totalSupply();
        require(amount <= supply, "Amount exceeds supply");
        
        uint256 newSupply = supply - amount;
        
        uint256 oldCubed = (supply * supply * supply) / 3;
        uint256 newCubed = (newSupply * newSupply * newSupply) / 3;
        
        uint256 refund = (oldCubed - newCubed) * CURVE_COEFFICIENT / 1e18;
        uint256 fee = (refund * FEE_PERCENT) / 100;
        
        return refund - fee;
    }

    /**
     * @dev Get the current price per token
     */
    function getCurrentPrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return CURVE_COEFFICIENT / 1e18;
        return (supply * supply * CURVE_COEFFICIENT) / 1e18;
    }

    /**
     * @dev Mint tokens by paying ETH. Only works when isUpOnly() is true.
     * @param amount Number of tokens to mint
     * @param side The side to join (Up or Down)
     */
    function mint(uint256 amount, Side side) external payable nonReentrant {
        require(isUpOnly(), "Minting disabled - Down is winning");
        require(amount > 0, "Amount must be greater than 0");
        require(side == Side.Up || side == Side.Down, "Invalid side");
        
        uint256 cost = getMintCost(amount);
        uint256 fee = (cost * FEE_PERCENT) / 100;
        uint256 totalCost = cost + fee;
        
        require(msg.value >= totalCost, "Insufficient ETH sent");
        
        // Set side for new holders or use existing side
        Side holderCurrentSide = holderSide[msg.sender];
        if (holderCurrentSide == Side.None) {
            holderSide[msg.sender] = side;
            holderCurrentSide = side;
        }
        
        // Update side totals
        if (holderCurrentSide == Side.Up) {
            ups += amount;
        } else {
            downs += amount;
        }
        
        collectedFees += fee;
        
        _mint(msg.sender, amount);
        
        // Refund excess ETH
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit Mint(msg.sender, amount, totalCost, holderCurrentSide);
    }

    /**
     * @dev Burn tokens to receive ETH. Only works when isDownOnly() is true.
     * @param amount Number of tokens to burn
     */
    function burn(uint256 amount) external nonReentrant {
        require(isDownOnly(), "Burning disabled - Up is winning");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        uint256 refund = getBurnRefund(amount);
        require(address(this).balance >= refund, "Insufficient contract balance");
        
        Side holderCurrentSide = holderSide[msg.sender];
        
        // Update side totals
        if (holderCurrentSide == Side.Up) {
            ups -= amount;
        } else if (holderCurrentSide == Side.Down) {
            downs -= amount;
        }
        
        _burn(msg.sender, amount);
        
        payable(msg.sender).transfer(refund);
        
        emit Burn(msg.sender, amount, refund, holderCurrentSide);
    }

    /**
     * @dev Switch sides (Up <-> Down). Can only be done by token holders.
     */
    function switchSides() external nonReentrant {
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "Must hold tokens to switch sides");
        
        Side currentSide = holderSide[msg.sender];
        require(currentSide != Side.None, "No side set");
        
        Side newSide;
        if (currentSide == Side.Up) {
            newSide = Side.Down;
            ups -= balance;
            downs += balance;
        } else {
            newSide = Side.Up;
            downs -= balance;
            ups += balance;
        }
        
        holderSide[msg.sender] = newSide;
        
        emit SwitchSides(msg.sender, balance, newSide);
    }

    /**
     * @dev Get the TVL (Total Value Locked) in the contract
     */
    function getTVL() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Owner can withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        require(fees > 0, "No fees to withdraw");
        
        collectedFees = 0;
        payable(owner()).transfer(fees);
        
        emit FeesWithdrawn(owner(), fees);
    }

    /**
     * @dev Override transfer to update side totals
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Handle side accounting for transfers (not mint/burn)
        if (from != address(0) && to != address(0)) {
            Side fromSide = holderSide[from];
            Side toSide = holderSide[to];
            
            // Deduct from sender's side
            if (fromSide == Side.Up) {
                ups -= amount;
            } else if (fromSide == Side.Down) {
                downs -= amount;
            }
            
            // If recipient has no side, inherit from sender
            if (toSide == Side.None && fromSide != Side.None) {
                holderSide[to] = fromSide;
                toSide = fromSide;
            }
            
            // Add to recipient's side
            if (toSide == Side.Up) {
                ups += amount;
            } else if (toSide == Side.Down) {
                downs += amount;
            }
        }
        
        super._update(from, to, amount);
    }

    receive() external payable {}
}
