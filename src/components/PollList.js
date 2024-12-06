import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  RadioGroup,
  Radio,
  Checkbox,
  Stack,
  useToast,
  Alert,
  AlertIcon,
  Code,
  HStack,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  Flex,
  Tooltip,
  Progress,
  Container,
  Skeleton,
  SimpleGrid,
  useBreakpointValue,
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, CheckIcon } from '@chakra-ui/icons';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI } from '../contracts/abis';
import CreatePoll from './CreatePoll';

const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

function PollList() {
  const { address } = useAccount();
  const toast = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerWidth = useBreakpointValue({ base: "95%", md: "90%", lg: "80%" });

  const { data: pollCount, refetch: refetchPollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
  });

  const fetchPolls = async () => {
    if (!pollCount || !address) return;
    
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(POLLS_CONTRACT_ADDRESS, DePollsABI, provider);
      
      const fetchedPolls = [];
      for (let i = 0; i < Number(pollCount); i++) {
        try {
          const poll = await contract.getPoll(i);
          if (poll.isActive) {
            fetchedPolls.push({
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
            });
          }
        } catch (error) {
          console.error(`Error fetching poll ${i}:`, error);
        }
      }
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
    fetchPolls();
  }, [address, pollCount]);

  const handlePollUpdate = () => {
    refetchPollCount();
    fetchPolls();
  };

  if (!address) {
    return (
      <Container maxW={containerWidth} py={8}>
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
              <PollCard 
                key={poll.id} 
                poll={poll} 
                onPollUpdate={handlePollUpdate}
              />
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}

const PollCard = ({ poll, onPollUpdate }) => {
  const { address } = useAccount();
  const toast = useToast();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isCreator = address?.toLowerCase() === poll.creator?.toLowerCase();
  const isExpired = new Date(Number(poll.deadline) * 1000) < new Date();

  const { data: hasVoted } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'hasVoted',
    args: [poll.id, address],
    watch: true,
    enabled: !!address,
  });

  const { config: voteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !hasVoted && !!address,
  });

  const { write: vote, isLoading: isVoting } = useContractWrite({
    ...voteConfig,
    onSuccess: (data) => {
      const toastId = toast({
        title: 'Submitting Vote...',
        description: 'Please wait while your transaction is being processed.',
        status: 'info',
        duration: null,
        isClosable: false,
      });

      const waitForTransaction = async () => {
        try {
          const receipt = await data.wait();
          toast.close(toastId);
          
          if (receipt.status === 1) {
            toast({
              title: 'Success!',
              description: 'Your vote has been recorded successfully.',
              status: 'success',
              duration: 5000,
            });
            setSelectedOptions([]);
            onPollUpdate();
          } else {
            toast({
              title: 'Error',
              description: 'Transaction failed. Please try again.',
              status: 'error',
              duration: 5000,
            });
          }
        } catch (error) {
          toast.close(toastId);
          toast({
            title: 'Error',
            description: 'Failed to submit vote. Please try again.',
            status: 'error',
            duration: 5000,
          });
        }
      };

      waitForTransaction();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: isCreator && poll.isActive,
  });

  const { write: closePoll, isLoading: isClosing } = useContractWrite({
    ...closeConfig,
    onSuccess: (data) => {
      const toastId = toast({
        title: 'Closing Poll...',
        description: 'Please wait while your transaction is being processed.',
        status: 'info',
        duration: null,
        isClosable: false,
      });

      const waitForTransaction = async () => {
        try {
          const receipt = await data.wait();
          toast.close(toastId);
          
          if (receipt.status === 1) {
            toast({
              title: 'Success!',
              description: 'Poll has been closed successfully.',
              status: 'success',
              duration: 5000,
            });
            onClose();
            onPollUpdate();
          } else {
            toast({
              title: 'Error',
              description: 'Transaction failed. Please try again.',
              status: 'error',
              duration: 5000,
            });
          }
        } catch (error) {
          toast.close(toastId);
          toast({
            title: 'Error',
            description: 'Failed to close poll. Please try again.',
            status: 'error',
            duration: 5000,
          });
        }
      };

      waitForTransaction();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  return (
    <Box
      bg="white"
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      boxShadow="sm"
      borderWidth={1}
      borderColor="gray.200"
      height="100%"
      display="flex"
      flexDirection="column"
      _hover={{
        borderColor: 'brand.500',
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        transition: 'all 0.2s',
      }}
    >
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="flex-start">
          <Heading size="md" noOfLines={2}>{poll.question}</Heading>
          {isExpired ? (
            <Badge colorScheme="red">Expired</Badge>
          ) : (
            <Badge colorScheme="green">Active</Badge>
          )}
        </Flex>

        <Text fontSize="sm" color="gray.500" noOfLines={1}>
          Created by: <Code fontSize="xs">{poll.creator}</Code>
        </Text>

        <HStack color="gray.600" fontSize="sm">
          <TimeIcon />
          <Text noOfLines={1}>
            Ends: {new Date(Number(poll.deadline) * 1000).toLocaleString()}
          </Text>
        </HStack>

        {isCreator && (
          <Button
            leftIcon={<DeleteIcon />}
            variant="ghost"
            colorScheme="red"
            size="sm"
            onClick={onOpen}
            isDisabled={!poll.isActive}
          >
            Close Poll
          </Button>
        )}

        <Box flex={1}>
          {!hasVoted && !isExpired ? (
            <VStack align="stretch" spacing={4}>
              {poll.isMultipleChoice ? (
                <Stack spacing={3}>
                  {poll.options.map((option, index) => (
                    <Checkbox
                      key={index}
                      isChecked={selectedOptions.includes(index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOptions([...selectedOptions, index]);
                        } else {
                          setSelectedOptions(selectedOptions.filter(i => i !== index));
                        }
                      }}
                    >
                      {option.text}
                    </Checkbox>
                  ))}
                </Stack>
              ) : (
                <RadioGroup
                  onChange={(value) => setSelectedOptions([parseInt(value)])}
                  value={selectedOptions[0]?.toString()}
                >
                  <Stack spacing={3}>
                    {poll.options.map((option, index) => (
                      <Radio key={index} value={index.toString()}>
                        {option.text}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              )}

              <Button
                onClick={() => vote?.()}
                isLoading={isVoting}
                isDisabled={selectedOptions.length === 0}
                leftIcon={<CheckIcon />}
                size="md"
                mt="auto"
              >
                Submit Vote
              </Button>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={4}>
              {poll.options.map((option, index) => (
                <Box key={index}>
                  <Flex justify="space-between" mb={1}>
                    <Text noOfLines={1}>{option.text}</Text>
                    <Text color="gray.600" ml={2}>
                      {Number(option.voteCount)} votes ({totalVotes > 0 ? ((Number(option.voteCount) / totalVotes) * 100).toFixed(1) : 0}%)
                    </Text>
                  </Flex>
                  <Progress
                    value={totalVotes > 0 ? (Number(option.voteCount) / totalVotes) * 100 : 0}
                    size="sm"
                    colorScheme="brand"
                    borderRadius="full"
                  />
                </Box>
              ))}
              {hasVoted && (
                <Badge alignSelf="start" colorScheme="brand" variant="subtle">
                  <CheckIcon mr={2} />
                  You have voted
                </Badge>
              )}
            </VStack>
          )}
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Close Poll</ModalHeader>
          <ModalBody>
            <Text>
              Are you sure you want to close this poll? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => closePoll?.()}
              isLoading={isClosing}
            >
              Close Poll
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PollList; 