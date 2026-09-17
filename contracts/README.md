# FakeRewards.sol — Testnet Security Demonstration Contract

> **CRITICAL NOTICE**: This contract is strictly an educational test artifact for **COGNITIA 2026 Hackathon (BLOCKCHAIN-PS2)**. It must never be deployed on any public production mainnet.

## Purpose
`FakeRewards.sol` demonstrates the real-world mechanics of how Web3 phishing sites trick users:
1. The frontend dApp presents an attractive "Claim 5,000 $REWARD" button.
2. The transaction payload secretly aims to grant full operator approval (`setApprovalForAll`) or invoke unverified functions with high privilege escalations.
3. Without a pre-execution firewall like **Cognitia Shield**, MetaMask presents a generic transaction popup where non-technical users click "Confirm" without realizing they granted a malicious operator permission to drain their NFTs.
4. **Cognitia Shield** intercepts this call pre-signing, decodes the selector and calldata, performs state-diff simulation, queries threat intelligence, and flags the transaction as **CRITICAL RISK (94/100)** with human-readable warnings.

## Security properties (hardening pass)
- Minimal: two functions, two events, immutable configuration.
- No owner backdoor, no upgrade mechanism, no delegatecall, no arbitrary external calls.
- The ONLY ether exit is `TESTNET_FAUCET_DRAIN()`, gated to the deployer.
- The approval target is fixed at deployment — the contract is not an arbitrary-call gadget.
- Foundry tests in `FakeRewards.t.sol` prove all of the above.

## Testnet Deployment (Sepolia ONLY — script refuses other chains)

**Constructor now takes two arguments** (operator AND demo NFT contract):
```bash
# Manual forge create (testnet key ONLY — never commit or print it):
OPERATOR="0x6666666666666666666666666666666666666666"
NFT="0xyour-testnet-nft-contract"

forge create FakeRewards \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $OPERATOR $NFT
```

Or use the gated deploy script (Part 14):
```bash
export SEPOLIA_RPC_URL=https://rpc.sepolia.org
export DEPLOYER_PRIVATE_KEY=0x...   # testnet key ONLY
export DEMO_OPERATOR=0x6666666666666666666666666666666666666666
export DEMO_NFT_CONTRACT=0x...      # optional; 0x0 makes the approval path revert safely

cd contracts && forge script script/DeploySepolia.s.sol \
  --rpc-url $SEPOLIA_RPC_URL --broadcast
```

Run the security tests:
```bash
cd contracts && forge test
```
