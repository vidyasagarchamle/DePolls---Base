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
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react';
import { TimeIcon, DeleteIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { address } = useAccount();
  const { colorMode } = useColorMode();

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const votedBgColor = useColorModeValue('gray.50', 'gray.700');
  const progressBgColor = useColorModeValue('gray.100', 'gray.600');
  const progressFilledColor = useColorModeValue('blue.500', 'blue.300');

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
        onVote();
        setTimeout(() => onVote(), 1000);
        setTimeout(() => onVote(), 3000);
        setTimeout(() => onVote(), 5000);
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

  const isVoteLoading = isVoting || isWaitingVote;

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
    onSuccess: () => {
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being deleted.',
        status: 'info',
        duration: null,
        id: 'deleting-poll',
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
        onVote();
        setTimeout(() => onVote(), 1000);
        setTimeout(() => onVote(), 3000);
        setTimeout(() => onVote(), 5000);
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

  const isCloseLoading = isClosing || isWaitingClose;
  const isAnyTransactionPending = isVoteLoading || isCloseLoading;

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

  const handleOptionSelect = (index) => {
    if (poll.isMultipleChoice) {
      const optionIndex = parseInt(index);
      if (selectedOptions.includes(optionIndex)) {
        setSelectedOptions(selectedOptions.filter(opt => opt !== optionIndex));
      } else {
        setSelectedOptions([...selectedOptions, optionIndex]);
      }
    } else {
      setSelectedOptions([parseInt(index)]);
    }
  };

  const getTimeLeft = () => {
    const now = new Date();
    const deadline = new Date(poll.deadline * 1000);
    if (now > deadline) return 'Ended';
    
    const diff = deadline - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Ending soon';
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
        transform: isAnyTransactionPending ? 'none' : 'translateY(-2px)',
        shadow: 'md',
        borderColor: 'brand.500',
      }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="flex-start">
          <VStack align="start" spacing={1}>
            <Heading size="md" color={textColor}>{poll.question}</Heading>
            <HStack spacing={2}>
              <TimeIcon color={mutedColor} />
              <Text fontSize="sm" color={mutedColor}>
                {getTimeLeft()}
              </Text>
              {getStatusBadge()}
            </HStack>
          </VStack>
        </HStack>

        <Box>
          {poll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
            const isSelected = selectedOptions.includes(index);

            return (
              <Box
                key={index}
                mb={3}
                p={3}
                borderRadius="md"
                bg={isSelected ? votedBgColor : 'transparent'}
                borderWidth="1px"
                borderColor={isSelected ? 'brand.500' : borderColor}
              >
                {poll.hasVoted || isExpired || poll.isCreator ? (
                  <VStack align="stretch" spacing={1}>
                    <HStack justify="space-between">
                      <Text color={textColor} fontWeight={isSelected ? 'medium' : 'normal'}>
                        {option.text}
                      </Text>
                      <Text color={mutedColor} fontSize="sm">
                        {option.voteCount} votes ({percentage.toFixed(1)}%)
                      </Text>
                    </HStack>
                    <Progress
                      value={percentage}
                      size="sm"
                      borderRadius="full"
                      bg={progressBgColor}
                      colorScheme="brand"
                    />
                  </VStack>
                ) : (
                  <Box onClick={() => !isAnyTransactionPending && handleOptionSelect(index)} cursor={isAnyTransactionPending ? 'not-allowed' : 'pointer'}>
                    {poll.isMultipleChoice ? (
                      <Checkbox
                        isChecked={selectedOptions.includes(index)}
                        colorScheme="brand"
                        isDisabled={isAnyTransactionPending}
                      >
                        <Text color={textColor}>{option.text}</Text>
                      </Checkbox>
                    ) : (
                      <Radio
                        isChecked={selectedOptions.includes(index)}
                        colorScheme="brand"
                        isDisabled={isAnyTransactionPending}
                      >
                        <Text color={textColor}>{option.text}</Text>
                      </Radio>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {!poll.hasVoted && !isExpired && !poll.isCreator && (
          <Button
            onClick={handleVote}
            isLoading={isVoteLoading}
            loadingText="Submitting Vote..."
            width="full"
            isDisabled={isAnyTransactionPending || selectedOptions.length === 0}
          >
            Submit Vote
          </Button>
        )}

        {poll.isCreator && poll.isActive && (
          <Button
            leftIcon={<DeleteIcon />}
            onClick={handleDelete}
            colorScheme="red"
            variant="ghost"
            size="sm"
            isLoading={isCloseLoading}
            loadingText="Deleting..."
            isDisabled={isAnyTransactionPending}
          >
            Delete Poll
          </Button>
        )}

        {poll.hasVoted && (
          <Alert status="success" borderRadius="md" bg={votedBgColor}>
            <AlertIcon />
            <Text color={textColor}>You have voted on this poll</Text>
          </Alert>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={!isCloseLoading}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Delete Poll</ModalHeader>
          <ModalBody>
            <Text color={textColor}>
              Are you sure you want to delete this poll? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isCloseLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={confirmDelete}
              isLoading={isCloseLoading}
              loadingText="Deleting..."
              isDisabled={isAnyTransactionPending}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Poll; 