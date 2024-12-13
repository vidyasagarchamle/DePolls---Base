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
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const { write: vote } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
  });

  const { write: closePoll, data: closeData, isLoading: isClosing } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
  });

  useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
  // EIP-712 signature for gasless voting
  const { signTypedData } = useSignTypedData({
    domain: DOMAIN,
    types: {
      Vote: [
        { name: 'pollId', type: 'uint256' },
        { name: 'optionIndexes', type: 'uint256[]' },
        { name: 'nonce', type: 'uint256' }
      ]
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign vote',
        status: 'error',
        duration: 5000,
      });
    }
  });

  const { write: metaVote, data: voteData, isLoading: isVoting } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'metaVote',
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
    }
  });

  const { write: closePoll, data: closeData, isLoading: isClosing } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
    }
  });

  useWaitForTransaction({
    hash: voteData?.hash,
    onSuccess: () => {
      setIsSubmitting(false);
      setSelectedOptions([]);
      toast({
        title: 'Success',
        description: 'Your vote has been recorded',
        status: 'success',
        duration: 5000,
      });
      if (onVote) onVote();
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Vote transaction error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
    },
  });

  useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      setIsSubmitting(false);
      toast({
        title: 'Success',
        description: 'Poll has been closed',
        status: 'success',
        duration: 5000,
      });
      if (onClose) onClose();
    },
    onError: (error) => {
      setIsSubmitting(false);
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

    setIsSubmitting(true);
    try {
      // Try gasless voting first
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      const nonce = await publicClient.readContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: DePollsABI,
        functionName: 'nonces',
        args: [address],
      });
      const types = {
        Vote: [
          { name: 'pollId', type: 'uint256' },
          { name: 'optionIndexes', type: 'uint256[]' },
          { name: 'nonce', type: 'uint256' }
        ]
      };
      const value = {
        pollId: BigInt(poll.id),
        optionIndexes: selectedOptions.map(i => BigInt(i)),
        nonce: nonce.toNumber()
      };

      try {
        const signature = await signer._signTypedData(DOMAIN, types, value);
        await relayVote(poll.id, selectedOptions, signature);
        toast({
          title: 'Success',
          description: 'Vote submitted successfully (gasless)',
          status: 'success',
          duration: 3000,
        });
        onVote();
      } catch (error) {
        console.warn('Gasless voting failed, falling back to normal transaction:', error);
        // Fall back to normal transaction
        await metaVote({
          args: [
            BigInt(poll.id),
            selectedOptions.map(i => BigInt(i)),
            v,
            r,
            s
          ],
        });
      }
    } catch (error) {
      console.error('Voting error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setSelectedOptions([]);
    }
  }, [poll.id, selectedOptions, signTypedData, metaVote, toast, publicClient, address]);

  const handleClose = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await closePoll({
        args: [BigInt(poll.id)],
      });
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error closing poll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 5000,
      });
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
              isLoading={isSubmitting}
              loadingText="Submitting vote..."
              w="full"
              size="lg"
              mt={4}
            >
              Vote
            </Button>
          )}

          {poll.creator === poll.currentUser && poll.isActive && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClose}
              isLoading={isClosing}
              loadingText="Closing poll..."
              w="full"
              size="lg"
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