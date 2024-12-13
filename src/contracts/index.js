// Contract exports
export { DePollsABI } from './abis';
export const POLLS_CONTRACT_ADDRESS = process.env.REACT_APP_POLLS_CONTRACT_ADDRESS;

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