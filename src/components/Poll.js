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
} from '@chakra-ui/react';
import { TimeIcon, CheckIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const toast = useToast();
  const { address } = useAccount();

  const isExpired = poll.deadline * 1000 < Date.now();
  const hasVoted = poll.hasVoted;
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  const { config } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !hasVoted && !isExpired,
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
    if (hasVoted) {
      return <Badge colorScheme="green">Voted</Badge>;
    }
    return <Badge colorScheme="blue">Active</Badge>;
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={6}
      mb={4}
      bg="white"
      shadow="sm"
      width="100%"
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="start">
          <Heading size="md" color="gray.700">{poll.question}</Heading>
          {getStatusBadge()}
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

        {(hasVoted || isExpired) ? (
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

        {!hasVoted && !isExpired && (
          <Button
            colorScheme="brand"
            onClick={handleVote}
            isLoading={isVoting}
            isDisabled={selectedOptions.length === 0}
          >
            Submit Vote
          </Button>
        )}

        {hasVoted && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            You have voted in this poll
          </Alert>
        )}

        {isExpired && !hasVoted && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            This poll has ended
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default Poll; 