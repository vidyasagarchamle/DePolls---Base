import React from 'react';
import { ChakraProvider, Box, Container, VStack, useColorMode, Text, Heading, Flex } from '@chakra-ui/react';
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { Web3Modal } from '@web3modal/react';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import Navbar from './components/Navbar';
import PollList from './components/PollList';
import theme from './theme';

// Import Google Font
const Head = () => (
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
);

const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
const chains = [baseSepolia];

const { publicClient, webSocketPublicClient } = configureChains(
  chains,
  [
    w3mProvider({ projectId }),
    publicProvider()
  ],
  {
    pollingInterval: 2000,
    stallTimeout: 2000,
    retryCount: 5,
    retryDelay: 1000,
    batch: {
      multicall: true
    }
  }
);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, version: '2', chains }),
  publicClient,
  webSocketPublicClient,
  syncConnectedChain: true,
  persister: null,
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

const HeroSection = () => {
  const { colorMode } = useColorMode();
  return (
    <Box 
      py={16} 
      px={4}
      bg={colorMode === 'dark' ? 'gray.800' : 'white'}
      borderRadius="xl"
      boxShadow="xl"
      mb={8}
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(45deg, rgba(66, 153, 225, 0.1) 0%, rgba(236, 201, 75, 0.1) 100%)',
        animation: 'gradient 15s ease infinite',
      }}
    >
      <Container maxW="container.lg">
        <VStack spacing={6} textAlign="center">
          <Heading 
            as="h1" 
            size="2xl" 
            bgGradient="linear(to-r, blue.400, purple.500)" 
            bgClip="text"
            letterSpacing="tight"
          >
            Welcome to DePolls
          </Heading>
          <Text fontSize="xl" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
            A decentralized polling platform where your voice matters. Create polls, vote securely, 
            and participate in transparent decision-making powered by blockchain technology.
          </Text>
          <Box 
            w="full" 
            h="2px" 
            bgGradient="linear(to-r, transparent, purple.500, transparent)" 
            my={4} 
          />
          <Flex gap={8} flexWrap="wrap" justify="center">
            <VStack align="center" p={4}>
              <Text fontWeight="bold" color="blue.400">Secure Voting</Text>
              <Text>One-time voting system backed by blockchain</Text>
            </VStack>
            <VStack align="center" p={4}>
              <Text fontWeight="bold" color="purple.400">Transparent</Text>
              <Text>All votes are recorded on-chain</Text>
            </VStack>
            <VStack align="center" p={4}>
              <Text fontWeight="bold" color="blue.400">Decentralized</Text>
              <Text>No central authority controls the results</Text>
            </VStack>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
};

function App() {
  const { colorMode } = useColorMode();

  return (
    <>
      <Head />
      <WagmiConfig config={wagmiConfig}>
        <ChakraProvider theme={theme}>
          <Box minH="100vh">
            <Navbar />
            <Container maxW="container.xl" py={8}>
              <VStack spacing={8} w="full">
                <HeroSection />
                <PollList />
              </VStack>
            </Container>
          </Box>
        </ChakraProvider>
      </WagmiConfig>
      <Web3Modal
        projectId={projectId}
        ethereumClient={ethereumClient}
        defaultChain={baseSepolia}
        themeMode={colorMode}
        themeVariables={{
          '--w3m-font-family': 'Outfit, sans-serif',
          '--w3m-accent-color': '#3b00e6',
          '--w3m-background-color': colorMode === 'dark' ? '#1a202c' : '#ffffff',
          '--w3m-container-border-radius': '16px',
        }}
        mobileWalletConfig={{
          autoConnect: true,
          removeQrCodeAfterConnect: true,
        }}
      />
    </>
  );
}

export default App; 