import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Text,
  Button,
  useToast,
  Spinner,
  Center,
  useColorModeValue,
  HStack,
  Select,
  IconButton,
  Tooltip,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Container,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useContractRead, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import Poll from './Poll';
import CreatePoll from './CreatePoll';

const PollList = () => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const toast = useToast();
  const { address, isConnecting } = useAccount();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPollCount',
    watch: true,
  });

  const fetchPollDetails = async (pollId) => {
    try {
      const contract = new ethers.Contract(
        POLLS_CONTRACT_ADDRESS,
        DePollsABI,
        new ethers.providers.Web3Provider(window.ethereum)
      );

      const pollData = await contract.polls(pollId);
      const options = await contract.getPollOptions(pollId);
      const hasVoted = address ? await contract.hasVoted(pollId, address) : false;
      const isCreator = address && pollData.creator.toLowerCase() === address.toLowerCase();
      const isWhitelisted = address ? await contract.isWhitelisted(pollId, address) : false;

      return {
        id: pollId,
        question: pollData.question,
        creator: pollData.creator,
        deadline: pollData.deadline.toNumber(),
        isMultipleChoice: pollData.isMultipleChoice,
        isActive: pollData.isActive,
        hasWhitelist: pollData.hasWhitelist,
        rewardToken: pollData.rewardToken,
        rewardAmount: pollData.rewardAmount,
        options: options.map((opt) => ({
          text: opt.text,
          voteCount: opt.voteCount.toNumber(),
        })),
        hasVoted,
        isCreator,
        isWhitelisted,
      };
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      return null;
    }
  };

  const fetchPolls = async () => {
    if (!pollCount || !address) return;
    
    setIsLoading(true);
    try {
      const pollPromises = [];
      for (let i = pollCount.toNumber() - 1; i >= 0; i--) {
        pollPromises.push(fetchPollDetails(i));
      }
      
      const pollResults = await Promise.all(pollPromises);
      const validPolls = pollResults.filter(poll => poll !== null);
      
      setPolls(validPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to load polls. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (address && pollCount) {
      fetchPolls();
    } else if (!address) {
      setIsLoading(false);
      setPolls([]);
    }
  }, [pollCount, address]);

  const handleRefresh = () => {
    refetchPollCount();
    fetchPolls();
  };

  const filterPolls = (polls) => {
    const now = Date.now();
    
    return polls.filter(poll => {
      switch (filter) {
        case 'active':
          return poll.deadline * 1000 > now && poll.isActive;
        case 'expired':
          return poll.deadline * 1000 <= now || !poll.isActive;
        case 'voted':
          return poll.hasVoted;
        case 'rewards':
          return poll.rewardToken !== ethers.constants.AddressZero;
        case 'whitelist':
          return poll.hasWhitelist;
        default:
          return true;
      }
    });
  };

  const renderFilterBadge = () => {
    const count = filterPolls(polls).length;
    return (
      <Badge
        colorScheme="brand"
        variant="subtle"
        fontSize="sm"
        ml={2}
      >
        {count} {count === 1 ? 'poll' : 'polls'}
      </Badge>
    );
  };

  if (isConnecting) {
    return (
      <Container maxW="container.lg" py={8}>
        <CreatePoll onPollCreated={handleRefresh} />
        <Center py={10}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text color={textColor}>Connecting wallet...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (!address) {
    return (
      <Container maxW="container.lg" py={8}>
        <CreatePoll onPollCreated={handleRefresh} />
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          mt={6}
          bg={bgColor}
          borderRadius="xl"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Connect Your Wallet
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            Please connect your wallet to view and interact with polls
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  const filteredPolls = filterPolls(polls);

  return (
    <Container maxW="container.lg" py={8}>
      <CreatePoll onPollCreated={handleRefresh} />
      
      <HStack spacing={4} mb={6} mt={6} justify="space-between">
        <HStack spacing={4}>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            bg={bgColor}
            color={textColor}
            borderColor={borderColor}
            _hover={{ borderColor: 'brand.500' }}
            w="200px"
          >
            <option value="all">All Polls</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="voted">Voted</option>
            <option value="rewards">With Rewards</option>
            <option value="whitelist">Whitelisted</option>
          </Select>
          {renderFilterBadge()}
        </HStack>
        <Tooltip label="Refresh Polls">
          <IconButton
            icon={<RepeatIcon />}
            onClick={handleRefresh}
            variant="ghost"
            colorScheme="brand"
            isLoading={isLoading}
          />
        </Tooltip>
      </HStack>

      {isLoading ? (
        <Center py={10}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text color={textColor}>Loading polls...</Text>
          </VStack>
        </Center>
      ) : filteredPolls.length > 0 ? (
        <VStack spacing={6} align="stretch">
          {filteredPolls.map((poll) => (
            <Poll
              key={poll.id}
              poll={poll}
              onVote={handleRefresh}
            />
          ))}
        </VStack>
      ) : (
        <Center py={10}>
          <VStack spacing={4}>
            <Text color={mutedColor} fontSize="lg" textAlign="center">
              {filter === 'all'
                ? 'No polls found. Create one to get started!'
                : `No ${filter} polls found.`}
            </Text>
          </VStack>
        </Center>
      )}
    </Container>
  );
};

export default PollList; 