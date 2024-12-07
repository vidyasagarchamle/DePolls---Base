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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import { TimeIcon, CheckIcon, ViewIcon, DeleteIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useContractRead, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote, showVoterDetails = false }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { address } = useAccount();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isExpired = poll.deadline * 1000 < Date.now();
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  // Close poll functionality
  const { config: closeConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'closePoll',
    args: [poll.id],
    enabled: poll.isCreator && poll.isActive,
  });

  const { write: closePoll, isLoading: isClosing, data: closeData } = useContractWrite({
    ...closeConfig,
    onMutate: () => {
      toast({
        title: 'Preparing to Delete Poll',
        description: 'Please confirm the transaction in your wallet.',
        status: 'info',
        duration: null,
        id: 'deleting-poll-prepare',
      });
    },
    onSuccess: () => {
      toast.close('deleting-poll-prepare');
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being deleted. Please wait for confirmation.',
        status: 'info',
        duration: null,
        id: 'deleting-poll',
      });
    },
    onError: (error) => {
      toast.close('deleting-poll-prepare');
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete poll',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { isLoading: isWaitingClose } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      toast.close('deleting-poll');
      toast({
        title: 'Success!',
        description: 'Your poll has been deleted successfully.',
        status: 'success',
        duration: 5000,
      });
      onClose();
      if (onVote) {
        setTimeout(() => {
          onVote();
        }, 2000); // Add a delay before refreshing
      }
    },
    onError: (error) => {
      toast.close('deleting-poll');
      toast({
        title: 'Error',
        description: 'Failed to delete poll. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleDelete = () => {
    onOpen(); // Open confirmation modal
  };

  const confirmDelete = () => {
    if (!closePoll) return;
    try {
      closePoll();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit transaction. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge colorScheme="red">Expired</Badge>;
    }
    if (poll.hasVoted) {
      return <Badge colorScheme="green">Voted</Badge>;
    }
    if (poll.isCreator) {
      return <Badge colorScheme="purple">Created by You</Badge>;
    }
    return <Badge colorScheme="blue">Active</Badge>;
  };

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={6}
        bg={bgColor}
        borderColor={borderColor}
        shadow="sm"
        width="100%"
        position="relative"
        transition="all 0.2s"
        _hover={{
          transform: 'translateY(-2px)',
          shadow: 'md',
        }}
      >
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="start">
            <Heading size="md" color="gray.700">{poll.question}</Heading>
            <HStack spacing={2}>
              {getStatusBadge()}
              {poll.isCreator && poll.isActive && (
                <Tooltip label="Delete Poll">
                  <IconButton
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    size="sm"
                    isLoading={isClosing || isWaitingClose}
                    onClick={handleDelete}
                    aria-label="Delete poll"
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>

          <HStack fontSize="sm" color="gray.500" spacing={4}>
            <Tooltip label={new Date(poll.deadline * 1000).toLocaleString()}>
              <HStack>
                <TimeIcon />
                <Text>
                  {isExpired ? 'Ended' : 'Ends'} {new Date(poll.deadline * 1000).toLocaleString()}
                </Text>
              </HStack>
            </Tooltip>
            <HStack>
              <CheckIcon />
              <Text>{totalVotes} votes</Text>
            </HStack>
          </HStack>

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
        </VStack>
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Delete Poll</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete this poll? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={confirmDelete}
              isLoading={isClosing || isWaitingClose}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Poll; 