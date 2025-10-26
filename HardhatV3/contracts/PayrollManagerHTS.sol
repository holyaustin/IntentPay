// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../hedera-token-service/HederaTokenService.sol";
import "../hedera-token-service/HederaResponseCodes.sol";

contract PayrollManager is HederaTokenService {
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

    /// @notice Schedule multiple payments (HBAR or HTS). All arrays must match length.
    /// @dev If token[i] == address(0), msg.value must include the sum of those HBAR amounts.
    function schedulePayments(
        address[] calldata _recipients,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external payable whenNotPaused {
        uint256 len = _recipients.length;
        require(
            len == _tokens.length && len == _amounts.length,
            "Array length mismatch"
        );
        require(len > 0, "No payments");

        // Sum HBAR amounts that must be provided with msg.value
        uint256 hbarSum = 0;
        for (uint256 i = 0; i < len; i++) {
            if (_tokens[i] == address(0)) {
                hbarSum += _amounts[i];
            }
        }
        require(msg.value == hbarSum, "Incorrect HBAR amount");

        for (uint256 i = 0; i < len; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] > 0, "Zero amount");

            // For HTS tokens, transfer from payer to contract
            if (_tokens[i] != address(0)) {
                int response = HederaTokenService.transferToken(
                    _tokens[i],
                    msg.sender,
                    address(this),
                    int64(int256(_amounts[i]))
                );
                require(response == HederaResponseCodes.SUCCESS, "HTS token transfer in failed");
            }

            payments.push(
                Payment({
                    payer: msg.sender,
                    recipient: _recipients[i],
                    token: _tokens[i],
                    amount: _amounts[i],
                    executed: false
                })
            );
            uint256 newId = payments.length - 1;
            totalEscrowed += _amounts[i];
            emit PaymentScheduled(newId, msg.sender, _recipients[i], _amounts[i], _tokens[i]);
        }
    }

    /// @notice Execute a scheduled payment. ONLY the original payer can execute their own payment.
    function executePayment(uint256 _id) external whenNotPaused {
        require(_id < payments.length, "Invalid ID");
        Payment storage p = payments[_id];
        require(!p.executed, "Already executed");
        require(msg.sender == p.payer, "Only payer can execute");

        p.executed = true;
        totalEscrowed -= p.amount;

        if (p.token == address(0)) {
            // HBAR transfer using Hedera Token Service
            AccountAmount[] memory transfers = new AccountAmount[](2);
            transfers[0] = AccountAmount(address(this), -int64(int256(p.amount)), false);
            transfers[1] = AccountAmount(p.recipient, int64(int256(p.amount)), false);

            TransferList memory transferList = TransferList(transfers);

            int64 responseCode = HederaTokenService.cryptoTransfer(transferList, new TokenTransferList[](0));
            require(responseCode == HederaResponseCodes.SUCCESS, "HBAR transfer failed");
        } else {
            // HTS token transfer from contract to recipient
            int response = HederaTokenService.transferToken(
                p.token,
                address(this),
                p.recipient,
                int64(int256(p.amount))
            );
            require(response == HederaResponseCodes.SUCCESS, "HTS token transfer out failed");
        }

        emit PaymentExecuted(_id, p.recipient, p.amount, p.token);
    }

    function getPaymentsCount() external view returns (uint256) {
        return payments.length;
    }

    function getBalance(address _token) external view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            // For HTS tokens, use balanceOfToken
            (int64 balance, int response) = HederaTokenService.getTokenBalance(_token, address(this));
            require(response == HederaResponseCodes.SUCCESS, "HTS get balance failed");
            return uint256(int256(balance));
        }
    }

    // Accept plain HBAR transfers
    receive() external payable {}
}