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
} from '@chakra-ui/react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DePollsABI } from '../contracts/abis';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

const PollCard = ({ poll }) => {
  const { address } = useAccount();
  const toast = useToast();
  const [selectedOptions, setSelectedOptions] = useState([]);

  const { data: hasVoted } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'hasVoted',
    args: [poll.id, address],
    watch: true,
  });

  const { config } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !hasVoted,
  });

  const { write: vote, isLoading } = useContractWrite(config);

  const handleVote = async () => {
    try {
      await vote?.();
      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);
  const isExpired = new Date(Number(poll.deadline) * 1000) < new Date();

  return (
    <Box bg="white" p={6} rounded="lg" shadow="sm" w="full">
      <Heading size="md" mb={4}>{poll.question}</Heading>
      <Text color="gray.600" mb={2}>
        Created by: <Code>{poll.creator}</Code>
      </Text>
      <Text color="gray.600" mb={4}>
        Deadline: {new Date(Number(poll.deadline) * 1000).toLocaleString()}
      </Text>

      {!hasVoted && !isExpired ? (
        <VStack align="stretch" spacing={4}>
          {poll.isMultipleChoice ? (
            <Stack>
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
              <Stack>
                {poll.options.map((option, index) => (
                  <Radio key={index} value={index.toString()}>
                    {option.text}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          <Button
            colorScheme="blue"
            onClick={handleVote}
            isLoading={isLoading}
            isDisabled={!vote || selectedOptions.length === 0}
          >
            Vote
          </Button>
        </VStack>
      ) : (
        <Box h="300px">
          <Bar data={{
            labels: poll.options.map(opt => opt.text),
            datasets: [{
              label: 'Votes',
              data: poll.options.map(opt => Number(opt.voteCount)),
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            }]
          }} options={{ maintainAspectRatio: false }} />
        </Box>
      )}

      <Text mt={4} color="gray.600">
        Total votes: {totalVotes}
      </Text>
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

  // Get individual poll data
  const pollIds = pollCount ? [...Array(Number(pollCount)).keys()] : [];
  const pollReads = pollIds.map(id => useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPoll',
    args: [id],
    watch: true,
  }));

  useEffect(() => {
    const updatePolls = () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Poll count:', pollCount ? pollCount.toString() : '0');
        
        const validPolls = pollReads
          .map(read => read.data)
          .filter(poll => poll && poll.isActive)
          .map(poll => ({
            ...poll,
            id: Number(poll.id),
            deadline: Number(poll.deadline),
            options: poll.options.map(opt => ({
              ...opt,
              voteCount: Number(opt.voteCount)
            }))
          }));

        console.log('Valid polls:', validPolls.length);
        console.log('Poll data:', validPolls);
        
        setPolls(validPolls);
      } catch (err) {
        console.error('Error updating polls:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      updatePolls();
    }
  }, [address, pollCount, ...pollReads.map(read => read.data)]);

  if (!address) {
    return (
      <Alert status="info">
        <AlertIcon />
        Please connect your wallet to view polls
      </Alert>
    );
  }

  if (loading) {
    return (
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Active Polls</Heading>
        <Text>Loading polls...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading polls: {error}
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Active Polls</Heading>
      <Text color="gray.600">Total polls created: {pollCount ? pollCount.toString() : '0'}</Text>
      
      {polls.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No active polls found. Create one!
        </Alert>
      ) : (
        polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))
      )}
    </VStack>
  );
};

export default PollList; 