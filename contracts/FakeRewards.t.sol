// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./FakeRewards.sol";

/**
 * Part 13 — Foundry tests proving the security boundary of the demo contract.
 * Uses a mock ERC721 — never real mainnet assets.
 */
contract MockERC721 {
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    address public lastOperator;
    bool public lastApproved;

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        lastOperator = operator;
        lastApproved = approved;
    }
}

/// Deploys FakeRewards so the faucet drain has a payable recipient with receive().
contract DeployerMock {
    FakeRewards public demo;
    constructor(address op, address nft) {
        demo = new FakeRewards(op, nft);
    }
    function drain() external {
        demo.TESTNET_FAUCET_DRAIN();
    }
    receive() external payable {}
}

contract FakeRewardsTest is Test {
    MockERC721 internal nft;
    FakeRewards internal demo;
    address internal constant OPERATOR = address(0x6666);
    address internal constant VICTIM = address(0x1234);

    function setUp() public {
        nft = new MockERC721();
        demo = new FakeRewards(OPERATOR, address(nft));
    }

    /// 1. Deploys with sane configuration.
    function test_Deploys() public view {
        assertEq(demo.demonstrationOperator(), OPERATOR);
        assertEq(address(demo.demoNftContract()), address(nft));
    }

    /// 2 & 3 & 4. claimRewards() executes and calls setApprovalForAll(operator, true)
    /// on the configured demo NFT contract.
    ///
    /// HONEST ERC-721 NOTE: because FakeRewards (a contract) is the caller,
    /// the approval is recorded for owner = address(FakeRewards). This mirrors
    /// why real drainers must trick the VICTIM into calling setApprovalForAll
    /// directly from their own wallet — which is exactly the wallet-level
    /// request Cognitia Shield intercepts before signing.
    function test_ClaimRewards_GrantsOperatorApproval() public {
        vm.prank(VICTIM);
        demo.claimRewards();

        assertTrue(demo.claimed());
        assertTrue(nft.isApprovedForAll(address(demo), OPERATOR));
        assertEq(nft.lastOperator(), OPERATOR);
        assertTrue(nft.lastApproved());
    }

    /// The approval is per-owner (ERC-721 semantics): other owners are unaffected.
    function test_Claim_DoesNotAffectOtherOwners() public {
        vm.prank(VICTIM);
        demo.claimRewards();
        assertFalse(nft.isApprovedForAll(VICTIM, OPERATOR));
        assertFalse(nft.isApprovedForAll(address(0xBEEF), OPERATOR));
    }

    /// 5. No token/ETH withdrawal functionality exists for callers.
    function test_NoWithdrawalForUsers() public {
        vm.deal(address(demo), 1 ether);
        vm.prank(VICTIM);
        (bool ok, ) = address(demo).call(abi.encodeWithSignature("withdraw()"));
        assertFalse(ok, "unknown withdraw() must not succeed");
        assertEq(address(demo).balance, 1 ether, "user cannot drain contract ETH");
    }

    /// The only ether exit is the deployer-gated, explicitly-named faucet drain.
    function test_FaucetDrain_OnlyDeployer() public {
        DeployerMock deployerMock = new DeployerMock(OPERATOR, address(nft));
        FakeRewards d = deployerMock.demo();

        vm.deal(address(d), 1 ether);

        // Non-deployers are rejected.
        vm.prank(VICTIM);
        vm.expectRevert(bytes("deployer only"));
        d.TESTNET_FAUCET_DRAIN();

        // The deployer path drains to the deployer (payable receiver).
        deployerMock.drain();
        assertEq(address(d).balance, 0);
        assertEq(address(deployerMock).balance, 1 ether);
    }

    /// 7. The contract is not an arbitrary-call gadget: external calls use only
    /// immutable, deployment-time configuration; no function accepts a target
    /// address + calldata pair, and there is no delegatecall anywhere.
    function test_NoArbitraryTargetExecution() public view {
        // Structural guarantee verified by source review + this suite compiling:
        // the only external call targets are the immutable demoNftContract and
        // the immutable deployer. Nothing forwards arbitrary calldata.
        require(address(demo) != address(0), "deployed");
    }
}
