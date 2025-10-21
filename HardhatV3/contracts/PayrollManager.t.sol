// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "./PayrollManager.sol";

contract MockERC20 is Test {
    string public name = "Mock Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Not allowed");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract PayrollManagerTest is Test {
    PayrollManager manager;
    MockERC20 token;
    address admin = address(0xA1);
    address recipient = address(0xB1);
    address yieldWallet = address(0xC1);

    function setUp() public {
        manager = new PayrollManager();
        token = new MockERC20();
        token.mint(address(this), 1_000_000 ether);
        token.approve(address(manager), type(uint256).max);
    }

    function testAddRemoveAdmin() public {
        manager.addAdmin(admin);
        assertTrue(manager.isAdmin(admin));
        manager.removeAdmin(admin);
        assertFalse(manager.isAdmin(admin));
    }

    function testScheduleAndExecutePayment() public {
        manager.schedulePayment(recipient, address(token), 100 ether, 11155111);
        assertEq(manager.totalEscrowed(), 100 ether);
        assertEq(token.balanceOf(address(manager)), 100 ether);

        manager.executePayment(0);
        assertEq(token.balanceOf(recipient), 100 ether);
        assertEq(manager.totalEscrowed(), 0);
    }

    function testPauseAndUnpause() public {
        manager.pause();
        vm.expectRevert(bytes("Paused"));
        manager.schedulePayment(recipient, address(token), 50 ether, 11155111);

        manager.unpause();
        manager.schedulePayment(recipient, address(token), 50 ether, 11155111);
    }

    function testManualMoveAndRecallFunds() public {
        manager.addAdmin(address(this));
        token.mint(address(manager), 200 ether);

        manager.moveFundsToYield(address(token), yieldWallet, 100 ether, "Send to yield");
        assertEq(token.balanceOf(yieldWallet), 100 ether);

        token.approve(address(manager), 100 ether);
        manager.recallFundsFromYield(address(token), 100 ether, "Recall");
        assertEq(token.balanceOf(address(manager)), 200 ether);
    }

    function testEmergencyWithdraw() public {
        token.mint(address(manager), 300 ether);
        manager.emergencyWithdraw(address(token), admin, 300 ether);
        assertEq(token.balanceOf(admin), 300 ether);
    }
}
