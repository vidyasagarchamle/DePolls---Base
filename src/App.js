import React from 'react';
import { Container, VStack, Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { Web3Modal } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import Navbar from './components/Navbar';

function App() {
  const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
  const bgGradient = useColorModeValue(
    'linear(to-r, blue.400, purple.500)',
    'linear(to-r, blue.200, purple.300)'
  );

  return (
    <>
      <Box minH="100vh">
        <Navbar />
        <Container maxW="container.lg" py={8}>
          <VStack spacing={8} align="stretch">
            <Box textAlign="center" py={10}>
              <Heading
                bgGradient={bgGradient}
                bgClip="text"
                fontSize={{ base: "4xl", md: "6xl" }}
                fontWeight="bold"
                mb={4}
              >
                Welcome to DePolls
              </Heading>
              <Text
                fontSize={{ base: "lg", md: "xl" }}
                color={useColorModeValue('gray.600', 'gray.300')}
                maxW="2xl"
                mx="auto"
              >
                A decentralized polling platform on Base Sepolia. Create and participate in polls with 
                gasless voting using EIP-712 signatures.
              </Text>
            </Box>
            <PollList />
          </VStack>
        </Container>
      </Box>
      <Web3Modal
        projectId={projectId}
        ethereumClient={ethereumClient}
        defaultChain={baseSepolia}
        themeVariables={{
          '--w3m-font-family': 'Outfit, sans-serif',
          '--w3m-accent-color': '#0093FF',
          '--w3m-background-color': '#ffffff',
          '--w3m-container-border-radius': '16px',
        }}
      />
    </>
  );
}

export default App; 