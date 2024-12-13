import React from 'react';
import { Container, VStack, Box } from '@chakra-ui/react';
import { Web3Modal } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import Navbar from './components/Navbar';

function App() {
  const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;

  return (
    <>
      <Box minH="100vh">
        <Navbar />
        <Container maxW="container.lg" py={8}>
          <VStack spacing={8} align="stretch">
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