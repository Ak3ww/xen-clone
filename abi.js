// abi.js
export const CONTRACT_ADDRESS = "0x9d0bc975e1cb8895249ba11c03c08c79d158b11d";

export const CONTRACT_ABI = [
  "function claimRank(uint256 term) external",
  "function claimMintReward() external",
  "function userMints(address) view returns (uint256 term, uint256 maturityTs, uint256 rank)",
  "function globalRank() view returns (uint256)"
];
