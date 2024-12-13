// Contract exports
export { DePollsABI, POLLS_CONTRACT_ADDRESS } from './abis';

// Contract types and interfaces
export const CHAIN_ID = 84532; // Base Sepolia
export const NETWORK_NAME = 'Base Sepolia';

// EIP-712 Domain
export const DOMAIN = {
  name: 'DePolls',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: POLLS_CONTRACT_ADDRESS
}; 