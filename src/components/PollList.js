import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Progress,
  RadioGroup,
  Radio,
  Checkbox,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DePollsABI } from '../contracts/abis';
import { Bar } from 'react-chartjs-2';
import { ethers } from 'ethers';
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

// Hardcode the contract address for now
const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

// Helper function to create getPoll calldata
const getPollCalldata = (pollId) => {
  const iface = new ethers.utils.Interface(DePollsABI);
  return iface.encodeFunctionData('getPoll', [pollId]);
};

// Helper function to decode poll data
const decodePollData = (data) => {
  const iface = new ethers.utils.Interface(DePollsABI);
  const decoded = iface.decodeFunctionResult('getPoll', data);
  
  return {
    id: decoded.id.toNumber(),
    creator: decoded.creator,
    question: decoded.question,
    deadline: decoded.deadline.toNumber(),
    isWeighted: decoded.isWeighted,
    isMultipleChoice: decoded.isMultipleChoice,
    isActive: decoded.isActive,
    options: decoded.options.map(opt => ({
      text: opt.text,
      voteCount: opt.voteCount.toNumber()
    }))
  };
};

const PollCard = ({ poll }) => {
  const { address } = useAccount();
  const toast = useToast();
  const [selectedOptions, setSelectedOptions] = useState([]);

  const { data: hasVoted } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'hasVoted',
    args: [poll.id, address],
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

  const totalVotes = poll.options.reduce((sum, opt) => sum + parseInt(opt.voteCount), 0);

  const chartData = {
    labels: poll.options.map(opt => opt.text),
    datasets: [
      {
        label: 'Votes',
        data: poll.options.map(opt => opt.voteCount),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const isExpired = new Date(poll.deadline * 1000) < new Date();

  return (
    <Box bg="white" p={6} rounded="lg" shadow="sm" w="full">
      <Heading size="md" mb={4}>{poll.question}</Heading>
      <Text color="gray.600" mb={4}>
        Deadline: {new Date(poll.deadline * 1000).toLocaleString()}
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
          <Bar data={chartData} options={{ maintainAspectRatio: false }} />
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

  const { data: pollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
    watch: true,
  });

  const { data: poll0 } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPoll',
    args: [0],
    enabled: pollCount && pollCount > 0,
  });

  useEffect(() => {
    const loadPolls = async () => {
      if (!pollCount) return;
      
      try {
        const pollsData = [];
        for (let i = 0; i < pollCount; i++) {
          const result = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_call&to=${POLLS_CONTRACT_ADDRESS}&data=${getPollCalldata(i)}&tag=latest`);
          const data = await result.json();
          if (data.result) {
            pollsData.push(decodePollData(data.result));
          }
        }
        setPolls(pollsData.filter(poll => poll && poll.isActive));
      } catch (error) {
        console.error('Error loading polls:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPolls();
  }, [pollCount]);

  if (loading) {
    return (
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Active Polls</Heading>
        <Text>Loading polls...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Active Polls</Heading>
      {polls.length === 0 ? (
        <Text>No active polls found</Text>
      ) : (
        polls.map((poll, index) => (
          <PollCard key={poll.id} poll={poll} />
        ))
      )}
    </VStack>
  );
};

export default PollList; 