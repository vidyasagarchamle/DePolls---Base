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
      const userCreated = polls.filter(poll => poll.creator.toLowerCase() === address.toLowerCase());
      const active = polls.filter(poll => poll.isActive && poll.creator.toLowerCase() !== address.toLowerCase());
      
      setUserPolls(userCreated);
      setActivePolls(active);
    } else {
      setUserPolls([]);
      setActivePolls([]);
    }
  }, [polls, address]);

  const handleRefresh = useCallback(() => {
    setError(null);
    refetchPollCount();
  }, [refetchPollCount]);

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
            <Flex justify="space-between" align="center">
              <Heading size="md">Polls</Heading>
              {polls.length > 0 && (
                <Button
                  leftIcon={<RepeatIcon />}
                  variant="ghost"
                  onClick={handleRefresh}
                  isLoading={isLoading}
                >
                  Refresh
                </Button>
              )}
            </Flex>
          </CardHeader>

          <CardBody>
            {isLoading ? (
              <Center py={8}>
                <Spinner size="xl" color="brand.500" thickness="4px" />
              </Center>
            ) : polls.length === 0 ? (
              <EmptyState
                message="No polls found. Create your first poll!"
                actionLabel="Create Poll"
                onAction={() => document.getElementById('create-poll-button')?.click()}
              />
            ) : (
              <Tabs variant="soft-rounded" colorScheme="brand">
                <TabList
                  bg={tabBg}
                  p={2}
                  borderRadius="xl"
                  overflowX="auto"
                  css={{
                    scrollbarWidth: 'none',
                    '::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  <Tab
                    _selected={{ bg: activeBg }}
                    borderRadius="lg"
                    px={4}
                    py={2}
                  >
                    All Polls
                    <Badge ml={2} colorScheme="brand">
                      {polls.length}
                    </Badge>
                  </Tab>
                  {address && (
                    <>
                      <Tab
                        _selected={{ bg: activeBg }}
                        borderRadius="lg"
                        px={4}
                        py={2}
                      >
                        Active Polls
                        <Badge ml={2} colorScheme="green">
                          {activePolls.length}
                        </Badge>
                      </Tab>
                      <Tab
                        _selected={{ bg: activeBg }}
                        borderRadius="lg"
                        px={4}
                        py={2}
                      >
                        My Polls
                        <Badge ml={2} colorScheme="purple">
                          {userPolls.length}
                        </Badge>
                      </Tab>
                    </>
                  )}
                </TabList>

                <TabPanels>
                  <TabPanel px={0}>
                    <VStack spacing={4} align="stretch">
                      {polls.map(poll => (
                        <Poll
                          key={poll.id}
                          poll={poll}
                          onVote={handleRefresh}
                          onClose={handleRefresh}
                        />
                      ))}
                    </VStack>
                  </TabPanel>
                  {address && (
                    <>
                      <TabPanel px={0}>
                        <VStack spacing={4} align="stretch">
                          {activePolls.length > 0 ? (
                            activePolls.map(poll => (
                              <Poll
                                key={poll.id}
                                poll={poll}
                                onVote={handleRefresh}
                                onClose={handleRefresh}
                              />
                            ))
                          ) : (
                            <EmptyState message="No active polls found" />
                          )}
                        </VStack>
                      </TabPanel>
                      <TabPanel px={0}>
                        <VStack spacing={4} align="stretch">
                          {userPolls.length > 0 ? (
                            userPolls.map(poll => (
                              <Poll
                                key={poll.id}
                                poll={poll}
                                onVote={handleRefresh}
                                onClose={handleRefresh}
                              />
                            ))
                          ) : (
                            <EmptyState
                              message="You haven't created any polls yet"
                              actionLabel="Create Your First Poll"
                              onAction={() => document.getElementById('create-poll-button')?.click()}
                            />
                          )}
                        </VStack>
                      </TabPanel>
                    </>
                  )}
                </TabPanels>
              </Tabs>
            )}
          </CardBody>
        </Card>
      </Container>
    </ErrorBoundary>
  );
};

export default PollList; 