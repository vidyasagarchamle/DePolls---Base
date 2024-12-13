import React from 'react';
import { Container, VStack, Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { Web3Modal, Web3Button } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import { Card } from '@chakra-ui/react';
import { useAccount } from 'wagmi';
import theme from './theme';

function App() {
  const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
  const { isConnected } = useAccount();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <>
      <Box minH="100vh" bg={bgColor}>
        <Container maxW="container.lg" py={8}>
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading as="h1" size="2xl" mb={4} bgGradient="linear(to-r, brand.500, purple.500)" bgClip="text">
                DePolls
              </Heading>
              <Text fontSize="lg" color={textColor}>
                A modern, decentralized polling platform built on Base, featuring secure voting, 
                real-time updates, and a seamless user experience.
              </Text>
            </Box>
            
            <Web3Button />
            
            {isConnected ? (
              <PollList />
            ) : (
              <Card p={8} textAlign="center" bg={cardBg} borderRadius="xl">
                <Text fontSize="lg" color={textColor}>
                  Connect your wallet to create and participate in polls
                </Text>
              </Card>
            )}
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