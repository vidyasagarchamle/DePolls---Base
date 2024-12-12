import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Badge,
  IconButton,
  Progress,
  useDisclosure,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Heading,
  Flex,
  Spacer,
  Tooltip,
  Tag,
  TagLeftIcon,
  TagLabel,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, CheckIcon, StarIcon, LockIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useWaitForTransaction } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote, onClose }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [optionWeights, setOptionWeights] = useState({});
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.300');
  const votedBgColor = useColorModeValue('gray.50', 'gray.700');
  const progressBgColor = useColorModeValue('gray.100', 'gray.600');

  const isExpired = poll.deadline * 1000 < Date.now();
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  // Vote functionality
  const { config: voteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !poll.hasVoted && !isExpired && poll.isActive,
    onError: (error) => {
      console.error('Vote preparation error:', error);
    },
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
    onError: (error) => {
      console.error('Vote error:', error);
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
        onVote();
        setTimeout(() => onVote(), 2000);
        setTimeout(() => onVote(), 5000);
      }
    },
    onError: (error) => {
      console.error('Vote transaction error:', error);
      toast({
        title: 'Error',
        description: 'Vote transaction failed. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  // Close poll functionality
  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: poll.isCreator && poll.isActive,
    onError: (error) => {
      console.error('Close poll preparation error:', error);
    },
  });

  const { write: closePoll, isLoading: isClosing, data: closeData } = useContractWrite({
    ...closeConfig,
    onSuccess: () => {
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being closed.',
        status: 'info',
        duration: null,
        id: 'closing-poll',
      });
    },
    onError: (error) => {
      console.error('Close poll error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { isLoading: isWaitingClose } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      toast.close('closing-poll');
      toast({
        title: 'Success!',
        description: 'Poll closed successfully.',
        status: 'success',
        duration: 5000,
      });
      closeModal();
      if (onClose) {
        onClose();
        setTimeout(() => onClose(), 2000);
        setTimeout(() => onClose(), 5000);
      }
    },
    onError: (error) => {
      console.error('Close poll transaction error:', error);
      toast({
        title: 'Error',
        description: 'Failed to close poll. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const isVoteLoading = isVoting || isWaitingVote;
  const isCloseLoading = isClosing || isWaitingClose;
  const isAnyTransactionPending = isVoteLoading || isCloseLoading;

  const handleOptionSelect = (index) => {
    if (poll.isWeighted) {
      setSelectedOptions(prev => {
        if (prev.includes(index)) {
          const newSelected = prev.filter(i => i !== index);
          const newWeights = { ...optionWeights };
          delete newWeights[index];
          setOptionWeights(newWeights);
          return newSelected;
        }
        return [...prev, index];
      });
    } else if (poll.isMultipleChoice) {
      setSelectedOptions(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        }
        return [...prev, index];
      });
    } else {
      setSelectedOptions([index]);
    }
  };

  const handleWeightChange = (index, value) => {
    setOptionWeights(prev => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleVote = () => {
    if (!vote || isVoteLoading) return;
    if (selectedOptions.length === 0) {
      toast({
        title: 'Select Option',
        description: poll.isMultipleChoice 
          ? 'Please select at least one option to vote.'
          : 'Please select an option to vote.',
        status: 'warning',
        duration: 5000,
      });
      return;
    }

    if (poll.isWeighted) {
      const totalWeight = Object.values(optionWeights).reduce((sum, weight) => sum + Number(weight), 0);
      if (totalWeight !== 100) {
        toast({
          title: 'Invalid Weights',
          description: 'Total weight must equal 100%',
          status: 'warning',
          duration: 5000,
        });
        return;
      }
    }

    vote();
  };

  const renderPollStatus = () => {
    const badges = [];

    if (isExpired || !poll.isActive) {
      badges.push(
        <Tag key="expired" colorScheme="red" borderRadius="full" size="md">
          <TagLeftIcon as={TimeIcon} />
          <TagLabel>{isExpired ? 'Expired' : 'Closed'}</TagLabel>
        </Tag>
      );
    } else if (poll.hasVoted) {
      badges.push(
        <Tag key="voted" colorScheme="green" borderRadius="full" size="md">
          <TagLeftIcon as={CheckIcon} />
          <TagLabel>Voted</TagLabel>
        </Tag>
      );
    }

    if (poll.isMultipleChoice) {
      badges.push(
        <Tag key="multiple" colorScheme="blue" borderRadius="full" size="md">
          <TagLeftIcon boxSize={3} as={CheckIcon} />
          <TagLabel>Multiple Choice</TagLabel>
        </Tag>
      );
    }

    return badges;
  };

  return (
    <Card
      bg={bgColor}
      borderRadius="2xl"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        transform: isAnyTransactionPending ? 'none' : 'translateY(-2px)',
        boxShadow: 'md',
      }}
    >
      <CardHeader pb={2}>
        <Flex align="flex-start">
          <VStack align="start" spacing={3} flex={1}>
            <Heading size="md" color={textColor}>
              {poll.question}
            </Heading>
            <HStack spacing={2} wrap="wrap">
              {renderPollStatus()}
            </HStack>
          </VStack>
          {poll.isCreator && (
            <IconButton
              icon={<DeleteIcon />}
              variant="ghost"
              colorScheme="red"
              onClick={onOpen}
              isLoading={isCloseLoading}
              disabled={!poll.isActive || isAnyTransactionPending}
              borderRadius="xl"
              size="sm"
            />
          )}
        </Flex>
      </CardHeader>

      <CardBody pt={2}>
        <VStack spacing={4} align="stretch">
          {poll.hasWhitelist && !poll.isWhitelisted && (
            <Alert
              status="warning"
              variant="subtle"
              borderRadius="xl"
            >
              <AlertIcon />
              <AlertDescription>
                This poll is restricted to whitelisted addresses only
              </AlertDescription>
            </Alert>
          )}

          {poll.options.map((option, index) => {
            const isSelected = selectedOptions.includes(index);
            const votePercentage = totalVotes > 0 
              ? (option.voteCount / totalVotes) * 100 
              : 0;

            return (
              <Box
                key={index}
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                borderColor={isSelected ? accentColor : borderColor}
                bg={poll.hasVoted ? votedBgColor : 'transparent'}
                cursor={!poll.hasVoted && !isExpired ? 'pointer' : 'default'}
                onClick={() => !poll.hasVoted && !isExpired && handleOptionSelect(index)}
                transition="all 0.2s"
                _hover={{
                  borderColor: !poll.hasVoted && !isExpired ? accentColor : undefined,
                  transform: !poll.hasVoted && !isExpired ? 'translateY(-1px)' : undefined,
                }}
              >
                <VStack align="stretch" spacing={3}>
                  <Flex align="center" justify="space-between">
                    <Text color={textColor} fontWeight={isSelected ? 'medium' : 'normal'}>
                      {option.text}
                    </Text>
                    {poll.hasVoted && (
                      <Text color={mutedColor} fontSize="sm">
                        {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </Flex>

                  {poll.isWeighted && isSelected && !poll.hasVoted && !isExpired && (
                    <NumberInput
                      value={optionWeights[index] || 0}
                      onChange={(value) => handleWeightChange(index, value)}
                      min={0}
                      max={100}
                      step={1}
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}

                  {poll.hasVoted && (
                    <Progress
                      value={votePercentage}
                      size="sm"
                      colorScheme="brand"
                      borderRadius="full"
                      bg={progressBgColor}
                    />
                  )}
                </VStack>
              </Box>
            );
          })}
        </VStack>

        {!poll.hasVoted && !isExpired && (
          <Button
            mt={6}
            colorScheme="brand"
            isLoading={isVoteLoading}
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isAnyTransactionPending}
            width="full"
            size="lg"
            borderRadius="xl"
            fontWeight="semibold"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: 'lg',
            }}
            _active={{
              transform: 'translateY(0)',
              boxShadow: 'md',
            }}
          >
            Vote
          </Button>
        )}
      </CardBody>

      <CardFooter pt={0}>
        <HStack justify="space-between" width="full" fontSize="sm" color={mutedColor}>
          <Text>
            Total Votes: {totalVotes}
          </Text>
          <Text>
            {isExpired ? 'Ended' : 'Ends'} {new Date(poll.deadline * 1000).toLocaleDateString()}
          </Text>
        </HStack>
      </CardFooter>

      <Modal isOpen={isOpen} onClose={closeModal}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor} borderRadius="2xl">
          <ModalHeader color={textColor}>Close Poll</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={textColor}>
              Are you sure you want to close this poll? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeModal}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => closePoll?.()}
              isLoading={isCloseLoading}
            >
              Close Poll
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default Poll; 