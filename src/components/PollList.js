import React, { useState, useEffect } from 'react';
import {
  VStack,
  Text,
  Spinner,
  useToast,
  Container,
  Alert,
  AlertIcon,
  Heading,
  SimpleGrid,
  HStack,
  Badge,
  Center,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { useContractRead, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import Poll from './Poll';
import CreatePoll from './CreatePoll';

function PollList() {
  const { address } = useAccount();
  const toast = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerWidth = { base: "95%", md: "90%", lg: "80%" };
  const tabBg = useColorModeValue('white', 'gray.800');

  // Get poll count from contract
  const { data: pollCount, isError: isPollCountError } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    cacheTime: 0, // Disable caching to always get fresh data
  });

  // Function to safely convert BigNumber to number
  const safeToNumber = (value) => {
    try {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (ethers.BigNumber.isBigNumber(value)) return value.toNumber();
      return Number(value);
    } catch (error) {
      console.error('Error converting value to number:', error);
      return 0;
    }
  };

  // Function to fetch a single poll
  const fetchPoll = async (id, contract) => {
    try {
      const poll = await contract.getPoll(id);
      const hasVoted = await contract.hasVoted(id, address);
      
      // Verify that we got valid poll data
      if (!poll || !poll.question) {
        console.warn(`Invalid poll data received for ID ${id}`);
        return null;
      }

      return {
        id: safeToNumber(poll.id),
        creator: poll.creator,
        question: poll.question,
        options: poll.options.map(opt => ({
          text: opt.text,
          voteCount: safeToNumber(opt.voteCount)
        })),
        deadline: safeToNumber(poll.deadline),
        isWeighted: poll.isWeighted,
        isMultipleChoice: poll.isMultipleChoice,
        isActive: poll.isActive,
        hasVoted: hasVoted,
        isCreator: poll.creator.toLowerCase() === address?.toLowerCase()
      };
    } catch (error) {
      console.error(`Error fetching poll ${id}:`, error);
      return null;
    }
  };

  // Function to fetch all polls
  const fetchPolls = async () => {
    if (!pollCount || !address || !window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(POLLS_CONTRACT_ADDRESS, DePollsABI, provider);
      
      const count = safeToNumber(pollCount);
      console.log('Total poll count:', count);

      // Fetch the latest poll first
      const latestPollId = count - 1;
      if (latestPollId >= 0) {
        const latestPoll = await fetchPoll(latestPollId, contract);
        if (latestPoll) {
          setPolls(prevPolls => {
            // Add the new poll if it doesn't exist
            const exists = prevPolls.some(p => p.id === latestPoll.id);
            if (!exists) {
              return [...prevPolls, latestPoll];
            }
            return prevPolls;
          });
        }
      }

      // Then fetch all other polls
      const pollPromises = [];
      for (let i = 0; i < count - 1; i++) {
        pollPromises.push(fetchPoll(i, contract));
      }

      const fetchedPolls = (await Promise.all(pollPromises))
        .filter(poll => poll !== null);

      setPolls(prevPolls => {
        // Merge new polls with existing ones, avoiding duplicates
        const newPolls = [...prevPolls];
        fetchedPolls.forEach(poll => {
          const exists = newPolls.some(p => p.id === poll.id);
          if (!exists) {
            newPolls.push(poll);
          }
        });
        return newPolls;
      });
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to load polls. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch polls when address or pollCount changes
  useEffect(() => {
    if (isPollCountError) {
      toast({
        title: 'Error',
        description: 'Failed to get poll count. Please check your connection.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
      return;
    }

    const fetchAndUpdate = async () => {
      await fetchPolls();
    };

    fetchAndUpdate();

    // Set up polling interval for updates
    const intervalId = setInterval(fetchAndUpdate, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [address, pollCount, isPollCountError]);

  // Handler for poll updates
  const handlePollUpdate = async () => {
    // Wait for a short delay to allow the blockchain to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    await fetchPolls();
  };

  // Render loading state
  if (loading) {
    return (
      <Container maxW={containerWidth} py={8}>
        <CreatePoll onPollCreated={handlePollUpdate} />
        <Center py={8}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
            <Text>Loading polls...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  // Render wallet connection prompt
  if (!address) {
    return (
      <Container maxW={containerWidth} py={8}>
        <CreatePoll onPollCreated={handlePollUpdate} />
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          borderRadius="xl"
          bg={useColorModeValue('white', 'gray.800')}
        >
          <AlertIcon boxSize="40px" mb={4} />
          <Heading size="md" mb={2} color={useColorModeValue('gray.800', 'white')}>Connect Your Wallet</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.300')}>Please connect your wallet to view and participate in polls</Text>
        </Alert>
      </Container>
    );
  }

  // Filter polls
  const activePolls = polls.filter(poll => {
    const deadline = new Date(poll.deadline * 1000);
    const now = new Date();
    return poll.isActive && deadline > now && !poll.isCreator;
  });

  const myPolls = polls.filter(poll => {
    return poll.isCreator;
  });

  const activeMyPolls = myPolls.filter(poll => poll.isActive);
  const closedMyPolls = myPolls.filter(poll => !poll.isActive);

  // Render main content
  return (
    <Container maxW={containerWidth} py={8}>
      <CreatePoll onPollCreated={handlePollUpdate} />
      <Tabs variant="enclosed" colorScheme="brand" mt={8}>
        <TabList bg={tabBg} borderRadius="xl" p={2}>
          <Tab _selected={{ bg: 'brand.500', color: 'white' }}>
            Active Polls ({activePolls.length})
          </Tab>
          <Tab _selected={{ bg: 'brand.500', color: 'white' }}>
            My Polls ({myPolls.length})
          </Tab>
        </TabList>

        <TabPanels>
          {/* Active Polls Panel */}
          <TabPanel p={0} pt={6}>
            <VStack spacing={8} align="stretch">
              {activePolls.length === 0 ? (
                <Alert
                  status="info"
                  variant="subtle"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  height="200px"
                  borderRadius="xl"
                >
                  <AlertIcon boxSize="40px" mb={4} />
                  <Heading size="md" mb={2}>No Active Polls</Heading>
                  <Text>There are no active polls to vote on at the moment.</Text>
                </Alert>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {activePolls.map((poll) => (
                    <Poll 
                      key={poll.id} 
                      poll={poll} 
                      onVote={handlePollUpdate}
                      showVoterDetails={false}
                    />
                  ))}
                </SimpleGrid>
              )}
            </VStack>
          </TabPanel>

          {/* My Polls Panel */}
          <TabPanel p={0} pt={6}>
            <VStack spacing={8} align="stretch">
              {myPolls.length === 0 ? (
                <Alert
                  status="info"
                  variant="subtle"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  height="200px"
                  borderRadius="xl"
                >
                  <AlertIcon boxSize="40px" mb={4} />
                  <Heading size="md" mb={2}>No Created Polls</Heading>
                  <Text>You haven't created any polls yet. Create one to get started!</Text>
                </Alert>
              ) : (
                <VStack spacing={8} align="stretch">
                  {/* Active Polls Section */}
                  {activeMyPolls.length > 0 && (
                    <>
                      <Heading size="md" color="gray.700">Active Polls</Heading>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        {activeMyPolls.map((poll) => (
                          <Poll 
                            key={poll.id} 
                            poll={poll} 
                            onVote={handlePollUpdate}
                            showVoterDetails={true}
                          />
                        ))}
                      </SimpleGrid>
                    </>
                  )}

                  {/* Closed Polls Section */}
                  {closedMyPolls.length > 0 && (
                    <>
                      <Divider my={4} />
                      <Heading size="md" color="gray.700">Closed Polls</Heading>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        {closedMyPolls.map((poll) => (
                          <Poll 
                            key={poll.id} 
                            poll={poll} 
                            onVote={handlePollUpdate}
                            showVoterDetails={true}
                          />
                        ))}
                      </SimpleGrid>
                    </>
                  )}
                </VStack>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}

export default PollList; 