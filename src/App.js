import React from 'react';
import { Container, VStack, Box, Heading, Text, useColorModeValue, Button, HStack, Icon } from '@chakra-ui/react';
import { Web3Modal } from '@web3modal/react';
import { PollList } from './components';
import { ethereumClient } from './config/wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useAccount } from 'wagmi';
import Navbar from './components/Navbar';
import { CheckIcon, TimeIcon, LockIcon, UnlockIcon } from '@chakra-ui/icons';

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
            <Box 
              textAlign="center" 
              py={16} 
              px={8}
              borderRadius="2xl"
              position="relative"
              overflow="hidden"
              _before={{
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bg: useColorModeValue(
                  'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.9) 100%)',
                  'linear-gradient(135deg, rgba(26,32,44,0.8) 0%, rgba(26,32,44,0.9) 100%)'
                ),
                backdropFilter: 'blur(10px)',
                zIndex: 1,
              }}
              _after={{
                content: '""',
                position: "absolute",
                top: "-50%",
                left: "-50%",
                right: "-50%",
                bottom: "-50%",
                background: useColorModeValue(
                  'radial-gradient(circle, rgba(147,197,253,0.3) 0%, rgba(196,181,253,0.3) 50%, rgba(255,255,255,0) 70%)',
                  'radial-gradient(circle, rgba(49,130,206,0.2) 0%, rgba(126,87,194,0.2) 50%, rgba(26,32,44,0) 70%)'
                ),
                transform: 'rotate(-45deg)',
                zIndex: 0,
              }}
            >
              <Box position="relative" zIndex={2}>
                <Heading
                  fontSize={{ base: "4xl", md: "6xl" }}
                  fontWeight="bold"
                  mb={6}
                  letterSpacing="tight"
                  lineHeight="1.2"
                >
                  Welcome to{" "}
                  <Text 
                    as="span" 
                    position="relative"
                    bgGradient={bgGradient}
                    bgClip="text"
                  >
                    DePolls
                  </Text>
                </Heading>
                <Text
                  fontSize={{ base: "lg", md: "xl" }}
                  color={useColorModeValue('gray.600', 'gray.300')}
                  maxW="2xl"
                  mx="auto"
                  lineHeight="tall"
                >
                  A modern, decentralized polling platform built on{" "}
                  <Text 
                    as="span" 
                    color={useColorModeValue('blue.500', 'blue.300')}
                    fontWeight="semibold"
                  >
                    Base
                  </Text>
                  , featuring secure voting, real-time updates, and a seamless user experience.
                </Text>
                {!isConnected && (
                  <Box mt={8}>
                    <Button
                      as="a"
                      href="#connect"
                      size="lg"
                      colorScheme="brand"
                      px={8}
                      fontSize="md"
                      fontWeight="semibold"
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                      transition="all 0.2s"
                    >
                      Connect Wallet to Start
                    </Button>
                  </Box>
                )}
                <HStack 
                  spacing={6} 
                  justify="center" 
                  mt={8}
                  color={useColorModeValue('gray.600', 'gray.400')}
                  fontSize="sm"
                >
                  <HStack>
                    <Icon as={CheckIcon} color="green.500" />
                    <Text>Secure Voting</Text>
                  </HStack>
                  <HStack>
                    <Icon as={TimeIcon} color="blue.500" />
                    <Text>Real-time Updates</Text>
                  </HStack>
                  <HStack>
                    <Icon as={LockIcon} color="purple.500" />
                    <Text>Whitelist Support</Text>
                  </HStack>
                </HStack>
              </Box>
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
                boxShadow="xl"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: '2xl',
                  borderColor: 'brand.500',
                }}
                transition="all 0.2s"
              >
                <VStack spacing={4}>
                  <Icon 
                    as={UnlockIcon} 
                    boxSize={12} 
                    color={useColorModeValue('brand.500', 'brand.300')} 
                  />
                  <Text fontSize="lg" color={textColor}>
                    Connect your wallet to create and participate in polls
                  </Text>
                </VStack>
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