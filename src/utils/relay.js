import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS, DOMAIN } from '../contracts';

const RELAYER_PRIVATE_KEY = process.env.REACT_APP_RELAYER_PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const pollsContract = new ethers.Contract(POLLS_CONTRACT_ADDRESS, DePollsABI, relayerWallet);

export const relayVote = async (pollId, optionIndexes, signature) => {
  try {
    const { v, r, s } = ethers.utils.splitSignature(signature);
    const tx = await pollsContract.metaVote(pollId, optionIndexes, v, r, s);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Relay error:', error);
    throw error;
  }
}; 