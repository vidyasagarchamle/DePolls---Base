import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  VStack,
  Heading,
  Button,
  Spinner,
  Center,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Text,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useColorModeValue,
  Box,
  HStack,
} from '@chakra-ui/react';
import { AddIcon, RepeatIcon } from '@chakra-ui/icons';
import { useAccount, useContractRead, usePublicClient } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import Poll from './Poll';
import CreatePoll from './CreatePoll';
import ErrorBoundary from './ErrorBoundary';

const PollList = () => {
  const { address } = useAccount();
  const [polls, setPolls] = useState([]);
  const [userPolls, setUserPolls] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const publicClient = usePublicClient();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const tabBg = useColorModeValue('gray.50', 'gray.700');
  const activeBg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
    onError: (error) => {
      console.error('Error fetching poll count:', error);
      setError('Failed to connect to the network. Please check your connection and try again.');
      setIsLoading(false);
    }
  });

  const fetchPollDetails = useCallback(async (pollId) => {
    if (!publicClient) return null;

    try {
      const pollData = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'getPollData',
        args: [BigInt(pollId)]
      });

      const [question, creator, deadline, isMultipleChoice, isActive, hasWhitelist, optionCount] = pollData;

      if (!creator || creator === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      const optionsData = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'getPollOptions',
        args: [BigInt(pollId)]
      });

      const options = optionsData.map(opt => ({
        text: opt.text,
        voteCount: Number(opt.voteCount)
      }));

      let hasVoted = false;
      let isWhitelisted = !hasWhitelist;

      if (address) {
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
      }

      return {
        id: pollId,
        question,
        creator,
        deadline: Number(deadline),
        isMultipleChoice,
        isActive,
        hasWhitelist,
        options,
        hasVoted,
        isWhitelisted,
        totalVotes: options.reduce((acc, opt) => acc + Number(opt.voteCount), 0)
      };
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      return null;
    }
  }, [publicClient, address]);

  const fetchPolls = useCallback(async () => {
    if (!pollCount || !publicClient) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const count = Number(pollCount);
      if (count === 0) {
        setPolls([]);
        setIsLoading(false);
        return;
      }

      const validPolls = [];
      const promises = [];

      for (let i = count - 1; i >= Math.max(0, count - 10); i--) {
        promises.push(
          fetchPollDetails(i)
            .then(poll => {
              if (poll && poll.question && poll.options.length > 0) {
                validPolls.push(poll);
              }
            })
            .catch(error => {
              console.error(`Error processing poll ${i}:`, error);
            })
        );
      }

      await Promise.all(promises);
      validPolls.sort((a, b) => b.id - a.id);
      setPolls(validPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError('Failed to load polls. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load polls. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [pollCount, publicClient, fetchPollDetails, toast]);

  useEffect(() => {
    if (publicClient) {
      fetchPolls();
    }
  }, [pollCount, publicClient, fetchPolls]);

  useEffect(() => {
    if (polls.length > 0 && address) {
      console.log('Filtering polls for address:', address);
      console.log('Available polls:', polls);
      
      const userCreated = polls.filter(poll => {
        const isCreator = poll.creator?.toLowerCase() === address?.toLowerCase();
        console.log('Poll creator check:', {
          pollCreator: poll.creator,
          userAddress: address,
          isCreator
        });
        return isCreator;
      });
      
      const active = polls.filter(poll => {
        const isActive = poll.isActive && 
          poll.creator?.toLowerCase() !== address?.toLowerCase() &&
          poll.deadline * 1000 > Date.now();
        return isActive;
      });
      
      console.log('Filtered polls:', { userCreated, active });
      setUserPolls(userCreated);
      setActivePolls(active);
    } else {
      setUserPolls([]);
      setActivePolls([]);
    }
  }, [polls, address]);

  const handleRefresh = useCallback(async () => {
    console.log('Refreshing polls...');
    setError(null);
    setIsLoading(true);
    try {
      await refetchPollCount();
      await fetchPolls();
      console.log('Polls refreshed successfully');
    } catch (error) {
      console.error('Error refreshing polls:', error);
      setError('Failed to refresh polls. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [refetchPollCount, fetchPolls]);

  const onPollCreated = useCallback(() => {
    console.log('Poll created, refreshing...');
    handleRefresh();
  }, [handleRefresh]);

  const EmptyState = ({ message, actionLabel, onAction }) => (
    <Center py={12} px={6}>
      <VStack spacing={4} textAlign="center">
        <Icon as={AddIcon} w={12} h={12} color="gray.400" />
        <VStack spacing={2}>
          <Text color={mutedColor} fontSize="lg" fontWeight="medium">
            {message}
          </Text>
        </VStack>
        {actionLabel && (
          <Button
            colorScheme="brand"
            size="lg"
            leftIcon={<AddIcon />}
            onClick={onAction}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s"
          >
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Center>
  );

  const renderPolls = (pollsToRender, emptyMessage) => {
    if (isLoading) {
      return (
        <Center py={8}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      );
    }

    if (!pollsToRender || pollsToRender.length === 0) {
      return (
        <EmptyState 
          message={emptyMessage} 
          actionLabel={emptyMessage.includes('created') ? "Create Your First Poll" : null}
          onAction={() => document.getElementById('createPollSection')?.scrollIntoView({ behavior: 'smooth' })}
        />
      );
    }

    return (
      <VStack spacing={4} align="stretch" width="100%">
        {pollsToRender.map((poll) => (
          <ErrorBoundary key={poll.id}>
            <Poll 
              poll={poll} 
              onVoteSuccess={handleRefresh}
              onCloseSuccess={handleRefresh}
            />
          </ErrorBoundary>
        ))}
      </VStack>
    );
  };

  if (error) {
    return (
      <Container maxW="container.lg" py={8}>
        <Card bg={bgColor} borderRadius="xl" p={8}>
          <Center>
            <VStack spacing={4}>
              <Text color="red.500" fontSize="lg">{error}</Text>
              <Button
                colorScheme="brand"
                onClick={handleRefresh}
                leftIcon={<RepeatIcon />}
              >
                Try Again
              </Button>
            </VStack>
          </Center>
        </Card>
      </Container>
    );
  }

  return (
    <ErrorBoundary onRetry={handleRefresh}>
      <Container maxW="container.lg" py={8}>
        <VStack spacing={8} align="stretch">
          <ErrorBoundary>
            <CreatePoll onPollCreated={onPollCreated} />
          </ErrorBoundary>

          <Card bg={bgColor} borderRadius="xl" overflow="hidden" boxShadow="sm">
            <CardBody p={0}>
              <Tabs variant="line" colorScheme="brand" isLazy>
                <Box borderBottomWidth="1px" borderColor={borderColor}>
                  <Container maxW="container.lg">
                    <TabList 
                      border="none" 
                      gap={8} 
                      px={6} 
                      pt={4}
                    >
                      <Tab
                        fontSize="lg"
                        fontWeight="semibold"
                        color={mutedColor}
                        _selected={{
                          color: 'brand.500',
                          borderColor: 'brand.500',
                          borderBottomWidth: '3px'
                        }}
                        _hover={{
                          color: 'brand.400',
                          borderColor: 'brand.400'
                        }}
                      >
                        Active Polls
                        {activePolls.length > 0 && (
                          <Badge
                            ml={2}
                            colorScheme="brand"
                            borderRadius="full"
                            px={2}
                          >
                            {activePolls.length}
                          </Badge>
                        )}
                      </Tab>
                      {address && (
                        <Tab
                          fontSize="lg"
                          fontWeight="semibold"
                          color={mutedColor}
                          _selected={{
                            color: 'brand.500',
                            borderColor: 'brand.500',
                            borderBottomWidth: '3px'
                          }}
                          _hover={{
                            color: 'brand.400',
                            borderColor: 'brand.400'
                          }}
                        >
                          My Polls
                          {userPolls.length > 0 && (
                            <Badge
                              ml={2}
                              colorScheme="brand"
                              borderRadius="full"
                              px={2}
                            >
                              {userPolls.length}
                            </Badge>
                          )}
                        </Tab>
                      )}
                    </TabList>
                  </Container>
                </Box>

                <Box py={6}>
                  <Container maxW="container.lg">
                    <TabPanels>
                      <TabPanel p={0}>
                        {isLoading ? (
                          <Center py={8}>
                            <Spinner size="xl" color="brand.500" thickness="4px" />
                          </Center>
                        ) : (
                          renderPolls(activePolls, "No active polls found")
                        )}
                      </TabPanel>
                      {address && (
                        <TabPanel p={0}>
                          {isLoading ? (
                            <Center py={8}>
                              <Spinner size="xl" color="brand.500" thickness="4px" />
                            </Center>
                          ) : (
                            renderPolls(userPolls, "You haven't created any polls yet")
                          )}
                        </TabPanel>
                      )}
                    </TabPanels>
                  </Container>
                </Box>
              </Tabs>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </ErrorBoundary>
  );
};

export default PollList; 