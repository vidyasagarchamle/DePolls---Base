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
  Progress,
  Container,
  Skeleton,
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, CheckIcon } from '@chakra-ui/icons';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DePollsABI } from '../contracts/abis';

const POLLS_CONTRACT_ADDRESS = "0x41395582EDE920Dcef10fea984c9A0459885E8eB";

function PollList() {
  const { address } = useAccount();
  const toast = useToast();

  const { data: pollCount } = useContractRead({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'pollCount',
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
      <Container maxW="container.lg" py={8}>
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          borderRadius="xl"
        >
          <AlertIcon boxSize="40px" mb={4} />
          <Heading size="md" mb={2}>Connect Your Wallet</Heading>
          <Text>Please connect your wallet to view and participate in polls</Text>
        </Alert>
      </Container>
    );
  }

  if (isLoadingPolls) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Active Polls</Heading>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="200px" borderRadius="xl" />
          ))}
        </VStack>
      </Container>
    );
  }

  const activePolls = polls.filter(poll => poll.isActive && new Date(Number(poll.deadline) * 1000) > new Date());

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Active Polls</Heading>
          <Badge colorScheme="brand" p={2} borderRadius="lg">
            Total Polls: {pollCount?.toString() || '0'}
          </Badge>
        </HStack>

        {activePolls.length === 0 ? (
          <Alert
            status="info"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            borderRadius="xl"
          >
            <AlertIcon boxSize="40px" mb={4} />
            <Heading size="md" mb={2}>No Active Polls</Heading>
            <Text>Create a new poll to get started!</Text>
          </Alert>
        ) : (
          <VStack spacing={6}>
            {activePolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </VStack>
        )}
      </VStack>
    </Container>
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
        description: 'Your vote has been recorded!',
        status: 'success',
        duration: 5000,
      });
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
        description: 'Poll has been closed successfully',
        status: 'success',
        duration: 5000,
      });
      onClose();
    },
  });

  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="xl"
      boxShadow="sm"
      borderWidth={1}
      borderColor="gray.200"
      _hover={{
        borderColor: 'brand.500',
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        transition: 'all 0.2s',
      }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
          <Heading size="md">{poll.question}</Heading>
          <Text fontSize="sm" color="gray.500">
            Created by: <Code>{poll.creator}</Code>
          </Text>
        </VStack>
        <HStack spacing={2}>
          {isExpired ? (
            <Badge colorScheme="red">Expired</Badge>
          ) : (
            <Badge colorScheme="green">Active</Badge>
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

      <HStack color="gray.600" mb={4}>
        <TimeIcon />
        <Text fontSize="sm">
          Ends: {new Date(Number(poll.deadline) * 1000).toLocaleString()}
        </Text>
      </HStack>

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
                  <Radio key={index} value={index.toString()}>
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
          >
            Submit Vote
          </Button>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          {poll.options.map((option, index) => (
            <Box key={index}>
              <Flex justify="space-between" mb={1}>
                <Text>{option.text}</Text>
                <Text color="gray.600">
                  {Number(option.voteCount)} votes ({totalVotes > 0 ? ((Number(option.voteCount) / totalVotes) * 100).toFixed(1) : 0}%)
                </Text>
              </Flex>
              <Progress
                value={totalVotes > 0 ? (Number(option.voteCount) / totalVotes) * 100 : 0}
                size="sm"
                colorScheme="brand"
                borderRadius="full"
              />
            </Box>
          ))}
          {hasVoted && (
            <Badge alignSelf="start" colorScheme="brand" variant="subtle">
              <CheckIcon mr={2} />
              You have voted
            </Badge>
          )}
        </VStack>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Close Poll</ModalHeader>
          <ModalBody>
            <Text>
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