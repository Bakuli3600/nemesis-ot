// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// DEMONSTRATION ONLY
// DO NOT DEPLOY WITH REAL ASSETS
// This contract exists to demonstrate, in a controlled and reviewable way, how
// a phishing "claim rewards" front-end can hide a collection-wide NFT approval.
// It deliberately contains the dangerous approval pattern so the Cognitia Shield
// interceptor has a real target to detect — and nothing else.

/**
 * @title FakeRewards — Testnet Phishing Security Demonstration Contract
 * @notice WARNING: For educational and testnet security analysis ONLY.
 *         NEVER deploy to mainnet. NEVER use with real assets.
 *
 * Security review notes (Parts 12 & 13):
 *  - Minimal surface: two functions, two events, two immutable addresses.
 *  - No owner backdoor, no upgrade mechanism, no delegatecall, no arbitrary
 *    external call targets, no hidden withdrawal path, no payable trap beyond
 *    an explicitly-marked faucet receiver that can only be drained to the
 *    deployer by the TESTNET_FAUCET_DRAIN function used in testnet teardown.
 *  - The dangerous behavior is OBVIOUS: claimRewards() grants
 *    setApprovalForAll(demoOperator, true) on a configured demo NFT contract.
 */
interface IERC721Minimal {
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

contract FakeRewards {
    /// @notice The address that would receive the collection-wide approval.
    address public immutable demonstrationOperator;
    /// @notice The configured DEMO/testnet NFT contract to approve on.
    address public immutable demoNftContract;
    /// @notice Deployer, used ONLY for the labeled testnet faucet drain.
    address public immutable deployer;

    bool public claimed;

    event SecurityDemoClaimTriggered(address indexed victim, address indexed operator, address indexed nftContract);
    event MockRewardCalculated(address indexed victim, uint256 rewardAmount);

    constructor(address _demoOperator, address _demoNftContract) {
        require(_demoOperator != address(0), "operator required");
        // The NFT contract may be zero for a UI-only deployment; the approval
        // path then reverts, which is the safe failure mode.
        demonstrationOperator = _demoOperator;
        demoNftContract = _demoNftContract;
        deployer = msg.sender;
    }

    /**
     * @notice Deceptive claim function presented to users as an airdrop claim.
     * The dangerous behavior is explicit and visible to any reviewer:
     * it grants setApprovalForAll(demonstrationOperator, true) on the
     * configured demo NFT contract, exactly like a real drainer would.
     */
    function claimRewards() external {
        claimed = true;
        emit MockRewardCalculated(msg.sender, 5000 ether);

        if (demoNftContract != address(0)) {
            // DEMONSTRATION ONLY — this is the malicious pattern Cognitia detects.
            IERC721Minimal(demoNftContract).setApprovalForAll(demonstrationOperator, true);
        }
        emit SecurityDemoClaimTriggered(msg.sender, demonstrationOperator, demoNftContract);
    }

    /**
     * @notice Helper simulating an attack payload where a dApp tricks the user
     * into directly approving an operator for a given NFT collection.
     * The target is restricted to the configured demo contract on purpose —
     * this contract must not be an arbitrary-call gadget.
     */
    function triggerDemoSetApprovalForAll() external {
        require(demoNftContract != address(0), "demo NFT contract not configured");
        IERC721Minimal(demoNftContract).setApprovalForAll(demonstrationOperator, true);
    }

    /**
     * @notice TESTNET FAUCET TEARDOWN — returns accidentally sent testnet ETH
     * to the deployer. This is the ONLY ether exit and it is gated to the
     * deployer so the contract cannot trap (or steal) funds.
     */
    function TESTNET_FAUCET_DRAIN() external {
        require(msg.sender == deployer, "deployer only");
        (bool ok, ) = payable(deployer).call{value: address(this).balance}("");
        require(ok, "drain failed");
    }

    receive() external payable {
        // Accepts testnet dust only; see TESTNET_FAUCET_DRAIN above.
    }
}
