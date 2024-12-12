import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  useToast,
  useColorModeValue,
  Switch,
  FormControl,
  FormLabel,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const CreatePoll = ({ onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState(['']);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  // Calculate deadline timestamp
  const getDeadlineTimestamp = () => {
    if (!deadline) return 0;
    return Math.floor(new Date(deadline).getTime() / 1000);
  };

  // Prepare contract write for poll creation
  const { config: createConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: [
      question,
      options.filter(opt => opt.trim() !== ''),
      getDeadlineTimestamp(),
      isMultipleChoice,
      hasWhitelist,
      whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr)),
    ],
    enabled: question.trim() !== '' && 
             options.filter(opt => opt.trim() !== '').length >= 2 &&
             getDeadlineTimestamp() > Math.floor(Date.now() / 1000),
  });

  const { write: createPoll, data: createData, isLoading: isCreating } = useContractWrite({
    ...createConfig,
    onSuccess: () => {
      toast({
        title: 'Creating Poll',
        description: 'Your poll is being created...',
        status: 'info',
        duration: null,
        id: 'creating-poll',
      });
    },
  });

  const { isLoading: isWaitingCreate } = useWaitForTransaction({
    hash: createData?.hash,
    onSuccess: () => {
      toast.close('creating-poll');
      toast({
        title: 'Success!',
        description: 'Your poll has been created.',
        status: 'success',
        duration: 5000,
      });
      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setDeadline('');
      setIsMultipleChoice(false);
      setHasWhitelist(false);
      setWhitelistedAddresses(['']);
      if (onPollCreated) {
        onPollCreated();
      }
    },
  });

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddWhitelistAddress = () => {
    setWhitelistedAddresses([...whitelistedAddresses, '']);
  };

  const handleRemoveWhitelistAddress = (index) => {
    if (whitelistedAddresses.length <= 1) return;
    const newAddresses = [...whitelistedAddresses];
    newAddresses.splice(index, 1);
    setWhitelistedAddresses(newAddresses);
  };

  const handleWhitelistAddressChange = (index, value) => {
    const newAddresses = [...whitelistedAddresses];
    newAddresses[index] = value;
    setWhitelistedAddresses(newAddresses);
  };

  const handleCreatePoll = () => {
    if (!createPoll) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields correctly.',
        status: 'error',
        duration: 5000,
      });
      return;
    }
    createPoll?.();
  };

  const isLoading = isCreating || isWaitingCreate;

  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      p={6}
      bg={bgColor}
      borderColor={borderColor}
      shadow="sm"
    >
      <VStack spacing={6} align="stretch">
        {/* Question */}
        <FormControl isRequired>
          <FormLabel>Question</FormLabel>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            resize="vertical"
            disabled={isLoading}
          />
        </FormControl>

        {/* Options */}
        <FormControl isRequired>
          <FormLabel>Options</FormLabel>
          <VStack spacing={3} align="stretch">
            {options.map((option, index) => (
              <HStack key={index}>
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={isLoading}
                />
                {index >= 2 && (
                  <IconButton
                    icon={<CloseIcon />}
                    onClick={() => handleRemoveOption(index)}
                    variant="ghost"
                    colorScheme="red"
                    disabled={isLoading}
                  />
                )}
              </HStack>
            ))}
            <Button
              leftIcon={<AddIcon />}
              onClick={handleAddOption}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              Add Option
            </Button>
          </VStack>
        </FormControl>

        <Divider />

        {/* Settings */}
        <HStack spacing={8} wrap="wrap">
          {/* Deadline */}
          <FormControl isRequired flex="1" minW="200px">
            <FormLabel>Deadline</FormLabel>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              disabled={isLoading}
            />
          </FormControl>

          {/* Multiple Choice */}
          <FormControl display="flex" alignItems="center" flex="1" minW="200px">
            <FormLabel mb="0">Allow Multiple Choices</FormLabel>
            <Switch
              isChecked={isMultipleChoice}
              onChange={(e) => setIsMultipleChoice(e.target.checked)}
              disabled={isLoading}
            />
          </FormControl>
        </HStack>

        <Divider />

        {/* Whitelist */}
        <FormControl>
          <HStack justify="space-between" mb={4}>
            <FormLabel mb="0">Enable Whitelist</FormLabel>
            <Switch
              isChecked={hasWhitelist}
              onChange={(e) => setHasWhitelist(e.target.checked)}
              disabled={isLoading}
            />
          </HStack>
          
          {hasWhitelist && (
            <VStack spacing={3} align="stretch">
              {whitelistedAddresses.map((address, index) => (
                <HStack key={index}>
                  <Input
                    value={address}
                    onChange={(e) => handleWhitelistAddressChange(index, e.target.value)}
                    placeholder="0x..."
                    disabled={isLoading}
                  />
                  {index > 0 && (
                    <IconButton
                      icon={<CloseIcon />}
                      onClick={() => handleRemoveWhitelistAddress(index)}
                      variant="ghost"
                      colorScheme="red"
                      disabled={isLoading}
                    />
                  )}
                </HStack>
              ))}
              <Button
                leftIcon={<AddIcon />}
                onClick={handleAddWhitelistAddress}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              >
                Add Address
              </Button>
            </VStack>
          )}
        </FormControl>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            Voting is gasless! Users can vote without paying any gas fees.
          </Text>
        </Alert>

        {/* Create Button */}
        <Button
          colorScheme="brand"
          size="lg"
          onClick={handleCreatePoll}
          isLoading={isLoading}
          loadingText="Creating Poll..."
          disabled={
            !question.trim() ||
            options.filter(opt => opt.trim() !== '').length < 2 ||
            !deadline ||
            getDeadlineTimestamp() <= Math.floor(Date.now() / 1000) ||
            (hasWhitelist && !whitelistedAddresses.every(addr => ethers.utils.isAddress(addr))) ||
            isLoading
          }
        >
          Create Poll
        </Button>
      </VStack>
    </Box>
  );
};

export default CreatePoll; 