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
import { useContractWrite, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

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

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const { write: vote, data: voteData } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
  });

  const { write: closePoll, data: closeData } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
  });

  const { isLoading: isVoting } = useWaitForTransaction({
    hash: voteData?.hash,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Your vote has been recorded',
        status: 'success',
        duration: 5000,
      });
      if (onVote) onVote();
    },
    onError: (error) => {
      console.error('Vote transaction error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { isLoading: isClosing } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Poll has been closed',
        status: 'success',
        duration: 5000,
      });
      if (onClose) onClose();
    },
    onError: (error) => {
      console.error('Close poll transaction error:', error);
      toast({
        title: 'Error',
        description: 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
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
      await vote({
        args: [BigInt(poll.id), selectedOptions.map(i => BigInt(i))],
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  }, [poll.id, selectedOptions, vote, toast]);

  const handleClose = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await closePoll({
        args: [BigInt(poll.id)],
      });
    } catch (error) {
      console.error('Error closing poll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  }, [poll.id, closePoll, toast]);

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
                    </HStack>
                    
                    {showResults && (
                      <Box mt={2}>
                        <Progress
                          value={(option.voteCount / (poll.totalVotes || 1)) * 100}
                          size="sm"
                          colorScheme="brand"
                          borderRadius="full"
                        />
                        <Text fontSize="sm" mt={1}>
                          {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''} (
                          {poll.totalVotes > 0
                            ? ((option.voteCount / poll.totalVotes) * 100).toFixed(1)
                            : '0'}
                          %)
                        </Text>
                      </Box>
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
                    </HStack>
                    
                    {showResults && (
                      <Box mt={2}>
                        <Progress
                          value={(option.voteCount / (poll.totalVotes || 1)) * 100}
                          size="sm"
                          colorScheme="brand"
                          borderRadius="full"
                        />
                        <Text fontSize="sm" mt={1}>
                          {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''} (
                          {poll.totalVotes > 0
                            ? ((option.voteCount / poll.totalVotes) * 100).toFixed(1)
                            : '0'}
                          %)
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </RadioGroup>
          )}

          {canVote && (
            <Button
              colorScheme="brand"
              isLoading={isSubmitting || isVoting}
              onClick={handleVote}
              isDisabled={selectedOptions.length === 0}
            >
              Submit Vote
            </Button>
          )}

          {poll.isCreator && poll.isActive && (
            <Button
              colorScheme="red"
              variant="outline"
              isLoading={isSubmitting || isClosing}
              onClick={handleClose}
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