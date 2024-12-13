import React, { useState, useCallback } from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Progress,
  useToast,
  Checkbox,
  Radio,
  Badge,
  useColorModeValue,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Flex,
  Spacer,
  RadioGroup,
  CheckboxGroup,
} from '@chakra-ui/react';
import { useContractWrite, useWaitForTransaction, useSignTypedData, usePublicClient, useAccount } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';
import { DOMAIN } from '../contracts';

const formatTimeDistance = (timestamp) => {
  const now = Date.now();
  const targetDate = timestamp * 1000;
  const diffInSeconds = Math.floor((targetDate - now) / 1000);
  
  if (diffInSeconds < 0) {
    const pastSeconds = Math.abs(diffInSeconds);
    if (pastSeconds < 60) return 'just now';
    if (pastSeconds < 3600) return `${Math.floor(pastSeconds / 60)}m ago`;
    if (pastSeconds < 86400) return `${Math.floor(pastSeconds / 3600)}h ago`;
    return `${Math.floor(pastSeconds / 86400)}d ago`;
  }
  
  if (diffInSeconds < 60) return 'in less than a minute';
  if (diffInSeconds < 3600) return `in ${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `in ${Math.floor(diffInSeconds / 3600)}h`;
  return `in ${Math.floor(diffInSeconds / 86400)}d`;
};

const Poll = ({ poll, onVote, onClose }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const toastIdRef = React.useRef();
  const { address } = useAccount();

  const showTransactionToast = useCallback((status, title, description) => {
    if (toastIdRef.current) {
      toast.update(toastIdRef.current, { status, title, description });
    } else {
      toastIdRef.current = toast({
        title,
        description,
        status,
        duration: null,
        isClosable: true,
        position: 'bottom-right'
      });
    }
  }, [toast]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const { write: vote, data: voteData } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    onError(error) {
      console.error('Vote error:', error);
      showTransactionToast(
        'error',
        'Vote Failed',
        error.message || 'Failed to submit vote'
      );
      setIsSubmitting(false);
    }
  });

  const { isLoading: isVoting } = useWaitForTransaction({
    hash: voteData?.hash,
    onSuccess() {
      showTransactionToast(
        'success',
        'Vote Submitted!',
        'Your vote has been recorded successfully'
      );
      setIsSubmitting(false);
      if (onVote) onVote();
      setSelectedOptions([]);
    },
    onError(error) {
      console.error('Vote transaction error:', error);
      showTransactionToast(
        'error',
        'Vote Failed',
        error.message || 'Failed to submit vote'
      );
      setIsSubmitting(false);
    },
  });

  const { write: closePoll, data: closeData, isLoading: isClosing } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    onError(error) {
      console.error('Close poll error:', error);
      showTransactionToast(
        'error',
        'Failed to Close Poll',
        error.message || 'Failed to close poll'
      );
      setIsSubmitting(false);
    }
  });

  const { isLoading: isClosingTx } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess() {
      showTransactionToast(
        'success',
        'Poll Closed',
        'The poll has been closed successfully'
      );
      setIsSubmitting(false);
      if (onClose) onClose();
    },
    onError(error) {
      console.error('Close poll transaction error:', error);
      showTransactionToast(
        'error',
        'Failed to Close Poll',
        error.message || 'Failed to close poll'
      );
      setIsSubmitting(false);
    },
  });

  const handleVote = useCallback(async () => {
    if (!selectedOptions.length) {
      toast({
        title: 'Error',
        description: 'Please select at least one option',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      showTransactionToast(
        'info',
        'Submitting Vote',
        'Please confirm the transaction in your wallet...'
      );

      await vote({
        args: [BigInt(poll.id), selectedOptions.map(i => BigInt(i))],
      });

      showTransactionToast(
        'loading',
        'Vote in Progress',
        'Your vote is being recorded...'
      );
    } catch (error) {
      console.error('Voting error:', error);
      showTransactionToast(
        'error',
        'Vote Failed',
        error.message || 'Failed to submit vote'
      );
      setIsSubmitting(false);
    }
  }, [poll.id, selectedOptions, vote, showTransactionToast]);

  const handleClose = useCallback(async () => {
    try {
      setIsSubmitting(true);
      showTransactionToast(
        'info',
        'Closing Poll',
        'Please confirm the transaction in your wallet...'
      );

      await closePoll({
        args: [BigInt(poll.id)],
      });

      showTransactionToast(
        'loading',
        'Closing in Progress',
        'The poll is being closed...'
      );
    } catch (error) {
      console.error('Error closing poll:', error);
      showTransactionToast(
        'error',
        'Failed to Close Poll',
        error.message || 'Failed to close poll'
      );
      setIsSubmitting(false);
    }
  }, [poll.id, closePoll, showTransactionToast]);

  const isExpired = poll.deadline * 1000 < Date.now();
  const canVote = !isExpired && !poll.hasVoted && poll.isActive && (!poll.hasWhitelist || poll.isWhitelisted);
  const showResults = poll.hasVoted || !poll.isActive || isExpired;

  return (
    <Card
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ borderColor: 'brand.500' }}
      opacity={isSubmitting ? 0.7 : 1}
      pointerEvents={isSubmitting ? 'none' : 'auto'}
    >
      <CardHeader>
        <Flex align="center">
          <Heading size="md">{poll.question}</Heading>
          <Spacer />
          <HStack spacing={2}>
            {poll.isMultipleChoice && (
              <Badge colorScheme="purple">Multiple Choice</Badge>
            )}
            {poll.hasWhitelist && (
              <Badge colorScheme="cyan">Whitelisted</Badge>
            )}
            {!poll.isActive && (
              <Badge colorScheme="red">Closed</Badge>
            )}
            {isExpired && (
              <Badge colorScheme="orange">Expired</Badge>
            )}
          </HStack>
        </Flex>
        <Text fontSize="sm" color="gray.500" mt={2}>
          Created by: {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {isExpired
            ? `Ended ${formatTimeDistance(poll.deadline)}`
            : `Ends ${formatTimeDistance(poll.deadline)}`}
        </Text>
      </CardHeader>

      <CardBody>
        <VStack align="stretch" spacing={4}>
          {poll.isMultipleChoice ? (
            <CheckboxGroup
              value={selectedOptions}
              onChange={values => setSelectedOptions(values.map(Number))}
            >
              <VStack align="stretch" spacing={3}>
                {poll.options.map((option, index) => (
                  <Box
                    key={index}
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    _hover={{ bg: hoverBg }}
                  >
                    <HStack>
                      {canVote ? (
                        <Checkbox value={index} isDisabled={isSubmitting}>
                          {option.text}
                        </Checkbox>
                      ) : (
                        <Text>{option.text}</Text>
                      )}
                      {showResults && (
                        <Text ml="auto" color="gray.500">
                          {option.voteCount} votes
                        </Text>
                      )}
                    </HStack>
                    {showResults && (
                      <Progress
                        value={(option.voteCount / Math.max(1, poll.totalVotes)) * 100}
                        size="sm"
                        colorScheme="brand"
                        mt={2}
                      />
                    )}
                  </Box>
                ))}
              </VStack>
            </CheckboxGroup>
          ) : (
            <RadioGroup
              value={selectedOptions[0]?.toString()}
              onChange={value => setSelectedOptions([Number(value)])}
            >
              <VStack align="stretch" spacing={3}>
                {poll.options.map((option, index) => (
                  <Box
                    key={index}
                    p={4}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    _hover={{ bg: hoverBg }}
                  >
                    <HStack>
                      {canVote ? (
                        <Radio value={index.toString()} isDisabled={isSubmitting}>
                          {option.text}
                        </Radio>
                      ) : (
                        <Text>{option.text}</Text>
                      )}
                      {showResults && (
                        <Text ml="auto" color="gray.500">
                          {option.voteCount} votes
                        </Text>
                      )}
                    </HStack>
                    {showResults && (
                      <Progress
                        value={(option.voteCount / Math.max(1, poll.totalVotes)) * 100}
                        size="sm"
                        colorScheme="brand"
                        mt={2}
                      />
                    )}
                  </Box>
                ))}
              </VStack>
            </RadioGroup>
          )}

          {canVote && (
            <Button
              colorScheme="brand"
              onClick={handleVote}
              isLoading={isSubmitting || isVoting}
              loadingText="Submitting vote..."
              w="full"
              size="lg"
              mt={4}
              disabled={isSubmitting || isVoting || !selectedOptions.length}
            >
              Vote
            </Button>
          )}

          {poll.creator === address && poll.isActive && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClose}
              isLoading={isSubmitting || isClosing || isClosingTx}
              loadingText="Closing poll..."
              w="full"
              size="lg"
              disabled={isSubmitting || isClosing || isClosingTx}
            >
              Close Poll
            </Button>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default Poll; 