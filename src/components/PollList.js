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
  HStack,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  Flex,
  Tooltip,
  Skeleton,
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, CheckIcon } from '@chakra-ui/icons';
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
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

function PollList() {
  const { address } = useAccount();
  const toast = useToast();

  const { data: pollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPollCount',
    watch: true,
  });

  const { data: polls = [], isLoading: isLoadingPolls } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'getPolls',
    watch: true,
  });

  if (!address) {
    return (
      <Alert status="warning" variant="subtle" borderRadius="xl">
        <AlertIcon />
        Please connect your wallet to view and participate in polls.
      </Alert>
    );
  }

  if (isLoadingPolls) {
    return (
      <VStack spacing={4} w="full">
        <Heading size="lg" mb={4}>Active Polls</Heading>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="200px" w="full" borderRadius="xl" />
        ))}
      </VStack>
    );
  }

  const activePolls = polls.filter(poll => poll.isActive && new Date(Number(poll.deadline) * 1000) > new Date());

  if (activePolls.length === 0) {
    return (
      <Alert status="info" variant="subtle" borderRadius="xl">
        <AlertIcon />
        No active polls available. Create a new poll to get started!
      </Alert>
    );
  }

  return (
    <VStack spacing={6} w="full">
      <Heading size="lg">Active Polls</Heading>
      {activePolls.map((poll, index) => (
        <PollCard key={index} poll={poll} />
      ))}
    </VStack>
  );
}

const PollCard = ({ poll }) => {
  const { address } = useAccount();
  const toast = useToast();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isCreator = address?.toLowerCase() === poll.creator?.toLowerCase();
  const isExpired = new Date(Number(poll.deadline) * 1000) < new Date();

  const { data: hasVoted } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'hasVoted',
    args: [poll.id, address],
    watch: true,
    enabled: !!address,
  });

  const { config: voteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !hasVoted && !!address,
  });

  const { write: vote, isLoading: isVoting } = useContractWrite({
    ...voteConfig,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote',
        status: 'error',
        duration: 3000,
      });
    },
  });

  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: isCreator && poll.isActive,
  });

  const { write: closePoll, isLoading: isClosing } = useContractWrite({
    ...closeConfig,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Poll closed successfully',
        status: 'success',
        duration: 3000,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        status: 'error',
        duration: 3000,
      });
    },
  });

  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  return (
    <Box
      bg="gray.800"
      p={6}
      rounded="xl"
      shadow="xl"
      w="full"
      borderWidth={1}
      borderColor="gray.700"
      _hover={{ borderColor: 'brand.500', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
          <Heading size="md" color="whiteAlpha.900">{poll.question}</Heading>
          <Text fontSize="sm" color="whiteAlpha.700">
            Created by: <Code bg="gray.700" color="brand.300">{poll.creator}</Code>
          </Text>
        </VStack>
        <HStack spacing={2}>
          {isExpired ? (
            <Badge colorScheme="red" variant="subtle">Expired</Badge>
          ) : (
            <Badge colorScheme="green" variant="subtle">Active</Badge>
          )}
          {isCreator && (
            <Tooltip label="Close Poll">
              <IconButton
                icon={<DeleteIcon />}
                variant="ghost"
                colorScheme="red"
                size="sm"
                onClick={onOpen}
                isDisabled={!poll.isActive}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      <Text fontSize="sm" color="whiteAlpha.700" mb={4}>
        <TimeIcon mr={2} />
        Ends: {new Date(Number(poll.deadline) * 1000).toLocaleString()}
      </Text>

      {!hasVoted && !isExpired ? (
        <VStack align="stretch" spacing={4}>
          {poll.isMultipleChoice ? (
            <Stack spacing={3}>
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
                  colorScheme="brand"
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
              <Stack spacing={3}>
                {poll.options.map((option, index) => (
                  <Radio key={index} value={index.toString()} colorScheme="brand">
                    {option.text}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          <Button
            onClick={() => vote?.()}
            isLoading={isVoting}
            isDisabled={selectedOptions.length === 0}
            leftIcon={<CheckIcon />}
            size="lg"
            w="full"
          >
            Submit Vote
          </Button>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          {poll.options.map((option, index) => (
            <Box key={index}>
              <Flex justify="space-between" mb={1}>
                <Text color="whiteAlpha.900">{option.text}</Text>
                <Text color="whiteAlpha.700">
                  {Number(option.voteCount)} votes ({totalVotes > 0 ? ((Number(option.voteCount) / totalVotes) * 100).toFixed(1) : 0}%)
                </Text>
              </Flex>
              <Box
                w="full"
                h="8px"
                bg="gray.700"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  w={`${totalVotes > 0 ? (Number(option.voteCount) / totalVotes) * 100 : 0}%`}
                  h="full"
                  bg="brand.500"
                  transition="width 0.3s ease"
                />
              </Box>
            </Box>
          ))}
        </VStack>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader color="whiteAlpha.900">Close Poll</ModalHeader>
          <ModalBody>
            <Text color="whiteAlpha.800">
              Are you sure you want to close this poll? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => closePoll?.()}
              isLoading={isClosing}
            >
              Close Poll
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PollList; 