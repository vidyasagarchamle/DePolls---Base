# DePolls - Web3 Native Polling Platform

DePolls is a decentralized polling platform built on Ethereum that allows users to create, vote on, and manage polls in a transparent and secure manner.

## Features

- Create polls with multiple options
- Vote on active polls using your Web3 wallet
- Real-time vote tracking and visualization
- Token-based rewards for poll participation
- Dark/Light mode support
- Responsive design for all devices
- Instant transaction feedback with optimistic updates

## Architecture

### Smart Contracts
- Built with Solidity and deployed on Ethereum
- Uses OpenZeppelin for secure token and access control implementation
- Main contracts:
  - `DePollsToken.sol`: ERC20 token for rewards
  - `DePollsManager.sol`: Core polling logic and management
  - `DePollsFactory.sol`: Poll creation and lifecycle management

### Frontend
- React.js with Next.js framework
- Chakra UI for modern, accessible components
- Web3 Integration:
  - WalletConnect for wallet connectivity
  - wagmi hooks for contract interactions
  - Alchemy SDK for blockchain data
- State Management:
  - React Context for global state
  - SWR for data fetching and caching

### Data Flow
1. Poll Creation:
   - User creates poll through frontend interface
   - Transaction sent to DePollsFactory contract
   - Poll data stored on-chain with options and settings
   - UI updates optimistically while transaction confirms

2. Voting Process:
   - Users connect wallet to participate
   - Votes recorded on-chain through smart contract
   - Real-time UI updates with transaction feedback
   - Rewards distributed automatically post-vote

3. Poll Management:
   - Active polls fetched from blockchain
   - Creator can close polls when voting period ends
   - Results permanently stored on-chain
   - UI filters and displays based on poll status

## Recent Updates

- Improved transaction handling with better feedback
- Added optimistic updates for instant UI response
- Enhanced poll card design with animated progress bars
- Implemented new reward distribution mechanism
- Added custom logos for platform and token
- Fixed vote recording synchronization
- Improved error handling and user feedback
- Enhanced mobile responsiveness

## Setup and Development

1. Clone the repository
2. Install dependencies:
   ```bash
   cd depolls
   npm install
   ```

3. Configure environment variables:
   ```
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_id
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 