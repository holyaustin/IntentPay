// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PayrollManager} from "./PayrollManager.sol";

// Inline mock ERC20 contract that includes all required interface functions.
contract MockERC20 {
    string public name = "MockToken";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");
        
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract PayrollManagerTest is Test {
    PayrollManager public payrollManager;
    MockERC20 public mockToken;

    address public owner;
    address public admin;
    address public user;
    address public recipient1;
    address public recipient2;
    uint256 public constant NATIVE_AMOUNT = 1 ether;
    uint256 public constant ERC20_AMOUNT = 1000;

    function setUp() public {
        owner = address(1);
        admin = address(2);
        user = address(3);
        recipient1 = address(4);
        recipient2 = address(5);

        vm.prank(owner);
        payrollManager = new PayrollManager();

        vm.prank(owner);
        payrollManager.addAdmin(admin);

        mockToken = new MockERC20();
    }

    function test_constructor_setsOwnerAndAdmin() public {
        assertEq(payrollManager.owner(), owner, "Owner not set correctly");
        assertTrue(payrollManager.isAdmin(owner), "Owner should be an admin");
    }

    function test_addAdmin() public {
        address newAdmin = address(6);
        vm.prank(owner);
        payrollManager.addAdmin(newAdmin);
        assertTrue(payrollManager.isAdmin(newAdmin), "New admin not added");
    }

    function test_removeAdmin() public {
        vm.prank(owner);
        payrollManager.removeAdmin(admin);
        assertFalse(payrollManager.isAdmin(admin), "Admin not removed");
    }

    function test_pauseAndUnpause() public {
        vm.prank(admin);
        payrollManager.pause();
        assertTrue(payrollManager.paused(), "Contract not paused");

        vm.prank(admin);
        payrollManager.unpause();
        assertFalse(payrollManager.paused(), "Contract not unpaused");
    }

    function test_schedulePayments_Native() public {
        address[] memory recipients = new address[](1);
        recipients[0] = recipient1;
        address[] memory tokens = new address[](1);
        tokens[0] = address(0);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = NATIVE_AMOUNT;
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 296;

        vm.deal(user, NATIVE_AMOUNT);
        vm.prank(user);
        payrollManager.schedulePayments{value: NATIVE_AMOUNT}(recipients, tokens, amounts, chainIds);

        (address payer, address recipient, address token, uint256 amount, uint256 chainId, bool executed) = payrollManager.payments(0);

        assertEq(payer, user, "Payer not correct");
        assertEq(recipient, recipient1, "Recipient not correct");
        assertEq(amount, NATIVE_AMOUNT, "Amount not correct");
        assertFalse(executed, "Payment should not be executed");
    }

    function test_schedulePayments_ERC20() public {
        address[] memory recipients = new address[](1);
        recipients[0] = recipient2;
        address[] memory tokens = new address[](1);
        tokens[0] = address(mockToken);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = ERC20_AMOUNT;
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 296;

        vm.prank(user);
        mockToken.mint(user, ERC20_AMOUNT);
        vm.prank(user);
        mockToken.approve(address(payrollManager), ERC20_AMOUNT);

        vm.prank(user);
        payrollManager.schedulePayments(recipients, tokens, amounts, chainIds);

        (address payer, address recipient, address token, uint256 amount, uint256 chainId, bool executed) = payrollManager.payments(0);

        assertEq(payer, user, "Payer not correct");
        assertEq(recipient, recipient2, "Recipient not correct");
        assertEq(amount, ERC20_AMOUNT, "Amount not correct");
        assertFalse(executed, "Payment should not be executed");
    }

    function test_executePayment_Native() public {
        address[] memory recipients = new address[](1);
        recipients[0] = recipient1;
        address[] memory tokens = new address[](1);
        tokens[0] = address(0);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = NATIVE_AMOUNT;
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = 296;

        vm.deal(user, NATIVE_AMOUNT);
        vm.prank(user);
        payrollManager.schedulePayments{value: NATIVE_AMOUNT}(recipients, tokens, amounts, chainIds);

        uint256 initialRecipientBalance = recipient1.balance;

        vm.prank(user);
        payrollManager.executePayment(0);

        (address payer, address recipient, address token, uint256 amount, uint256 chainId, bool executed) = payrollManager.payments(0);
        
        assertEq(recipient1.balance, initialRecipientBalance + NATIVE_AMOUNT, "Native token transfer failed");
        assertTrue(executed, "Payment not marked as executed");
    }
}
