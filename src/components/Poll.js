import React, { useState, useCallback, useEffect } from 'react';
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

const Poll = ({ poll: initialPoll, onVote, onClose }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollData, setPollData] = useState(initialPoll);
  const toast = useToast();
  const toastIdRef = React.useRef();
  const { address } = useAccount();

  useEffect(() => {
    setPollData(initialPoll);
  }, [initialPoll]);

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
      setPollData(prev => ({
        ...prev,
        hasVoted: true,
        options: prev.options.map((opt, idx) => ({
          ...opt,
          voteCount: selectedOptions.includes(idx) ? opt.voteCount + 1 : opt.voteCount
        })),
        totalVotes: prev.totalVotes + selectedOptions.length
      }));

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
      setPollData(prev => ({
        ...prev,
        isActive: false
      }));

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
        args: [BigInt(pollData.id), selectedOptions.map(i => BigInt(i))],
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
  }, [pollData.id, selectedOptions, vote, showTransactionToast]);

  const handleClose = useCallback(async () => {
    try {
      setIsSubmitting(true);
      showTransactionToast(
        'info',
        'Closing Poll',
        'Please confirm the transaction in your wallet...'
      );

      await closePoll({
        args: [BigInt(pollData.id)],
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
  }, [pollData.id, closePoll, showTransactionToast]);

  const isExpired = pollData.deadline * 1000 < Date.now();
  const canVote = !isExpired && !pollData.hasVoted && pollData.isActive && (!pollData.hasWhitelist || pollData.isWhitelisted);
  const showResults = pollData.hasVoted || !pollData.isActive || isExpired;

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
          <Heading size="md">{pollData.question}</Heading>
          <Spacer />
          <HStack spacing={2}>
            {pollData.isMultipleChoice && (
              <Badge colorScheme="purple">Multiple Choice</Badge>
            )}
            {pollData.hasWhitelist && (
              <Badge colorScheme="cyan">Whitelisted</Badge>
            )}
            {!pollData.isActive && (
              <Badge colorScheme="red">Closed</Badge>
            )}
            {isExpired && (
              <Badge colorScheme="orange">Expired</Badge>
            )}
          </HStack>
        </Flex>
        <Text fontSize="sm" color="gray.500" mt={2}>
          Created by: {pollData.creator.slice(0, 6)}...{pollData.creator.slice(-4)}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {isExpired
            ? `Ended ${formatTimeDistance(pollData.deadline)}`
            : `Ends ${formatTimeDistance(pollData.deadline)}`}
        </Text>
      </CardHeader>

      <CardBody>
        <VStack align="stretch" spacing={4}>
          {pollData.isMultipleChoice ? (
            <CheckboxGroup
              value={selectedOptions}
              onChange={values => setSelectedOptions(values.map(Number))}
            >
              <VStack align="stretch" spacing={3}>
                {pollData.options.map((option, index) => (
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
                        value={(option.voteCount / Math.max(1, pollData.totalVotes)) * 100}
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
                {pollData.options.map((option, index) => (
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
                        value={(option.voteCount / Math.max(1, pollData.totalVotes)) * 100}
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

          {pollData.creator === address && pollData.isActive && (
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