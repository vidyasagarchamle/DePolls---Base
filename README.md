# DePolls - Web3 Native Polling Platform

DePolls is a decentralized polling platform built on Base that allows users to create, vote on, and manage polls in a transparent and secure manner.

## Features

- Create polls with multiple options
- Vote on active polls using your Web3 wallet
- Real-time vote tracking and visualization
- Token-based rewards for poll participation
- Dark/Light mode support
- Responsive design for all devices
- Instant transaction feedback with optimistic updates

## Deployed Contracts (Base Sepolia)

- DePollsToken: `0x9be87fdCf8dC946683702192Ebd4f1924a96B18B`
- DePolls: `0x41395582EDE920Dcef10fea984c9A0459885E8eB`

## Architecture

### Smart Contracts
- Built with Solidity and deployed on Base
- Uses OpenZeppelin for secure token and access control implementation
- Main contracts:
  - `DePollsToken.sol`: ERC20 token for rewards
  - `DePolls.sol`: Core polling logic and management

### Frontend
- React.js with Chakra UI
- Web3 Integration:
  - WalletConnect for wallet connectivity
  - wagmi hooks for contract interactions
  - Alchemy SDK for blockchain data

## Setup and Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/depolls.git
   cd depolls
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following:
   ```
   REACT_APP_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
   PRIVATE_KEY=your_private_key_for_deployment
   BASESCAN_API_KEY=your_basescan_api_key
   ```

4. Run development server:
   ```bash
   npm start
   ```

## Network Information

The application is deployed on Base Sepolia testnet. To interact with the dApp:

1. Add Base Sepolia to your MetaMask:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

2. Get Base Sepolia ETH from:
   - [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)

## Testing

Run the test suite:
```bash
npm test
```

## Deployment

To deploy to Base Sepolia:
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 