import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip,
  IconButton,
  Spinner,
  Progress,
  Divider,
} from '@chakra-ui/react';
import { DeleteIcon, ViewIcon, LockIcon, StarIcon, CheckIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useAccount, useWaitForTransaction } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const Poll = ({ poll, onVote }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showVoters, setShowVoters] = useState(false);
  const [voters, setVoters] = useState([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const votedBgColor = useColorModeValue('gray.50', 'gray.700');

  const isExpired = poll.deadline * 1000 < Date.now();
  const totalVotes = poll.options.reduce((sum, opt) => sum + Number(opt.voteCount), 0);

  // Vote functionality
  const { config: voteConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'vote',
    args: [poll.id, selectedOptions],
    enabled: selectedOptions.length > 0 && !poll.hasVoted && !isExpired,
  });

  const { write: vote, isLoading: isVoting, data: voteData } = useContractWrite({
    ...voteConfig,
    onSuccess: () => {
      toast({
        title: 'Vote Submitted',
        description: 'Your vote is being processed.',
        status: 'info',
        duration: null,
        id: 'voting',
      });
    },
  });

  const { isLoading: isWaitingVote } = useWaitForTransaction({
    hash: voteData?.hash,
    onSuccess: () => {
      toast.close('voting');
      toast({
        title: 'Success!',
        description: poll.rewardToken !== ethers.constants.AddressZero 
          ? 'Your vote has been recorded. You can now claim your reward!'
          : 'Your vote has been recorded.',
        status: 'success',
        duration: 5000,
      });
      if (onVote) {
        onVote();
        setTimeout(() => onVote(), 2000);
        setTimeout(() => onVote(), 5000);
      }
    },
  });

  // Reward claiming functionality
  const { config: claimConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'claimReward',
    args: [poll.id],
    enabled: poll.hasVoted && 
            poll.rewardToken !== ethers.constants.AddressZero && 
            poll.rewardAmount.gt(0),
  });

  const { write: claimReward, isLoading: isClaimingReward, data: claimData } = useContractWrite({
    ...claimConfig,
    onSuccess: () => {
      toast({
        title: 'Claiming Reward',
        description: 'Your reward claim is being processed.',
        status: 'info',
        duration: null,
        id: 'claiming-reward',
      });
    },
  });

  const { isLoading: isWaitingClaim } = useWaitForTransaction({
    hash: claimData?.hash,
    onSuccess: () => {
      toast.close('claiming-reward');
      toast({
        title: 'Success!',
        description: 'Reward claimed successfully.',
        status: 'success',
        duration: 5000,
      });
    },
  });

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
    onSuccess: () => {
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being closed.',
        status: 'info',
        duration: null,
        id: 'closing-poll',
      });
    },
  });

  const { isLoading: isWaitingClose } = useWaitForTransaction({
    hash: closeData?.hash,
    onSuccess: () => {
      toast.close('closing-poll');
      toast({
        title: 'Success!',
        description: 'Poll closed successfully.',
        status: 'success',
        duration: 5000,
      });
      onClose();
      if (onVote) {
        onVote();
        setTimeout(() => onVote(), 2000);
        setTimeout(() => onVote(), 5000);
      }
    },
  });

  const isVoteLoading = isVoting || isWaitingVote;
  const isClaimLoading = isClaimingReward || isWaitingClaim;
  const isCloseLoading = isClosing || isWaitingClose;
  const isAnyTransactionPending = isVoteLoading || isClaimLoading || isCloseLoading;

  // Fetch voters for creator
  const fetchVoters = async () => {
    if (!poll.isCreator) return;
    
    setIsLoadingVoters(true);
    try {
      const contract = new ethers.Contract(
        POLLS_CONTRACT_ADDRESS,
        DePollsABI,
        new ethers.providers.Web3Provider(window.ethereum)
      );
      
      const voterList = await contract.getVoters(poll.id);
      setVoters(voterList);
    } catch (error) {
      console.error('Error fetching voters:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voter information',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoadingVoters(false);
    }
  };

  const handleOptionSelect = (index) => {
    if (poll.isMultipleChoice) {
      setSelectedOptions(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        }
        return [...prev, index];
      });
    } else {
      setSelectedOptions([index]);
    }
  };

  const handleVote = () => {
    if (!vote || isVoteLoading) return;
    if (selectedOptions.length === 0) {
      toast({
        title: 'Select Option',
        description: poll.isMultipleChoice 
          ? 'Please select at least one option to vote.'
          : 'Please select an option to vote.',
        status: 'warning',
        duration: 5000,
      });
      return;
    }
    vote();
  };

  const handleViewVoters = () => {
    setShowVoters(true);
    fetchVoters();
  };

  const renderPollStatus = () => {
    const badges = [];

    if (isExpired) {
      badges.push(
        <Badge key="expired" colorScheme="red">Expired</Badge>
      );
    } else if (poll.hasVoted) {
      badges.push(
        <Badge key="voted" colorScheme="green">
          <HStack spacing={1}>
            <CheckIcon />
            <Text>Voted</Text>
          </HStack>
        </Badge>
      );
    }

    if (poll.hasWhitelist) {
      badges.push(
        <Tooltip key="whitelist" label="Whitelisted Poll">
          <Badge colorScheme="purple">
            <HStack spacing={1}>
              <LockIcon />
              <Text>Whitelisted</Text>
            </HStack>
          </Badge>
        </Tooltip>
      );
    }

    if (poll.rewardToken !== ethers.constants.AddressZero) {
      badges.push(
        <Tooltip key="reward" label={`Reward: ${ethers.utils.formatEther(poll.rewardAmount)} tokens`}>
          <Badge colorScheme="yellow">
            <HStack spacing={1}>
              <StarIcon />
              <Text>Rewards</Text>
            </HStack>
          </Badge>
        </Tooltip>
      );
    }

    return (
      <HStack spacing={2}>
        {badges}
      </HStack>
    );
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      p={6}
      bg={bgColor}
      borderColor={borderColor}
      shadow="sm"
      width="100%"
      position="relative"
      transition="all 0.2s"
      _hover={{
        transform: isAnyTransactionPending ? 'none' : 'translateY(-2px)',
        shadow: 'md',
        borderColor: 'brand.500',
      }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="flex-start">
          <VStack align="start" spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color={textColor}>
              {poll.question}
            </Text>
            {renderPollStatus()}
          </VStack>
          
          {poll.isCreator && (
            <HStack>
              <Tooltip label="View Voters">
                <IconButton
                  icon={<ViewIcon />}
                  onClick={handleViewVoters}
                  variant="ghost"
                  isDisabled={isAnyTransactionPending}
                />
              </Tooltip>
              {poll.isActive && (
                <Tooltip label="Close Poll">
                  <IconButton
                    icon={<DeleteIcon />}
                    onClick={onOpen}
                    colorScheme="red"
                    variant="ghost"
                    isDisabled={isAnyTransactionPending}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </HStack>

        <Box>
          {poll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
            const isSelected = selectedOptions.includes(index);

            return (
              <Box
                key={index}
                mb={3}
                p={3}
                borderRadius="md"
                bg={isSelected ? votedBgColor : 'transparent'}
                borderWidth="1px"
                borderColor={isSelected ? 'brand.500' : borderColor}
                cursor={!poll.hasVoted && !isExpired ? 'pointer' : 'default'}
                onClick={() => !poll.hasVoted && !isExpired && handleOptionSelect(index)}
                transition="all 0.2s"
                _hover={{
                  borderColor: !poll.hasVoted && !isExpired ? 'brand.500' : undefined,
                }}
              >
                <VStack align="stretch" spacing={1}>
                  <HStack justify="space-between">
                    <Text color={textColor} fontWeight={isSelected ? 'medium' : 'normal'}>
                      {option.text}
                    </Text>
                    <Text color={mutedColor} fontSize="sm">
                      {option.voteCount} votes ({percentage.toFixed(1)}%)
                    </Text>
                  </HStack>
                  <Progress
                    value={percentage}
                    size="sm"
                    colorScheme="brand"
                    borderRadius="full"
                  />
                </VStack>
              </Box>
            );
          })}
        </Box>

        {!poll.hasVoted && !isExpired && (
          <Button
            onClick={handleVote}
            isLoading={isVoteLoading}
            loadingText="Submitting Vote..."
            isDisabled={isAnyTransactionPending || selectedOptions.length === 0}
            colorScheme="brand"
          >
            Submit Vote
          </Button>
        )}

        {poll.hasVoted && poll.rewardToken !== ethers.constants.AddressZero && (
          <Button
            onClick={() => claimReward?.()}
            isLoading={isClaimLoading}
            loadingText="Claiming Reward..."
            isDisabled={isAnyTransactionPending}
            colorScheme="yellow"
          >
            Claim Reward
          </Button>
        )}
      </VStack>

      {/* Voters Modal */}
      <Modal isOpen={showVoters} onClose={() => setShowVoters(false)} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Poll Voters</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isLoadingVoters ? (
              <VStack py={8}>
                <Spinner size="xl" color="brand.500" />
                <Text color={textColor}>Loading voters...</Text>
              </VStack>
            ) : voters.length > 0 ? (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color={textColor}>#</Th>
                    <Th color={textColor}>Wallet Address</Th>
                    {poll.hasWhitelist && <Th color={textColor}>Status</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {voters.map((voter, index) => (
                    <Tr key={voter}>
                      <Td color={textColor}>{index + 1}</Td>
                      <Td color={textColor}>
                        <Text isTruncated maxW="300px">
                          {voter}
                        </Text>
                      </Td>
                      {poll.hasWhitelist && (
                        <Td>
                          <Badge colorScheme="green">Whitelisted</Badge>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text color={textColor} textAlign="center" py={8}>
                No votes recorded yet
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setShowVoters(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Close Poll Modal */}
      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={!isCloseLoading}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Close Poll</ModalHeader>
          <ModalBody>
            <Text color={textColor}>
              Are you sure you want to close this poll? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isCloseLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => closePoll?.()}
              isLoading={isCloseLoading}
              loadingText="Closing..."
              isDisabled={isAnyTransactionPending}
            >
              Close Poll
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Poll; 