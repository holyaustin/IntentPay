// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PayrollManager} from "./PayrollManager.sol";
import {Test} from "forge-std/Test.sol";
import {MockERC20} from "forge-std/mocks/MockERC20.sol";

contract PayrollManagerTest is Test {
    PayrollManager payroll;
    MockERC20 usdc;
    address admin = address(1);
    address recipient = address(2);

    function setUp() public {
        payroll = new PayrollManager();
        usdc = new MockERC20("USDC", "USDC", 6);
        vm.prank(payroll.owner());
        payroll.addAdmin(admin);
        usdc.mint(admin, 1000000);
    }

    function test_CanSchedulePayment() public {
        vm.prank(admin);
        usdc.approve(address(payroll), 1000);
        vm.prank(admin);
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
        assertEq(payroll.payments(0).recipient, recipient);
        assertEq(payroll.totalEscrowed(), 1000);
    }

    function test_CannotExecuteInvalidPayment() public {
        vm.prank(admin);
        usdc.approve(address(payroll), 1000);
        vm.prank(admin);
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
        vm.expectRevert();
        payroll.executePayment(999); // invalid ID
    }

    function test_OnlyAdminCanSchedule() public {
        vm.expectRevert();
        payroll.schedulePayment(recipient, address(usdc), 1000, 1);
    }
}