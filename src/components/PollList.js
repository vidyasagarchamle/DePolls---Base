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
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.300');

  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    onSuccess: (data) => {
      console.log('Poll count data:', data);
    },
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

  const fetchPollDetails = async (pollId) => {
    if (!window.ethereum) return null;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        POLLS_CONTRACT_ADDRESS,
        DePollsABI,
        provider
      );

      console.log(`Fetching poll ${pollId}...`);

      const pollData = await contract.getPoll(pollId);
      console.log(`Poll ${pollId} data:`, pollData);

      if (!pollData || !pollData.creator) {
        console.log(`Poll ${pollId} does not exist`);
        return null;
      }

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
        options: pollData.options.map((opt) => ({
          text: opt.text,
          voteCount: opt.voteCount.toNumber(),
        })),
        hasVoted,
        isCreator,
        isWhitelisted,
      };
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      if (error.message.includes("revert")) {
        console.log("Contract revert error - poll might not exist");
        return null;
      }
      return null;
    }
  };

  const fetchPolls = async () => {
    if (!pollCount || !window.ethereum) {
      console.log('No poll count or ethereum:', { pollCount, ethereum: window.ethereum });
      return;
    }
    
    setIsLoading(true);
    try {
      const count = typeof pollCount === 'number' 
        ? pollCount 
        : pollCount.toString ? parseInt(pollCount.toString()) 
        : 0;

      console.log('Fetching polls with count:', count);

      if (count === 0) {
        setPolls([]);
        return;
      }

      const pollPromises = [];
      for (let i = count - 1; i >= 0; i--) {
        pollPromises.push(fetchPollDetails(i).catch(error => {
          console.error(`Failed to fetch poll ${i}:`, error);
          return null;
        }));
      }
      
      const pollResults = await Promise.all(pollPromises);
      const validPolls = pollResults.filter(poll => poll !== null);
      console.log('Fetched polls:', validPolls);
      
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
    if (pollCount && window.ethereum) {
      console.log('Poll count or address changed:', { pollCount, address });
      fetchPolls();
    }
  }, [pollCount, address]);

  const handleRefresh = () => {
    console.log('Refreshing polls...');
    refetchPollCount();
    fetchPolls();
  };

  const filterPolls = (polls) => {
    const now = Date.now();
    
    return polls.filter(poll => {
      if (poll.hasWhitelist && !poll.isWhitelisted) {
        return false;
      }

      switch (filter) {
        case 'active':
          return poll.deadline * 1000 > now && poll.isActive;
        case 'expired':
          return poll.deadline * 1000 <= now || !poll.isActive;
        case 'voted':
          return poll.hasVoted;
        default:
          return true;
      }
    });
  };

  const renderFilterBadge = () => {
    const count = filterPolls(polls).length;
    return (
      <Tag colorScheme="brand" borderRadius="full" size="md">
        <TagLabel>{count} poll{count !== 1 ? 's' : ''}</TagLabel>
      </Tag>
    );
  };

  if (!window.ethereum) {
    return (
      <Container maxW="container.lg" py={8}>
        <CreatePoll onPollCreated={handleRefresh} />
        <Alert
          status="warning"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          mt={6}
          bg={bgColor}
          borderRadius="2xl"
          boxShadow="sm"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Web3 Wallet Required
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            Please install a Web3 wallet like MetaMask to view and interact with polls
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (isConnecting) {
    return (
      <Container maxW="container.lg" py={8}>
        <CreatePoll onPollCreated={handleRefresh} />
        <Center py={10}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" thickness="3px" speed="0.8s" />
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
          borderRadius="2xl"
          boxShadow="sm"
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

            {renderFilterBadge()}

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
          {isLoading ? (
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