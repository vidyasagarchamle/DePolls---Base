# DePolls - Decentralized Polling Platform

A modern, decentralized polling platform built on Base (Sepolia testnet) that allows users to create and participate in polls without gas fees.

## Features

- **Gasless Voting**: Vote on polls without paying gas fees using EIP-712 signatures
- **User-Friendly Interface**: Modern UI with smooth transitions and intuitive design
- **Poll Management**:
  - Create polls with multiple options
  - Set custom poll duration
  - Optional whitelisting for restricted voting
  - View and manage your created polls
  - Participate in active polls
- **Advanced Features**:
  - Real-time updates and automatic refresh
  - Optimistic updates for instant feedback
  - Comprehensive validation and error handling
  - Responsive design for all devices
  - Dark/Light mode support

## Deployed Contract (Base Sepolia)

- DePolls: `0x41395582EDE920Dcef10fea984c9A0459885E8eB`

## Architecture

### Smart Contract
- Built with Solidity and deployed on Base Sepolia
- Uses OpenZeppelin for secure implementation
- Features:
  - Gasless voting with EIP-712 signatures
  - Whitelisting support
  - Poll duration management
  - Vote tracking and validation

### Frontend
- React.js with Chakra UI
- Web3 Integration:
  - WalletConnect for wallet connectivity
  - wagmi hooks for contract interactions
  - viem for transaction handling

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

## License

This project is licensed under the MIT License. 