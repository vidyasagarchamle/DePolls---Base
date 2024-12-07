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
  IconButton,
  Divider,
  useColorModeValue,
  Spacer,
} from '@chakra-ui/react';
import { TimeIcon, CheckIcon, DeleteIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote, showVoterDetails = false }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { address } = useAccount();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const isExpired = poll.deadline * 1000 < Date.now();
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  // Vote functionality
  const { config: voteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !poll.hasVoted && !isExpired && !poll.isCreator,
  });

  const { write: vote, isLoading: isVoting, data: voteData } = useContractWrite({
    ...voteConfig,
    onSuccess: () => {
      toast({
        title: 'Vote Submitted',
        description: 'Your vote is being processed.',
        status: 'info',
        duration: null,
        id: 'voting',
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

  const { isLoading: isWaitingVote } = useWaitForTransaction({
    hash: voteData?.hash,
    onSuccess: () => {
      toast.close('voting');
      toast({
        title: 'Success!',
        description: 'Your vote has been recorded.',
        status: 'success',
        duration: 5000,
      });
      if (onVote) {
        setTimeout(() => {
          onVote();
        }, 1000);
      }
    },
    onError: (error) => {
      toast.close('voting');
      toast({
        title: 'Error',
        description: 'Failed to record vote. Please try again.',
        status: 'error',
        duration: 5000,
      });
      if (onVote) onVote();
    },
  });

  // Close poll functionality
  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: poll.isCreator && poll.isActive,
  });

  const { write: closePoll, isLoading: isClosing, data: closeData } = useContractWrite({
    ...closeConfig,
    onMutate: () => {
      toast({
        title: 'Preparing to Delete Poll',
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
        description: 'Your poll is being deleted.',
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

  const { isLoading: isWaitingClose } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      toast.close('deleting-poll');
      toast({
        title: 'Success!',
        description: 'Your poll has been deleted successfully.',
        status: 'success',
        duration: 5000,
      });
      onClose();
      if (onVote) {
        setTimeout(() => {
          onVote();
        }, 2000);
      }
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
    onOpen();
  };

  const confirmDelete = () => {
    if (!closePoll) return;
    try {
      closePoll();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit transaction. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleVote = () => {
    if (!vote) return;
    if (selectedOptions.length === 0) {
      toast({
        title: 'Select Option',
        description: 'Please select at least one option to vote.',
        status: 'warning',
        duration: 5000,
      });
      return;
    }
    vote();
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

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="xl"
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
          borderColor: 'brand.500',
        }}
      >
        <VStack align="stretch" spacing={6}>
          {/* Header */}
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between" align="start">
              <Heading size="md" color={textColor}>{poll.question}</Heading>
              <HStack spacing={2}>
                {getStatusBadge()}
                {poll.isCreator && poll.isActive && (
                  <Tooltip label="Delete Poll">
                    <IconButton
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      variant="ghost"
                      size="sm"
                      isLoading={isClosing || isWaitingClose}
                      onClick={handleDelete}
                      aria-label="Delete poll"
                    />
                  </Tooltip>
                )}
              </HStack>
            </HStack>

            <HStack fontSize="sm" color={mutedColor} spacing={4}>
              <Tooltip label={new Date(poll.deadline * 1000).toLocaleString()}>
                <HStack>
                  <TimeIcon />
                  <Text>
                    {isExpired ? 'Ended' : 'Ends'} {new Date(poll.deadline * 1000).toLocaleString()}
                  </Text>
                </HStack>
              </Tooltip>
              <HStack>
                <CheckIcon />
                <Text>{totalVotes} votes</Text>
              </HStack>
            </HStack>
          </VStack>

          <Divider />

          {/* Poll Options */}
          <VStack align="stretch" spacing={4}>
            {!poll.hasVoted && !isExpired && !poll.isCreator ? (
              // Voting Interface
              <VStack align="stretch" spacing={4}>
                {poll.isMultipleChoice ? (
                  <Stack spacing={3}>
                    {poll.options.map((option, index) => (
                      <Checkbox
                        key={index}
                        isChecked={selectedOptions.includes(index)}
                        onChange={() => handleOptionSelect(index.toString())}
                        colorScheme="brand"
                        size="lg"
                      >
                        {option.text}
                      </Checkbox>
                    ))}
                  </Stack>
                ) : (
                  <RadioGroup
                    onChange={handleOptionSelect}
                    value={selectedOptions[0]?.toString()}
                  >
                    <Stack spacing={3}>
                      {poll.options.map((option, index) => (
                        <Radio
                          key={index}
                          value={index.toString()}
                          colorScheme="brand"
                          size="lg"
                        >
                          {option.text}
                        </Radio>
                      ))}
                    </Stack>
                  </RadioGroup>
                )}

                <Button
                  colorScheme="brand"
                  size="lg"
                  onClick={handleVote}
                  isLoading={isVoting || isWaitingVote}
                  loadingText="Submitting Vote..."
                  isDisabled={selectedOptions.length === 0}
                >
                  Submit Vote
                </Button>
              </VStack>
            ) : (
              // Results View
              <VStack align="stretch" spacing={4}>
                {poll.options.map((option, index) => (
                  <Box key={index}>
                    <HStack justify="space-between" mb={1}>
                      <Text color={textColor} fontSize="lg">{option.text}</Text>
                      <Text color={mutedColor}>
                        {option.voteCount} votes
                        {totalVotes > 0 && ` (${((option.voteCount / totalVotes) * 100).toFixed(1)}%)`}
                      </Text>
                    </HStack>
                    <Progress
                      value={(option.voteCount / (totalVotes || 1)) * 100}
                      size="lg"
                      colorScheme="brand"
                      borderRadius="full"
                      hasStripe
                      isAnimated
                    />
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

          {/* Status Messages */}
          {poll.hasVoted && (
            <Alert status="success" variant="subtle" borderRadius="lg">
              <AlertIcon />
              <Text>You have voted in this poll</Text>
            </Alert>
          )}

          {isExpired && !poll.hasVoted && !poll.isCreator && (
            <Alert status="warning" variant="subtle" borderRadius="lg">
              <AlertIcon />
              <Text>This poll has ended</Text>
            </Alert>
          )}
        </VStack>
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Delete Poll</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete this poll? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={confirmDelete}
              isLoading={isClosing || isWaitingClose}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Poll; 