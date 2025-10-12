// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract PayrollManager {
    address public owner;
    mapping(address => bool) public isAdmin;

    struct Payment {
        address recipient;
        address token;
        uint256 amount;
        uint256 chainId;
        bool executed;
    }

    Payment[] public payments;
    uint256 public totalEscrowed;

    event PaymentScheduled(address indexed recipient, uint256 amount, address token, uint256 chainId);
    event PaymentExecuted(uint256 indexed paymentId);

    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not admin");
        _;
    }

    function addAdmin(address _admin) external onlyOwner {
        isAdmin[_admin] = true;
    }

    function schedulePayment(
        address _recipient,
        address _token,
        uint256 _amount,
        uint256 _chainId
    ) external onlyAdmin {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        payments.push(Payment({
            recipient: _recipient,
            token: _token,
            amount: _amount,
            chainId: _chainId,
            executed: false
        }));
        totalEscrowed += _amount;
        emit PaymentScheduled(_recipient, _amount, _token, _chainId);
    }

    function executePayment(uint256 _paymentId) external onlyAdmin {
        require(_paymentId < payments.length, "Invalid ID");
        Payment storage payment = payments[_paymentId];
        require(!payment.executed, "Already executed");
        payment.executed = true;
        totalEscrowed -= payment.amount;
        emit PaymentExecuted(_paymentId);
    }

    function withdrawUnspent(address _token, address _to) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(_to, balance);
    }
}