// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./hedera-token-service/HederaTokenService.sol";
import "./HederaResponseCodes.sol";

/// @title PayrollManager (HBAR + HTS support)
/// @notice Schedule and execute payments in both HBAR and HTS tokens
contract PayrollManagerHTS is HederaTokenService {
    address public immutable owner;
    bool public paused;

    struct Payment {
        address payer;
        address recipient;
        address token; // address(0) = HBAR, otherwise HTS token
        uint256 amount;
        bool executed;
    }

    Payment[] public payments;
    uint256 public totalEscrowed;
    mapping(address => bool) public isAdmin;

    event PaymentScheduled(
        uint256 indexed id,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        address token
    );
    event PaymentExecuted(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        address token
    );
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event AdminUpdated(address indexed admin, bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
    }

    // ---------------- Admin ----------------

    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Zero address");
        isAdmin[_admin] = true;
        emit AdminUpdated(_admin, true);
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(isAdmin[_admin], "Not admin");
        isAdmin[_admin] = false;
        emit AdminUpdated(_admin, false);
    }

    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ---------------- Core: Schedule ----------------
    function schedulePayments(
        address[] calldata _recipients,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external payable whenNotPaused {
        uint256 len = _recipients.length;
        require(len > 0, "No payments");
        require(len == _tokens.length && len == _amounts.length, "Array length mismatch");

        uint256 hbarSum = 0;
        for (uint256 i = 0; i < len; i++) {
            if (_tokens[i] == address(0)) {
                hbarSum += _amounts[i];
            }
        }
        require(msg.value == hbarSum, "Incorrect HBAR amount");

        for (uint256 i = 0; i < len; i++) {
            address recipient = _recipients[i];
            address token = _tokens[i];
            uint256 amount = _amounts[i];

            require(recipient != address(0), "Invalid recipient");
            require(amount > 0, "Zero amount");

            if (token != address(0)) {
                int64 amt64 = _toI64(amount);
                int response = HederaTokenService.transferToken(
                    token,
                    msg.sender,
                    address(this),
                    amt64
                );
                require(response == HederaResponseCodes.SUCCESS, "HTS token transfer in failed");
            }

            payments.push(Payment({
                payer: msg.sender,
                recipient: recipient,
                token: token,
                amount: amount,
                executed: false
            }));

            uint256 newId = payments.length - 1;
            totalEscrowed += amount;
            emit PaymentScheduled(newId, msg.sender, recipient, amount, token);
        }
    }

    // ---------------- Core: Execute ----------------
    function executePayment(uint256 _id) external whenNotPaused {
        require(_id < payments.length, "Invalid ID");
        Payment storage p = payments[_id];
        require(!p.executed, "Already executed");
        require(msg.sender == p.payer, "Only payer can execute");

        p.executed = true;
        totalEscrowed -= p.amount;

        if (p.token == address(0)) {
            // Native HBAR transfer
            (bool sent, ) = payable(p.recipient).call{value: p.amount}("");
            require(sent, "HBAR transfer failed");
        } else {
            // HTS token transfer
            int64 amt64 = _toI64(p.amount);
            int response = HederaTokenService.transferToken(
                p.token,
                address(this),
                p.recipient,
                amt64
            );
            require(response == HederaResponseCodes.SUCCESS, "HTS token transfer out failed");
        }

        emit PaymentExecuted(_id, p.recipient, p.amount, p.token);
    }

    // ---------------- Views ----------------
    function getPaymentsCount() external view returns (uint256) {
        return payments.length;
    }

    function getBalance(address _token) external view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            (bool success, bytes memory data) = _token.staticcall(
                abi.encodeWithSignature("balanceOf(address)", address(this))
            );
            require(success && data.length >= 32, "Token balance call failed");
            return abi.decode(data, (uint256));
        }
    }

    // Accept plain HBAR transfers
    receive() external payable {}

    // ---------------- Internal Helper ----------------
    /// @dev Safe cast to int64
    function _toI64(uint256 x) internal pure returns (int64) {
        // Max int64 = 2**63 - 1 = 9223372036854775807
        require(x <= 9223372036854775807, "cast: > int64.max");
        return int64(int256(x));
    }
}
