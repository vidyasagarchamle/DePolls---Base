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
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DePollsABI } from '../contracts/abis';
import { Bar } from 'react-chartjs-2';
import { ethers } from 'ethers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";
const SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/WOkDJG0SS7qXPGXTZ72ib-4O_Ie9FFbY";

const DeletePollModal = ({ isOpen, onClose, onDelete, isLoading }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>Delete Poll</ModalHeader>
      <ModalBody>
        Are you sure you want to delete this poll? This action cannot be undone.
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" mr={3} onClick={onClose}>
          Cancel
        </Button>
        <Button colorScheme="red" onClick={onDelete} isLoading={isLoading}>
          Delete
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

const PollCard = ({ poll }) => {
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

  const { config: voteConfig, error: prepareError } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !hasVoted && !!address,
  });

  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: isCreator && poll.isActive,
  });

  const { write: vote, isLoading: isVoting, error: writeError } = useContractWrite(voteConfig);
  const { write: closePoll, isLoading: isClosing } = useContractWrite(closeConfig);

  const handleVote = async () => {
    try {
      if (!vote) {
        console.error('Vote function not ready:', prepareError || writeError);
        return;
      }
      await vote();
      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Vote error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await closePoll?.();
      toast({
        title: 'Success',
        description: 'Poll deleted successfully',
        status: 'success',
        duration: 3000,
      });
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete poll',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  return (
    <Box
      bg="white"
      p={6}
      rounded="xl"
      shadow="sm"
      w="full"
      borderWidth={1}
      borderColor="gray.100"
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
          <Heading size="md">{poll.question}</Heading>
          <Text fontSize="sm" color="gray.500">
            Created by: <Code fontSize="xs">{poll.creator}</Code>
          </Text>
        </VStack>
        <HStack spacing={2}>
          {isExpired ? (
            <Badge colorScheme="red">Expired</Badge>
          ) : (
            <Badge colorScheme="green">Active</Badge>
          )}
          {isCreator && (
            <Tooltip label="Delete Poll">
              <IconButton
                icon={<DeleteIcon />}
                variant="ghost"
                colorScheme="red"
                size="sm"
                onClick={onOpen}
                isDisabled={!poll.isActive}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      <Text fontSize="sm" color="gray.600" mb={4}>
        <TimeIcon mr={2} />
        Ends: {new Date(Number(poll.deadline) * 1000).toLocaleString()}
      </Text>

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
                  colorScheme="blue"
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
                  <Radio key={index} value={index.toString()} colorScheme="blue">
                    {option.text}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          <Button
            colorScheme="blue"
            onClick={handleVote}
            isLoading={isVoting}
            isDisabled={selectedOptions.length === 0}
            leftIcon={<CheckIcon />}
            size="lg"
            w="full"
          >
            Submit Vote
          </Button>

          {(prepareError || writeError) && (
            <Alert status="error" variant="left-accent">
              <AlertIcon />
              {(prepareError || writeError)?.message || 'Error preparing vote transaction'}
            </Alert>
          )}
        </VStack>
      ) : (
        <Box
          h="300px"
          p={4}
          bg="gray.50"
          rounded="lg"
          borderWidth={1}
          borderColor="gray.200"
        >
          <Bar
            data={{
              labels: poll.options.map(opt => opt.text),
              datasets: [{
                label: 'Votes',
                data: poll.options.map(opt => Number(opt.voteCount)),
                backgroundColor: 'rgba(66, 153, 225, 0.6)',
                borderColor: 'rgba(66, 153, 225, 1)',
                borderWidth: 1,
              }]
            }}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
            }}
          />
        </Box>
      )}

      <Divider my={4} />

      <HStack justify="space-between" align="center">
        <Text fontSize="sm" color="gray.600">
          Total votes: {totalVotes}
        </Text>
        {hasVoted && (
          <Badge colorScheme="blue" variant="subtle">
            <CheckIcon mr={2} />
            You voted
          </Badge>
        )}
      </HStack>

      <DeletePollModal
        isOpen={isOpen}
        onClose={onClose}
        onDelete={handleDelete}
        isLoading={isClosing}
      />
    </Box>
  );
};

const PollList = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { address } = useAccount();

  // Get poll count
  const { data: pollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
  });

  useEffect(() => {
    const loadPolls = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!pollCount) {
          console.log('No poll count available');
          return;
        }

        console.log('Total polls:', pollCount.toString());

        const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
        const contract = new ethers.Contract(POLLS_CONTRACT_ADDRESS, DePollsABI, provider);

        const fetchedPolls = [];
        for (let i = 0; i < Number(pollCount); i++) {
          try {
            const pollData = await contract.getPoll(i);
            console.log(`Raw poll ${i} data:`, pollData);

            const poll = {
              id: pollData.id.toNumber(),
              creator: pollData.creator,
              question: pollData.question,
              deadline: pollData.deadline.toNumber(),
              isWeighted: pollData.isWeighted,
              isMultipleChoice: pollData.isMultipleChoice,
              isActive: pollData.isActive,
              options: pollData.options.map(opt => ({
                text: opt.text,
                voteCount: opt.voteCount.toNumber()
              }))
            };

            console.log(`Processed poll ${i}:`, poll);
            if (poll.isActive) {
              fetchedPolls.push(poll);
            }
          } catch (err) {
            console.error(`Error fetching poll ${i}:`, err);
          }
        }

        console.log('Active polls:', fetchedPolls);
        setPolls(fetchedPolls);
      } catch (err) {
        console.error('Error loading polls:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (address && pollCount) {
      loadPolls();
    }
  }, [address, pollCount]);

  if (!address) {
    return (
      <Alert
        status="info"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        height="200px"
        rounded="xl"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <Heading size="md" mt={4} mb={2}>Connect Your Wallet</Heading>
        <Text>Please connect your wallet to view and interact with polls</Text>
      </Alert>
    );
  }

  if (loading) {
    return (
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Active Polls</Heading>
        <Box
          p={6}
          bg="white"
          rounded="xl"
          shadow="sm"
          textAlign="center"
        >
          <Text>Loading polls...</Text>
        </Box>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        height="200px"
        rounded="xl"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <Heading size="md" mt={4} mb={2}>Error Loading Polls</Heading>
        <Text>{error}</Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between" align="center">
        <Heading size="lg">Active Polls</Heading>
        <Badge colorScheme="blue" p={2} rounded="md">
          Total polls: {pollCount ? pollCount.toString() : '0'}
        </Badge>
      </HStack>
      
      {polls.length === 0 ? (
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          rounded="xl"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <Heading size="md" mt={4} mb={2}>No Active Polls</Heading>
          <Text>Create a new poll to get started!</Text>
        </Alert>
      ) : (
        <VStack spacing={6}>
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export default PollList; 