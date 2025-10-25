// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title PayrollManager (Supports ERC20 & Native Tokens + Batch scheduling)
/// @notice Handles payroll scheduling and execution with batch + payer-based restriction
contract PayrollManager {
    /*//////////////////////////////////////////////////////////////
                               STATE
    //////////////////////////////////////////////////////////////*/

    address public immutable owner;
    bool public paused;

    struct Payment {
        address payer;
        address recipient;
        address token; // address(0) = native token
        uint256 amount;
        uint256 chainId;
        bool executed;
    }

    Payment[] public payments;
    uint256 public totalEscrowed;
    mapping(address => bool) public isAdmin;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PaymentScheduled(
        uint256 indexed id,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 chainId
    );
    event PaymentExecuted(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        address token
    );
    event FundsMovedToYield(address indexed token, uint256 amount, string note);
    event FundsRecalledFromYield(address indexed token, uint256 amount, string note);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event AdminUpdated(address indexed admin, bool enabled);

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

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

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN & PAUSE CONTROL
    //////////////////////////////////////////////////////////////*/

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

    /*//////////////////////////////////////////////////////////////
                              CORE LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Schedule multiple payments (ERC20 or native). All arrays must match length.
    /// @dev If token[i] == address(0), msg.value must include the sum of those native amounts.
    function schedulePayments(
        address[] calldata _recipients,
        address[] calldata _tokens,
        uint256[] calldata _amounts,
        uint256[] calldata _chainIds
    ) external payable whenNotPaused {
        uint256 len = _recipients.length;
        require(
            len == _tokens.length && len == _amounts.length && len == _chainIds.length,
            "Array length mismatch"
        );
        require(len > 0, "No payments");

        // Sum native amounts that must be provided with msg.value
        uint256 nativeSum = 0;
        for (uint256 i = 0; i < len; i++) {
            if (_tokens[i] == address(0)) {
                nativeSum += _amounts[i];
            }
        }
        // Validate native value
        require(msg.value == nativeSum, "Incorrect native token amount");

        for (uint256 i = 0; i < len; i++) {
            address token = _tokens[i];
            uint256 amount = _amounts[i];

            require(_recipients[i] != address(0), "Invalid recipient");
            require(amount > 0, "Zero amount");

            if (token == address(0)) {
                // native: the msg.value was already validated and the contract now holds the funds
                // nothing else needed
            } else {
                // ERC20: transfer tokens in from payer
                IERC20(token).transferFrom(msg.sender, address(this), amount);
            }

            payments.push(
                Payment({
                    payer: msg.sender,
                    recipient: _recipients[i],
                    token: token,
                    amount: amount,
                    chainId: _chainIds[i],
                    executed: false
                })
            );

            uint256 newId = payments.length - 1;
            totalEscrowed += amount;
            emit PaymentScheduled(newId, msg.sender, _recipients[i], amount, token, _chainIds[i]);
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
            // native
            (bool success, ) = p.recipient.call{value: p.amount}("");
            require(success, "Native token transfer failed");
        } else {
            IERC20(p.token).transfer(p.recipient, p.amount);
        }

        emit PaymentExecuted(_id, p.recipient, p.amount, p.token);
    }

    /*//////////////////////////////////////////////////////////////
                          MANUAL YIELD MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Admin manually moves idle funds to a yield provider wallet (off-chain)
    function moveFundsToYield(
        address _token,
        address _yieldWallet,
        uint256 _amount,
        string calldata _note
    ) external onlyAdmin whenNotPaused {
        require(_yieldWallet != address(0), "Invalid wallet");
        require(_amount > 0, "Zero amount");

        if (_token == address(0)) {
            require(address(this).balance >= _amount, "Insufficient native balance");
            (bool success, ) = _yieldWallet.call{value: _amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20 token = IERC20(_token);
            uint256 bal = token.balanceOf(address(this));
            require(bal >= _amount, "Insufficient ERC20 balance");
            token.transfer(_yieldWallet, _amount);
        }

        emit FundsMovedToYield(_token, _amount, _note);
    }

    /// @notice Admin recalls yield funds back into contract (native recall uses msg.value)
    function recallFundsFromYield(
        address _token,
        uint256 _amount,
        string calldata _note
    ) external payable onlyAdmin whenNotPaused {
        require(_amount > 0, "Zero amount");

        if (_token == address(0)) {
            // admin sends native back via msg.value
            require(msg.value == _amount, "Incorrect native deposit");
        } else {
            IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        }

        emit FundsRecalledFromYield(_token, _amount, _note);
    }

    /*//////////////////////////////////////////////////////////////
                              OWNER CONTROL
    //////////////////////////////////////////////////////////////*/

    function emergencyWithdraw(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        require(_to != address(0), "Invalid address");

        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "Native withdraw failed");
        } else {
            IERC20(_token).transfer(_to, _amount);
        }
    }

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    function getPaymentsCount() external view returns (uint256) {
        return payments.length;
    }

    function getBalance(address _token) external view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }

    // Accept plain native transfers
    receive() external payable {}
}
