import React from 'react';
import { ChakraProvider, Box, Container, VStack, useColorMode } from '@chakra-ui/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { Web3Modal } from '@web3modal/react';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import Navbar from './components/Navbar';
import PollList from './components/PollList';
import theme from './theme';

// Hardcode the project ID for now
const projectId = "ad702a29a086d332c88ecdd4c8dcd51c";
const chains = [sepolia];

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
  const { colorMode } = useColorMode();

  return (
    <>
      <WagmiConfig config={wagmiConfig}>
        <ChakraProvider theme={theme}>
          <Box minH="100vh" bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
            <Navbar />
            <Container maxW="container.xl" py={8}>
              <VStack spacing={8} w="full">
                <PollList />
              </VStack>
            </Container>
          </Box>
        </ChakraProvider>
      </WagmiConfig>
      <Web3Modal
        projectId={projectId}
        ethereumClient={ethereumClient}
        defaultChain={sepolia}
        themeMode="dark"
        themeVariables={{
          '--w3m-font-family': 'inherit',
          '--w3m-accent-color': '#3b00e6',
          '--w3m-background-color': '#1a202c',
          '--w3m-container-border-radius': '16px',
        }}
      />
    </>
  );
}

export default App; 