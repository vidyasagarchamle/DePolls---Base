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
import { AddIcon, RepeatIcon, UserIcon } from '@chakra-ui/icons';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const publicClient = usePublicClient();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const tabBg = useColorModeValue('gray.50', 'gray.700');
  const activeBg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const badgeBg = useColorModeValue('brand.100', 'brand.900');
  const badgeColor = useColorModeValue('brand.800', 'brand.100');

  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
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

      if (address && isActive) {
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
        isCreator: address && creator.toLowerCase() === address.toLowerCase(),
        isWhitelisted,
        totalVotes: options.reduce((acc, opt) => acc + Number(opt.voteCount), 0)
      };
    } catch (error) {
      console.error(`Error fetching poll ${pollId}:`, error);
      return null;
    }
  }, [publicClient, address]);

  const fetchPolls = useCallback(async () => {
    if (!pollCount || !publicClient) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const count = Number(pollCount);
      if (count === 0) {
        setPolls([]);
        return;
      }

      const validPolls = [];
      const promises = [];

      const startIndex = count - 1;
      const endIndex = Math.max(0, count - 10);

      for (let i = startIndex; i >= endIndex; i--) {
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
    if (pollCount && publicClient) {
      fetchPolls();
    }
  }, [pollCount, publicClient, fetchPolls]);

  useEffect(() => {
    if (polls.length > 0 && address) {
      const userCreated = polls.filter(poll => poll.creator.toLowerCase() === address.toLowerCase());
      const active = polls.filter(poll => !poll.closed && poll.creator.toLowerCase() !== address.toLowerCase());
      
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
                  onClick={handleRefresh}
                  isLoading={isLoading}
                  variant="ghost"
                  size="sm"
                  color={mutedColor}
                  _hover={{
                    bg: tabBg,
                    transform: 'rotate(180deg)',
                  }}
                  transition="all 0.3s"
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
            ) : polls.length > 0 ? (
              <Tabs isFitted variant="unstyled">
                <TabList
                  bg={tabBg}
                  p={1}
                  borderRadius="xl"
                  mb={6}
                >
                  <Tab
                    py={3}
                    px={4}
                    borderRadius="lg"
                    _selected={{
                      bg: activeBg,
                      color: 'brand.500',
                      fontWeight: '600',
                      boxShadow: 'sm',
                    }}
                    transition="all 0.2s"
                  >
                    <HStack spacing={2}>
                      <Text>Active Polls</Text>
                      {activePolls.length > 0 && (
                        <Badge
                          bg={badgeBg}
                          color={badgeColor}
                          borderRadius="full"
                          px={2}
                          fontSize="sm"
                        >
                          {activePolls.length}
                        </Badge>
                      )}
                    </HStack>
                  </Tab>
                  <Tab
                    py={3}
                    px={4}
                    borderRadius="lg"
                    _selected={{
                      bg: activeBg,
                      color: 'brand.500',
                      fontWeight: '600',
                      boxShadow: 'sm',
                    }}
                    transition="all 0.2s"
                  >
                    <HStack spacing={2}>
                      <Text>My Polls</Text>
                      {userPolls.length > 0 && (
                        <Badge
                          bg={badgeBg}
                          color={badgeColor}
                          borderRadius="full"
                          px={2}
                          fontSize="sm"
                        >
                          {userPolls.length}
                        </Badge>
                      )}
                    </HStack>
                  </Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    {activePolls.length > 0 ? (
                      <VStack spacing={4} align="stretch">
                        {activePolls.map((poll) => (
                          <Poll key={poll.id} poll={poll} onVote={handleRefresh} onClose={handleRefresh} />
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState 
                        message="No active polls available at the moment."
                        actionLabel="Create New Poll"
                        onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    {userPolls.length > 0 ? (
                      <VStack spacing={4} align="stretch">
                        {userPolls.map((poll) => (
                          <Poll key={poll.id} poll={poll} onVote={handleRefresh} onClose={handleRefresh} />
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState 
                        message="You haven't created any polls yet."
                        actionLabel="Create Your First Poll"
                        onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      />
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            ) : (
              <EmptyState 
                message="No polls available. Be the first to create a poll!"
                actionLabel="Create Your First Poll"
                onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              />
            )}
          </CardBody>
        </Card>
      </Container>
    </ErrorBoundary>
  );
};

export default PollList; 