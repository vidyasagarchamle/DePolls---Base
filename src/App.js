import React from 'react';
import { Container, VStack, Box, Heading, Text, useColorModeValue, ChakraProvider } from '@chakra-ui/react';
import { Web3Modal } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import Navbar from './components/Navbar';
import { Web3Button } from '@web3modal/react';
import { Card } from '@chakra-ui/react';

function App() {
  const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
  const bgGradient = useColorModeValue(
    'linear(to-r, blue.400, purple.500)',
    'linear(to-r, blue.200, purple.300)'
  );

  return (
    <ChakraProvider theme={theme}>
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
    </ChakraProvider>
  );
}

export default App; 