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
  Skeleton,
  HStack,
  Badge,
  useDisclosure,
} from '@chakra-ui/react';
import { useContractRead, useAccount, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
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

  const { data: pollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
  });

  const fetchPoll = async (id, provider, contract) => {
    try {
      const poll = await contract.getPoll(id);
      if (poll.isActive) {
        return {
          id: poll.id.toNumber(),
          creator: poll.creator,
          question: poll.question,
          options: poll.options.map(opt => ({
            text: opt.text,
            voteCount: opt.voteCount.toNumber()
          })),
          deadline: poll.deadline.toNumber(),
          isWeighted: poll.isWeighted,
          isMultipleChoice: poll.isMultipleChoice,
          isActive: poll.isActive
        };
      }
    } catch (error) {
      console.error(`Error fetching poll ${id}:`, error);
    }
    return null;
  };

  const fetchPolls = async () => {
    if (!pollCount || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(POLLS_CONTRACT_ADDRESS, DePollsABI, provider);
      
      const pollPromises = [];
      for (let i = 0; i < pollCount.toNumber(); i++) {
        pollPromises.push(fetchPoll(i, provider, contract));
      }

      const fetchedPolls = (await Promise.all(pollPromises)).filter(poll => poll !== null);
      console.log('Fetched polls:', fetchedPolls);
      setPolls(fetchedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to load polls. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && pollCount) {
      fetchPolls();
    }
  }, [address, pollCount]);

  const handlePollUpdate = () => {
    fetchPolls();
  };

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
        >
          <AlertIcon boxSize="40px" mb={4} />
          <Heading size="md" mb={2}>Connect Your Wallet</Heading>
          <Text>Please connect your wallet to view and participate in polls</Text>
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW={containerWidth} py={8}>
        <CreatePoll onPollCreated={handlePollUpdate} />
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Active Polls</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="300px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  const activePolls = polls.filter(poll => poll.isActive && new Date(Number(poll.deadline) * 1000) > new Date());

  return (
    <Container maxW={containerWidth} py={8}>
      <CreatePoll onPollCreated={handlePollUpdate} />
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <Heading size="lg">Active Polls</Heading>
          <Badge colorScheme="brand" p={2} borderRadius="lg" fontSize="md">
            Active Polls: {activePolls.length}
          </Badge>
        </HStack>

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
            <Text>Create a new poll to get started!</Text>
          </Alert>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {activePolls.map((poll) => (
              <Poll 
                key={poll.id} 
                poll={poll} 
                onVote={handlePollUpdate}
              />
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}

export default PollList; 