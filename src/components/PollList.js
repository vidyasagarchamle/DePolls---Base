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
  HStack,
  Select,
  IconButton,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Container,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Flex,
  Spacer,
  Tag,
  TagLeftIcon,
  TagLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Divider,
} from '@chakra-ui/react';
import { RepeatIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useContractRead, useAccount, useContractWrite, useWaitForTransaction, usePublicClient } from 'wagmi';
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
  const publicClient = usePublicClient();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.300');

  // Get poll count
  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    onError: (error) => {
      console.error('Error fetching poll count:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch poll count. Please try again.',
        status: 'error',
        duration: 5000,
      });
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
        args: [pollId]
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
        args: [pollId]
      });

      console.log(`Poll ${pollId} options:`, options);

      // Get voting status if user is connected
      let hasVoted = false;
      let isWhitelisted = false;
      
      if (address) {
        [hasVoted, isWhitelisted] = await Promise.all([
          publicClient.readContract({
            address: POLLS_CONTRACT_ADDRESS,
            abi: DePollsABI,
            functionName: 'hasVoted',
            args: [pollId, address]
          }),
          publicClient.readContract({
            address: POLLS_CONTRACT_ADDRESS,
            abi: DePollsABI,
            functionName: 'isWhitelisted',
            args: [pollId, address]
          })
        ]);
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

      // Fetch all polls in parallel
      const pollPromises = [];
      for (let i = count - 1; i >= 0; i--) {
        pollPromises.push(fetchPollDetails(i));
      }

      const results = await Promise.all(pollPromises);
      const validPolls = results.filter(poll => poll !== null);
      
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

  // Reset polls when address changes
  useEffect(() => {
    console.log('Address changed, resetting polls');
    setPolls([]);
  }, [address]);

  // Fetch polls when pollCount or address changes
  useEffect(() => {
    if (pollCount && publicClient) {
      console.log('Poll count or address changed:', { pollCount: pollCount.toString(), address });
      fetchPolls();
    }
  }, [pollCount, address, fetchPolls]);

  // Filter polls
  const filterPolls = useCallback((polls) => {
    const now = Date.now() / 1000; // Convert to seconds to match contract timestamp
    
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

            <Tag colorScheme="brand" borderRadius="full" size="md">
              <TagLabel>{filteredPolls.length} poll{filteredPolls.length !== 1 ? 's' : ''}</TagLabel>
            </Tag>

            <Spacer />

            <Tooltip label="Refresh Polls">
              <IconButton
                icon={<RepeatIcon />}
                onClick={handleRefresh}
                variant="ghost"
                colorScheme="brand"
                isLoading={isLoading}
                borderRadius="xl"
                size="md"
              />
            </Tooltip>
          </Flex>
        </CardHeader>

        <CardBody>
          {isLoading && polls.length === 0 ? (
            <Center py={10}>
              <VStack spacing={4}>
                <Spinner size="xl" color="brand.500" thickness="3px" speed="0.8s" />
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
                  onClose={handleRefresh}
                />
              ))}
            </VStack>
          ) : (
            <Alert
              status="info"
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              height="200px"
              bg={bgColor}
              borderRadius="2xl"
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                No Polls Found
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                {address ? "Create a new poll to get started!" : "Connect your wallet to view polls"}
              </AlertDescription>
            </Alert>
          )}
        </CardBody>
      </Card>
    </Container>
  );
};

export default PollList; 