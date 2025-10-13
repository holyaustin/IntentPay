// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PayrollManager} from "./PayrollManager.sol";
import {Test} from "forge-std/Test.sol";
import {StdCheats} from "forge-std/StdCheats.sol";

/// @notice Minimal ERC20 mock with mint and transfer logic for Foundry tests
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 value) public {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "INSUFFICIENT_BALANCE");
        require(allowance[from][msg.sender] >= value, "INSUFFICIENT_ALLOWANCE");
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}

contract PayrollManagerTest is Test {
    PayrollManager payroll;
    MockERC20 usdc;
    address admin = address(1);
    address recipient = address(2);

    function setUp() public {
        payroll = new PayrollManager();
        usdc = new MockERC20("USDC", "USDC");
        vm.prank(payroll.owner());
        payroll.addAdmin(admin);
        usdc.mint(admin, 1_000_000);
    }

    function test_CanSchedulePayment() public {
        vm.startPrank(admin);
        usdc.approve(address(payroll), 1000);
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
        vm.stopPrank();

        (address recipient_, , , , ) = payroll.payments(0);
        assertEq(recipient_, recipient);
        assertEq(payroll.totalEscrowed(), 1000);
    }

    function test_CannotExecuteInvalidPayment() public {
        vm.startPrank(admin);
        usdc.approve(address(payroll), 1000);
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
        vm.stopPrank();

        vm.expectRevert();
        payroll.executePayment(999);
    }

    function test_OnlyAdminCanSchedule() public {
        vm.expectRevert();
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
    }
}
