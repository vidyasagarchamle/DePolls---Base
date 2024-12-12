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
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useContractRead, useAccount, usePublicClient } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import Poll from './Poll';
import CreatePoll from './CreatePoll';

const PollList = () => {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  // Get poll count
  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    onError: (error) => {
      console.error('Error fetching poll count:', error);
    },
  });

  const fetchPollDetails = useCallback(async (pollId) => {
    if (!publicClient) return null;

    try {
      console.log(`Fetching poll ${pollId}...`);
      
      // Get poll data using contract calls
      const pollData = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'polls',
        args: [BigInt(pollId)]
      });

      console.log(`Poll ${pollId} data:`, pollData);

      if (!pollData || !pollData.creator || pollData.creator === '0x0000000000000000000000000000000000000000') {
        console.log(`Invalid poll data for ID ${pollId}`);
        return null;
      }

      // Get options
      const options = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'getPollOptions',
        args: [BigInt(pollId)]
      });

      console.log(`Poll ${pollId} options:`, options);

      // Get voting status if user is connected
      let hasVoted = false;
      let isWhitelisted = false;
      
      if (address) {
        try {
          [hasVoted, isWhitelisted] = await Promise.all([
            publicClient.readContract({
              address: POLLS_CONTRACT_ADDRESS,
              abi: DePollsABI,
              functionName: 'hasVoted',
              args: [BigInt(pollId), address]
            }),
            publicClient.readContract({
              address: POLLS_CONTRACT_ADDRESS,
              abi: DePollsABI,
              functionName: 'isWhitelisted',
              args: [BigInt(pollId), address]
            })
          ]);
        } catch (error) {
          console.warn(`Error fetching vote status for poll ${pollId}:`, error);
        }
      }

      const isCreator = address && pollData.creator.toLowerCase() === address.toLowerCase();

      const poll = {
        id: pollId,
        question: pollData.question,
        creator: pollData.creator,
        deadline: Number(pollData.deadline),
        isMultipleChoice: pollData.isMultipleChoice,
        isActive: pollData.isActive,
        hasWhitelist: pollData.hasWhitelist,
        options: options.map((opt) => ({
          text: opt.text,
          voteCount: Number(opt.voteCount)
        })),
        hasVoted,
        isCreator,
        isWhitelisted,
        totalVotes: options.reduce((acc, opt) => acc + Number(opt.voteCount), 0)
      };

      console.log(`Processed poll ${pollId}:`, poll);
      return poll;
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      return null;
    }
  }, [publicClient, address]);

  const fetchPolls = useCallback(async () => {
    if (!pollCount || !publicClient) {
      console.log('No poll count or provider:', { pollCount, publicClient });
      return;
    }
    
    setIsLoading(true);
    setPolls([]); // Clear existing polls before fetching
    
    try {
      const count = Number(pollCount);
      console.log('Fetching polls with count:', count);

      if (count === 0) {
        setPolls([]);
        return;
      }

      // Fetch polls sequentially to avoid rate limiting
      const validPolls = [];
      for (let i = count - 1; i >= 0; i--) {
        try {
          const poll = await fetchPollDetails(i);
          if (poll) {
            validPolls.push(poll);
          }
        } catch (error) {
          console.error(`Error fetching poll ${i}:`, error);
        }
      }
      
      console.log('All fetched polls:', validPolls);
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
  }, [pollCount, publicClient, fetchPollDetails, toast]);

  // Fetch polls when pollCount or address changes
  useEffect(() => {
    if (pollCount && publicClient) {
      console.log('Poll count or address changed:', { pollCount: pollCount.toString(), address });
      fetchPolls();
    }
  }, [pollCount, address, fetchPolls]);

  // Filter polls
  const filterPolls = useCallback((polls) => {
    const now = Math.floor(Date.now() / 1000);
    
    return polls.filter(poll => {
      if (poll.hasWhitelist && !poll.isWhitelisted && !poll.isCreator) {
        return false;
      }

      switch (filter) {
        case 'active':
          return poll.deadline > now && poll.isActive;
        case 'expired':
          return poll.deadline <= now || !poll.isActive;
        case 'voted':
          return poll.hasVoted;
        default:
          return true;
      }
    });
  }, [filter]);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing polls...');
    setPolls([]);
    refetchPollCount();
  }, [refetchPollCount]);

  const filteredPolls = filterPolls(polls);

  return (
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
          <Flex align="center" wrap="wrap" gap={4}>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="outline"
                borderRadius="xl"
                borderColor={borderColor}
                _hover={{ borderColor: accentColor }}
                size="md"
              >
                {filter === 'all' ? 'All Polls' :
                 filter === 'active' ? 'Active Polls' :
                 filter === 'expired' ? 'Expired Polls' :
                 'Voted Polls'}
              </MenuButton>
              <MenuList borderRadius="xl" shadow="lg">
                <MenuItem onClick={() => setFilter('all')}>All Polls</MenuItem>
                <MenuItem onClick={() => setFilter('active')}>Active Polls</MenuItem>
                <MenuItem onClick={() => setFilter('expired')}>Expired Polls</MenuItem>
                <MenuItem onClick={() => setFilter('voted')}>Voted Polls</MenuItem>
              </MenuList>
            </Menu>

            <IconButton
              icon={<RepeatIcon />}
              onClick={handleRefresh}
              variant="ghost"
              borderRadius="xl"
              isLoading={isLoading}
              aria-label="Refresh polls"
            />
          </Flex>
        </CardHeader>

        <Box p={6}>
          {isLoading ? (
            <Center py={8}>
              <Spinner size="xl" color="brand.500" thickness="4px" />
            </Center>
          ) : filteredPolls.length > 0 ? (
            <VStack spacing={4} align="stretch">
              {filteredPolls.map((poll) => (
                <Poll key={poll.id} poll={poll} onVote={handleRefresh} onClose={handleRefresh} />
              ))}
            </VStack>
          ) : (
            <Center py={8}>
              <Text>No polls found</Text>
            </Center>
          )}
        </Box>
      </Card>
    </Container>
  );
};

export default PollList; 