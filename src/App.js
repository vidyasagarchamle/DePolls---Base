import React from 'react';
import { ChakraProvider, Box, Container } from '@chakra-ui/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { Web3Modal } from '@web3modal/react';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import Navbar from './components/Navbar';
import PollList from './components/PollList';
import CreatePoll from './components/CreatePoll';

// Hardcode the project ID for now
const projectId = "ad702a29a086d332c88ecdd4c8dcd51c";
const chains = [sepolia];

console.log("WalletConnect Project ID:", projectId); // Debug log

const { publicClient, webSocketPublicClient } = configureChains(
  chains,
  [
    w3mProvider({ projectId }),
    publicProvider()
  ]
);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ 
    projectId,
    version: '2',
    chains 
  }),
  publicClient,
  webSocketPublicClient
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

function App() {
  return (
    <>
      <WagmiConfig config={wagmiConfig}>
        <ChakraProvider>
          <Box minH="100vh" bg="gray.50">
            <Navbar />
            <Container maxW="container.xl" py={8}>
              <CreatePoll />
              <Box mt={8}>
                <PollList />
              </Box>
            </Container>
          </Box>
        </ChakraProvider>
      </WagmiConfig>
      <Web3Modal
        projectId={projectId}
        ethereumClient={ethereumClient}
        defaultChain={sepolia}
        themeMode="light"
        explorerRecommendedWalletIds={[
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'  // Trust Wallet
        ]}
      />
    </>
  );
}

export default App; 