// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../FakeRewards.sol";

/**
 * Part 14 — OPTIONAL Sepolia deployment script.
 *
 * NEVER deploys to mainnet. Deployment requires explicit environment
 * configuration and refuses to run against chain ID 1 (or unknown chains).
 *
 * Usage (Foundry standard secret handling — the key is read from env and is
 * never printed, logged, or committed):
 *
 *   export SEPOLIA_RPC_URL=https://rpc.sepolia.org
 *   export DEPLOYER_PRIVATE_KEY=0x...      // testnet key ONLY
 *   export DEMO_OPERATOR=0x...             // address that receives the demo approval
 *   export DEMO_NFT_CONTRACT=0x...         // testnet NFT contract (0x0 = approval path reverts)
 *
 *   cd contracts && forge script script/DeploySepolia.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address demoOperator = vm.envOr("DEMO_OPERATOR", address(0));
        address demoNft = vm.envOr("DEMO_NFT_CONTRACT", address(0));

        vm.startBroadcast(deployerKey);

        uint256 chainId = block.chainid;
        require(chainId == 11155111, "SAFETY: this script deploys to SEPOLIA (11155111) ONLY");
        require(demoOperator != address(0), "DEMO_OPERATOR must be set (testnet address)");

        FakeRewards demo = new FakeRewards(demoOperator, demoNft);

        // Confirmation log — no secrets, no key material (Part 20).
        console.log("Deployed FakeRewards (DEMO) at:", address(demo));
        console.log("Chain:", chainId);
        console.log("Demo operator:", demoOperator);
        if (demoNft == address(0)) {
            console.log("Demo NFT contract: (none - approval path will revert)");
        } else {
            console.log("Demo NFT contract:", demoNft);
        }

        vm.stopBroadcast();
    }
}
