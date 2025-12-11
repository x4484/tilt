// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// This is an ERC20 token on Base that uses a bonding curve to set token prices.
// Token holders are able to select a position (Up Only or Down Only) and can switch at any time.
// When Up Only has a majority, the contract disables the ability to sell their tokens back to the contract.
// This means an Up Only majority will ensure the prife of the token can only stay the same or go up, as more people mint tokens.
// When Down Only has a majority, the contract disables the ability to buy more tokens from the contract.
// This means a Down Only majority will ensure the price of the token can only stay the same or go down, as more people burn tokens for a refund.

// This contract is solely for the purposes of experimentation, exploration, and entertainment.
// This contract has been tested locally and on testnets, but has not been formally audited. Users are advised to use at their own risk.

interface ITILT {
    enum Side {
        None,
        Up,
        Down
    }

    event Mint(address indexed addr, uint256 amount, uint256 totalSupply);
    event Burn(address indexed addr, uint256 amount, uint256 totalSupply);
    event SwitchSides(address indexed addr, Side side, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);

    error UpOnly();
    error DownOnly();
    error NotEnoughETH();
    error RefundFailed();
    error BalanceTooLow();
    error UninitializedWallet();
    error WithdrawFailed();
    error NoFeesToWithdraw();
}

contract TILT is ERC20, Ownable, ITILT {
    uint256 public ups;
    mapping(address => Side) public sides;
    
    // 1% fee (100 basis points out of 10000)
    uint256 public constant FEE_BPS = 100;
    uint256 public feeReserve;

    constructor() ERC20("TILT", "TILT") Ownable(msg.sender) {}

    /* -------------------------------------------------------------------------- */
    /*                                  FEE LOGIC                                 */
    /* -------------------------------------------------------------------------- */
    function _calculateFee(uint256 amount) internal pure returns (uint256) {
        return (amount * FEE_BPS + 9999) / 10000; // Round up for small amounts
    }

    /* -------------------------------------------------------------------------- */
    /*                                    MINT                                    */
    /* -------------------------------------------------------------------------- */
    function mint(uint256 amount) external payable {
        if (!isUpOnly()) revert DownOnly();

        uint256 cost = mintFees(amount);
        uint256 fee = _calculateFee(cost);
        uint256 totalCost = cost + fee;
        
        if (msg.value < totalCost) revert NotEnoughETH();

        _mint(msg.sender, amount);

        if (sides[msg.sender] == Side.None) {
            sides[msg.sender] = Side.Up;
            emit SwitchSides(msg.sender, Side.Up, amount);
        }
        if (sides[msg.sender] == Side.Up) ups += amount;

        // Accumulate fee
        feeReserve += fee;

        // Refund excess ETH
        if (msg.value > totalCost) {
            (bool sent,) = msg.sender.call{value: msg.value - totalCost}("");
            if (!sent) revert RefundFailed();
        }

        emit Mint(msg.sender, amount, totalSupply());
    }

    function mintFees(uint256 amount) public view returns (uint256) {
        return _totalPriceFor(totalSupply() + amount) - _totalPriceFor(totalSupply());
    }

    /// @notice Returns total cost including 1% fee for minting `amount` tokens
    function mintFeesWithFee(uint256 amount) public view returns (uint256) {
        uint256 cost = mintFees(amount);
        return cost + _calculateFee(cost);
    }

    function _totalPriceFor(uint256 amount) internal pure returns (uint256) {
        return (amount * (amount + 1) * (2 * amount + 1)) / 6;
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    BURN                                    */
    /* -------------------------------------------------------------------------- */
    function burn(uint256 amount) external {
        if (isUpOnly()) revert UpOnly();

        if (amount > balanceOf(msg.sender)) revert BalanceTooLow();

        uint256 grossRefund = burnRefunds(amount);
        uint256 fee = _calculateFee(grossRefund);
        uint256 payout = grossRefund - fee;
        
        _burn(msg.sender, amount);

        if (sides[msg.sender] == Side.Up) ups -= amount;

        // Accumulate fee
        feeReserve += fee;

        (bool sent,) = msg.sender.call{value: payout}("");
        if (!sent) revert RefundFailed();

        emit Burn(msg.sender, amount, totalSupply());
    }

    function burnRefunds(uint256 amount) public view returns (uint256) {
        return _totalPriceFor(totalSupply()) - _totalPriceFor(totalSupply() - amount);
    }

    /// @notice Returns net refund after 1% fee for burning `amount` tokens
    function burnRefundsAfterFee(uint256 amount) public view returns (uint256) {
        uint256 grossRefund = burnRefunds(amount);
        return grossRefund - _calculateFee(grossRefund);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  TRANSFER                                  */
    /* -------------------------------------------------------------------------- */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        // Adjust balances if sender and recipient are on different sides
        _beforeTransfer(msg.sender, recipient, amount);
        return super.transfer(recipient, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        // Adjust balances if sender and recipient are on different sides
        _beforeTransfer(sender, recipient, amount);
        return super.transferFrom(sender, recipient, amount);
    }

    function _beforeTransfer(address sender, address recipient, uint256 amount) internal {
        // Initialize recipient wallet if not initialized, and set isUpOnly to sender's isUpOnly
        if (sides[recipient] == Side.None) {
            sides[recipient] = sides[sender];
            emit SwitchSides(recipient, sides[sender], amount);
        }

        // Adjust balances if sender and recipient are on different sides
        if (sides[sender] != sides[recipient]) {
            if (sides[sender] == Side.Up) ups -= amount;
            else ups += amount;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    SIDES                                   */
    /* -------------------------------------------------------------------------- */
    function isUpOnly() public view returns (bool) {
        return ups >= (totalSupply() + 1) / 2;
    }

    function switchSides() external {
        // Don't allow uninitialized wallets to switch sides
        if (sides[msg.sender] == Side.None) revert UninitializedWallet();

        // Adjust balances
        if (sides[msg.sender] == Side.Up) {
            ups -= balanceOf(msg.sender);
            sides[msg.sender] = Side.Down;
        } else {
            ups += balanceOf(msg.sender);
            sides[msg.sender] = Side.Up;
        }

        // Emit event
        emit SwitchSides(msg.sender, sides[msg.sender], balanceOf(msg.sender));
    }

    /* -------------------------------------------------------------------------- */
    /*                                FEE WITHDRAWAL                              */
    /* -------------------------------------------------------------------------- */
    /// @notice Withdraw accumulated fees (owner only)
    /// @param to Address to send fees to
    function withdrawFees(address payable to) external onlyOwner {
        uint256 amount = feeReserve;
        if (amount == 0) revert NoFeesToWithdraw();
        
        // Update state before external call (checks-effects-interactions)
        feeReserve = 0;
        
        (bool sent,) = to.call{value: amount}("");
        if (!sent) revert WithdrawFailed();
        
        emit FeesWithdrawn(to, amount);
    }

    /// @notice View accumulated fees
    function getAccumulatedFees() external view returns (uint256) {
        return feeReserve;
    }
}
