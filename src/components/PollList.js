import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  Box,
  Text,
  Button,
  useToast,
  Spinner,
  Center,
  useColorModeValue,
  Container,
  Card,
  CardHeader,
  Heading,
  Alert,
  AlertIcon,
  Link,
} from '@chakra-ui/react';
import { RepeatIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useContractRead, useAccount, usePublicClient, useNetwork, useSwitchNetwork } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import Poll from './Poll';
import CreatePoll from './CreatePoll';

// Custom error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PollList Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <Box>
            <Text>Something went wrong loading the polls.</Text>
            <Button
              size="sm"
              colorScheme="red"
              mt={2}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onRetry) {
                  this.props.onRetry();
                }
              }}
            >
              Try Again
            </Button>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}

const PollList = () => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  // Check if we're on the right network (Base Sepolia)
  const isWrongNetwork = chain?.id !== 84532;

  // Get poll count with error handling
  const { data: pollCount, refetch: refetchPollCount, isError: isPollCountError, error: pollCountError } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    onSuccess: (data) => {
      try {
        console.log('Poll count fetched successfully:', {
          rawValue: data?.toString?.() || 'undefined',
          numberValue: data ? Number(data) : 0
        });
      } catch (error) {
        console.error('Error processing poll count:', error);
      }
    },
    onError: (error) => {
      console.error('Error fetching poll count:', {
        error,
        message: error?.message,
        contractAddress: POLLS_CONTRACT_ADDRESS
      });
    }
  });

  const fetchPollDetails = useCallback(async (pollId) => {
    if (!publicClient) return null;

    try {
      console.log(`Fetching poll ${pollId}...`);
      
      // Get poll data
      const pollData = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'getPollData',
        args: [BigInt(pollId)]
      });

      console.log(`Poll ${pollId} raw data:`, pollData);

      // Map array response to object
      const [question, creator, deadline, isMultipleChoice, isActive, hasWhitelist, optionCount] = pollData;

      if (!creator || creator === '0x0000000000000000000000000000000000000000') {
        console.log(`Poll ${pollId} is invalid or does not exist`);
        return null;
      }

      // Get options
      console.log(`Fetching options for poll ${pollId}...`);
      const optionsData = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'getPollOptions',
        args: [BigInt(pollId)]
      });

      console.log(`Poll ${pollId} options:`, optionsData);

      const options = optionsData.map(opt => ({
        text: opt.text,
        voteCount: Number(opt.voteCount)
      }));

      // Get voting status
      let hasVoted = false;
      let isWhitelisted = !hasWhitelist;

      if (address && isActive) {
        console.log(`Checking voting status for poll ${pollId}...`);
        hasVoted = await publicClient.readContract({
          address: POLLS_CONTRACT_ADDRESS,
          abi: DePollsABI,
          functionName: 'hasVoted',
          args: [BigInt(pollId), address]
        });

        if (hasWhitelist) {
          isWhitelisted = await publicClient.readContract({
            address: POLLS_CONTRACT_ADDRESS,
            abi: DePollsABI,
            functionName: 'isWhitelisted',
            args: [BigInt(pollId), address]
          });
        }
        console.log(`Poll ${pollId} voting status:`, { hasVoted, isWhitelisted });
      }

      const poll = {
        id: pollId,
        question,
        creator,
        deadline: Number(deadline),
        isMultipleChoice,
        isActive,
        hasWhitelist,
        options,
        hasVoted,
        isCreator: address && creator.toLowerCase() === address.toLowerCase(),
        isWhitelisted,
        totalVotes: options.reduce((acc, opt) => acc + Number(opt.voteCount), 0)
      };

      console.log(`Poll ${pollId} processed:`, poll);
      return poll;
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      return null;
    }
  }, [publicClient, address]);

  const fetchPolls = useCallback(async () => {
    if (!pollCount || !publicClient) {
      console.log('Cannot fetch polls:', { pollCount: pollCount?.toString(), hasPublicClient: !!publicClient });
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const count = Number(pollCount);
      console.log('Starting poll fetch with count:', count);

      if (count === 0) {
        console.log('No polls found (count is 0)');
        setPolls([]);
        setError('No polls found. Be the first to create one!');
        return;
      }

      const validPolls = [];
      const promises = [];

      // Fetch the last 10 polls
      const startIndex = count - 1;
      const endIndex = Math.max(0, count - 10);
      console.log(`Fetching polls from index ${startIndex} to ${endIndex}`);

      for (let i = startIndex; i >= endIndex; i--) {
        promises.push(
          fetchPollDetails(i)
            .then(poll => {
              if (poll && poll.question && poll.options.length > 0) {
                console.log(`Successfully fetched valid poll ${i}:`, poll);
                validPolls.push(poll);
              } else {
                console.log(`Skipping invalid poll ${i}`);
              }
            })
            .catch(error => {
              console.error(`Error processing poll ${i}:`, error);
            })
        );
      }

      await Promise.all(promises);
      validPolls.sort((a, b) => b.id - a.id);
      
      console.log(`Found ${validPolls.length} valid polls out of ${count} total polls:`, validPolls);
      setPolls(validPolls);

      if (validPolls.length === 0) {
        setError('No active polls found. Create one to get started!');
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError('Failed to load polls. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [pollCount, publicClient, fetchPollDetails]);

  // Add debug logging for dependencies
  useEffect(() => {
    console.log('Dependencies changed:', {
      isWrongNetwork,
      hasPollCount: !!pollCount,
      pollCountValue: pollCount?.toString(),
      hasPublicClient: !!publicClient,
      currentAddress: address
    });
  }, [isWrongNetwork, pollCount, publicClient, address]);

  useEffect(() => {
    if (isWrongNetwork) {
      setError('Please switch to Base Sepolia network to view polls.');
    } else if (pollCount && publicClient) {
      console.log('Triggering poll fetch...');
      fetchPolls();
    }
  }, [isWrongNetwork, pollCount, publicClient, fetchPolls]);

  const handleRefresh = useCallback(() => {
    setError(null);
    refetchPollCount();
  }, [refetchPollCount]);

  const handleSwitchNetwork = () => {
    if (switchNetwork) {
      switchNetwork(84532);
    } else {
      window.open('https://docs.base.org/guides/deploy-smart-contracts', '_blank');
    }
  };

  if (isWrongNetwork) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <Box>
            <Text>Please switch to Base Sepolia network to view polls.</Text>
            <Button
              size="sm"
              colorScheme="blue"
              mt={2}
              onClick={handleSwitchNetwork}
              rightIcon={switchNetwork ? undefined : <ExternalLinkIcon />}
            >
              {switchNetwork ? 'Switch Network' : 'Learn How to Add Network'}
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <ErrorBoundary onRetry={handleRefresh}>
      <Container maxW="container.lg" py={8}>
        <CreatePoll onPollCreated={handleRefresh} />
        
        <Card
          mt={8}
          bg={bgColor}
          borderRadius="2xl"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
        >
          <CardHeader pb={0}>
            <Heading size="md">Polls</Heading>
            <Button
              leftIcon={<RepeatIcon />}
              onClick={handleRefresh}
              isLoading={isLoading}
              variant="ghost"
              size="sm"
            >
              Refresh
            </Button>
          </CardHeader>

          <Box p={6}>
            {error ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Text>{error}</Text>
              </Alert>
            ) : isLoading ? (
              <Center py={8}>
                <Spinner size="xl" color="brand.500" thickness="4px" />
              </Center>
            ) : polls.length > 0 ? (
              <VStack spacing={4} align="stretch">
                {polls.map((poll) => (
                  <Poll key={poll.id} poll={poll} onVote={handleRefresh} onClose={handleRefresh} />
                ))}
              </VStack>
            ) : null}
          </Box>
        </Card>
      </Container>
    </ErrorBoundary>
  );
};

export default PollList; 