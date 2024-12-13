import React from 'react';
import { Container, VStack, Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { Web3Modal } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useAccount } from 'wagmi';
import Navbar from './components/Navbar';

function App() {
  const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
  const { isConnected } = useAccount();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const bgGradient = useColorModeValue(
    'linear(to-r, blue.400, purple.500)',
    'linear(to-r, blue.200, purple.300)'
  );

  return (
    <>
      <Box minH="100vh" bg={bgColor}>
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
                A modern, decentralized polling platform built on Base, featuring secure voting, 
                real-time updates, and a seamless user experience.
              </Text>
            </Box>
            
            {isConnected ? (
              <PollList />
            ) : (
              <Box
                p={8}
                textAlign="center"
                bg={useColorModeValue('white', 'gray.800')}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={useColorModeValue('gray.200', 'gray.700')}
              >
                <Text fontSize="lg" color={textColor}>
                  Connect your wallet to create and participate in polls
                </Text>
              </Box>
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