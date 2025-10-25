// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title PayrollManager (Manual Yield-Managed Escrow)
/// @notice Handles payroll scheduling and execution with manual admin yield management
contract PayrollManagerOld {
    /*//////////////////////////////////////////////////////////////
                               STATE
    //////////////////////////////////////////////////////////////*/

    address public immutable owner;
    bool public paused;

    struct Payment {
        address payer;
        address recipient;
        address token;
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

    event PaymentScheduled(address indexed payer, address indexed recipient, uint256 amount, address indexed token, uint256 chainId);
    event PaymentExecuted(uint256 indexed id, address indexed recipient, uint256 amount);
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

    /// @notice Schedule a payment (anyone can schedule when not paused)
    function schedulePayment(
        address _recipient,
        address _token,
        uint256 _amount,
        uint256 _chainId
    ) external whenNotPaused {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Zero amount");

        // Transfer funds from payer to contract
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        payments.push(Payment({
            payer: msg.sender,
            recipient: _recipient,
            token: _token,
            amount: _amount,
            chainId: _chainId,
            executed: false
        }));

        unchecked {
            totalEscrowed += _amount;
        }

        emit PaymentScheduled(msg.sender, _recipient, _amount, _token, _chainId);
    }

    /// @notice Execute a scheduled payment (anyone can trigger)
    function executePayment(uint256 _id) external whenNotPaused {
        require(_id < payments.length, "Invalid ID");
        Payment storage p = payments[_id];
        require(!p.executed, "Already executed");

        p.executed = true;

        unchecked {
            totalEscrowed -= p.amount;
        }

        IERC20(p.token).transfer(p.recipient, p.amount);
        emit PaymentExecuted(_id, p.recipient, p.amount);
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
    ) external onlyAdmin {
        require(!paused, "Paused");
        require(_yieldWallet != address(0), "Invalid wallet");
        require(_amount > 0, "Zero amount");

        IERC20 token = IERC20(_token);
        uint256 bal = token.balanceOf(address(this));
        require(bal >= _amount, "Insufficient balance");

        token.transfer(_yieldWallet, _amount);
        emit FundsMovedToYield(_token, _amount, _note);
    }

    /// @notice Admin recalls yield funds back into contract
    function recallFundsFromYield(
        address _token,
        uint256 _amount,
        string calldata _note
    ) external onlyAdmin {
        require(!paused, "Paused");
        require(_amount > 0, "Zero amount");

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
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
        IERC20(_token).transfer(_to, _amount);
    }

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    function getPaymentsCount() external view returns (uint256) {
        return payments.length;
    }

    function getBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
}
