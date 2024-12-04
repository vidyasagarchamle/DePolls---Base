# DePolls - Web3 Polling Platform

DePolls is a decentralized polling platform built on Ethereum that allows users to create and participate in polls using their Web3 wallets. The platform features token-weighted voting, multiple-choice options, and rewards users with DPOLL tokens for participation.

## Features

- Create polls with single-choice or multiple-choice options
- Token-weighted voting based on DPOLL token holdings
- Real-time results visualization
- Wallet-based authentication (MetaMask, WalletConnect)
- Reward system using DPOLL tokens
- Clean and intuitive user interface

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask or any Web3 wallet
- Sepolia testnet ETH (for deploying and testing)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/depolls.git
cd depolls
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
SEPOLIA_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
REACT_APP_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

4. Compile the smart contracts:
```bash
npx hardhat compile
```

5. Deploy the contracts to Sepolia testnet:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

6. Update the contract addresses in your `.env` file:
```
REACT_APP_TOKEN_ADDRESS=deployed_token_address
REACT_APP_POLLS_CONTRACT_ADDRESS=deployed_polls_address
```

7. Start the development server:
```bash
npm start
```

## Smart Contracts

- `DePollsToken.sol`: ERC-20 token contract for the DPOLL token
- `DePolls.sol`: Main contract for poll management and voting logic

## Testing

Run the test suite:
```bash
npx hardhat test
```

## Frontend

The frontend is built with:
- React
- Chakra UI
- Web3Modal
- wagmi
- Chart.js

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 