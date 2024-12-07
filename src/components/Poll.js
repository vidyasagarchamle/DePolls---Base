import React, { useState } from 'react';
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
  HStack,
  Badge,
  Tooltip,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import { TimeIcon, CheckIcon, ViewIcon, DeleteIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useContractRead, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote, showVoterDetails = false }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const toast = useToast();
  const { address } = useAccount();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isExpired = poll.deadline * 1000 < Date.now();
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  // Get voter details for the poll
  const { data: voterDetails } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPollVoters',
    args: [poll.id],
    enabled: showVoterDetails && poll.isCreator,
    watch: true,
  });

  const { config } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !poll.hasVoted && !isExpired && !poll.isCreator,
  });

  const { write: vote, isLoading: isVoting } = useContractWrite({
    ...config,
    onSuccess: () => {
      toast({
        title: 'Vote submitted!',
        description: 'Your vote has been recorded.',
        status: 'success',
        duration: 5000,
      });
      if (onVote) onVote();
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

  const handleVote = () => {
    if (!address) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet to vote',
        status: 'warning',
        duration: 5000,
      });
      return;
    }
    if (selectedOptions.length === 0) {
      toast({
        title: 'Select Option',
        description: 'Please select at least one option',
        status: 'warning',
        duration: 5000,
      });
      return;
    }
    vote?.();
  };

  const handleOptionSelect = (value) => {
    if (poll.isMultipleChoice) {
      const optionIndex = parseInt(value);
      if (selectedOptions.includes(optionIndex)) {
        setSelectedOptions(selectedOptions.filter(opt => opt !== optionIndex));
      } else {
        setSelectedOptions([...selectedOptions, optionIndex]);
      }
    } else {
      setSelectedOptions([parseInt(value)]);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge colorScheme="red">Expired</Badge>;
    }
    if (poll.hasVoted) {
      return <Badge colorScheme="green">Voted</Badge>;
    }
    if (poll.isCreator) {
      return <Badge colorScheme="purple">Created by You</Badge>;
    }
    return <Badge colorScheme="blue">Active</Badge>;
  };

  // Add delete poll functionality
  const { config: deleteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'deletePoll',
    args: [poll.id],
    enabled: poll.isCreator,
  });

  const { write: deletePoll, isLoading: isDeleting, data: deleteData } = useContractWrite({
    ...deleteConfig,
    onMutate: () => {
      toast({
        title: 'Preparing Deletion',
        description: 'Please confirm the transaction in your wallet.',
        status: 'info',
        duration: null,
        id: 'deleting-poll-prepare',
      });
    },
    onSuccess: () => {
      toast.close('deleting-poll-prepare');
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being deleted. Please wait for confirmation.',
        status: 'info',
        duration: null,
        id: 'deleting-poll',
      });
    },
    onError: (error) => {
      toast.close('deleting-poll-prepare');
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete poll',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { isLoading: isWaitingDelete } = useWaitForTransaction({
    hash: deleteData?.hash,
    onSuccess: () => {
      toast.close('deleting-poll');
      toast({
        title: 'Success!',
        description: 'Your poll has been deleted successfully.',
        status: 'success',
        duration: 5000,
      });
      if (onVote) onVote();
    },
    onError: (error) => {
      toast.close('deleting-poll');
      toast({
        title: 'Error',
        description: 'Failed to delete poll. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleDelete = () => {
    if (!deletePoll) return;
    try {
      deletePoll();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deletion. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={6}
        bg={bgColor}
        borderColor={borderColor}
        shadow="sm"
        width="100%"
        position="relative"
        transition="all 0.2s"
        _hover={{
          transform: 'translateY(-2px)',
          shadow: 'md',
        }}
      >
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="start">
            <Heading size="md" color="gray.700">{poll.question}</Heading>
            <HStack spacing={2}>
              {getStatusBadge()}
              {poll.isCreator && (
                <Tooltip label="Delete Poll">
                  <IconButton
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    size="sm"
                    isLoading={isDeleting}
                    onClick={handleDelete}
                    aria-label="Delete poll"
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>

          <HStack fontSize="sm" color="gray.500" spacing={4}>
            <Tooltip label={formatDate(poll.deadline)}>
              <HStack>
                <TimeIcon />
                <Text>
                  {isExpired ? 'Ended' : 'Ends'} {formatDate(poll.deadline)}
                </Text>
              </HStack>
            </Tooltip>
            <HStack>
              <CheckIcon />
              <Text>{totalVotes} votes</Text>
            </HStack>
          </HStack>

          {(poll.hasVoted || isExpired || poll.isCreator) ? (
            <VStack align="stretch" spacing={3}>
              {poll.options.map((option, index) => (
                <Box key={index}>
                  <HStack justify="space-between" mb={1}>
                    <Text color="gray.700">{option.text}</Text>
                    <Text color="gray.600" fontSize="sm">
                      {option.voteCount} votes
                      {totalVotes > 0 && ` (${((option.voteCount / totalVotes) * 100).toFixed(1)}%)`}
                    </Text>
                  </HStack>
                  <Progress
                    value={(option.voteCount / (totalVotes || 1)) * 100}
                    size="sm"
                    colorScheme="brand"
                    borderRadius="full"
                  />
                </Box>
              ))}
            </VStack>
          ) : (
            <Stack spacing={3}>
              {poll.isMultipleChoice ? (
                poll.options.map((option, index) => (
                  <Checkbox
                    key={index}
                    isChecked={selectedOptions.includes(index)}
                    onChange={() => handleOptionSelect(index.toString())}
                    colorScheme="brand"
                  >
                    {option.text}
                  </Checkbox>
                ))
              ) : (
                <RadioGroup
                  onChange={handleOptionSelect}
                  value={selectedOptions[0]?.toString()}
                >
                  <Stack>
                    {poll.options.map((option, index) => (
                      <Radio
                        key={index}
                        value={index.toString()}
                        colorScheme="brand"
                      >
                        {option.text}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              )}
            </Stack>
          )}

          {!poll.hasVoted && !isExpired && !poll.isCreator && (
            <Button
              colorScheme="brand"
              onClick={handleVote}
              isLoading={isVoting}
              isDisabled={selectedOptions.length === 0}
              loadingText="Submitting Vote..."
            >
              Submit Vote
            </Button>
          )}

          {poll.hasVoted && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              You have voted in this poll
            </Alert>
          )}

          {isExpired && !poll.hasVoted && !poll.isCreator && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              This poll has ended
            </Alert>
          )}

          {showVoterDetails && poll.isCreator && (
            <Button
              leftIcon={<ViewIcon />}
              onClick={onOpen}
              variant="outline"
              colorScheme="brand"
            >
              View Voter Details
            </Button>
          )}
        </VStack>
      </Box>

      {/* Voter Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Voter Details</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold">
                Total Votes: {totalVotes}
              </Text>
              <Divider />
              {voterDetails && voterDetails.length > 0 ? (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Voter Address</Th>
                      <Th>Option Selected</Th>
                      <Th>Time</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {voterDetails.map((voter, index) => (
                      <Tr key={index}>
                        <Td>{voter.voter}</Td>
                        <Td>{poll.options[voter.optionIndex].text}</Td>
                        <Td>{formatDate(voter.timestamp)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Text>No votes recorded yet</Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Poll; 