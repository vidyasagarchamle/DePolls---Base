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
  Container,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Divider,
  FormHelperText,
  Flex,
  Spacer,
  Tag,
  TagLabel,
  TagLeftIcon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon, TimeIcon, CheckIcon, LockIcon } from '@chakra-ui/icons';
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
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.300');
  const inputBg = useColorModeValue('white', 'gray.700');

  // Calculate deadline timestamp
  const getDeadlineTimestamp = () => {
    if (!deadline) return BigInt(0);
    return BigInt(Math.floor(new Date(deadline).getTime() / 1000));
  };

  // Prepare contract arguments
  const getContractArgs = () => {
    const validOptions = options.filter(opt => opt.trim() !== '');
    const validAddresses = hasWhitelist 
      ? whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr))
      : [];

    console.log('Contract args:', {
      question,
      validOptions,
      deadline: getDeadlineTimestamp().toString(),
      isMultipleChoice,
      hasWhitelist,
      validAddresses
    });

    return [
      question,
      validOptions,
      getDeadlineTimestamp(),
      isMultipleChoice,
      hasWhitelist,
      validAddresses,
    ];
  };

  // Check if form is valid
  const isFormValid = () => {
    const validOptions = options.filter(opt => opt.trim() !== '');
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const deadlineTime = getDeadlineTimestamp();

    const isValid = Boolean(
      question.trim() && 
      validOptions.length >= 2 &&
      deadlineTime > currentTime
    );

    console.log('Form validation:', {
      hasQuestion: Boolean(question.trim()),
      validOptionsCount: validOptions.length,
      deadline: deadlineTime.toString(),
      currentTime: currentTime.toString(),
      isValid
    });

    return isValid;
  };

  // Contract interaction setup
  const { config: createConfig } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: getContractArgs(),
    enabled: isFormValid(),
    onError: (error) => {
      console.error('Prepare error:', error);
    }
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
    onError: (error) => {
      console.error('Contract write error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
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
        // Call onPollCreated again after a delay to ensure the new poll is fetched
        setTimeout(() => onPollCreated(), 2000);
      }
    },
    onError: (error) => {
      console.error('Transaction error:', error);
      toast({
        title: 'Error',
        description: 'Transaction failed. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleAddOption = () => {
    if (options.length >= 5) return;
    setOptions(prev => [...prev, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    setOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  };

  const handleAddWhitelistAddress = () => {
    setWhitelistedAddresses(prev => [...prev, '']);
  };

  const handleRemoveWhitelistAddress = (index) => {
    if (whitelistedAddresses.length <= 1) return;
    setWhitelistedAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const handleWhitelistAddressChange = (index, value) => {
    setWhitelistedAddresses(prev => prev.map((addr, i) => i === index ? value : addr));
  };

  const validateForm = () => {
    const errors = [];
    if (!question.trim()) errors.push("Question is required");
    if (options.filter(opt => opt.trim() !== '').length < 2) errors.push("At least 2 options are required");
    if (!deadline) {
      errors.push("Deadline is required");
    } else {
      const deadlineDate = new Date(deadline).getTime();
      if (deadlineDate <= Date.now()) errors.push("Deadline must be in the future");
    }
    return errors;
  };

  const handleCreatePoll = async () => {
    if (!isFormValid()) {
      const errors = validateForm();
      toast({
        title: 'Validation Error',
        description: errors.join('\n'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      console.log('Creating poll with args:', getContractArgs());
      if (!createPoll) {
        throw new Error('Create poll function not available. Please make sure your wallet is connected.');
      }
      await createPoll();
    } catch (error) {
      console.error('Create poll error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const isLoading = isCreating || isWaitingCreate;

  // Log current form state for debugging
  console.log('Form state:', {
    hasQuestion: Boolean(question.trim()),
    hasValidOptions: options.filter(opt => opt.trim() !== '').length >= 2,
    hasValidDeadline: getDeadlineTimestamp() > BigInt(Math.floor(Date.now() / 1000)),
    canCreatePoll: Boolean(createPoll),
    contractArgs: getContractArgs(),
  });

  return (
    <Card
      bg={bgColor}
      borderRadius="2xl"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
    >
      <CardHeader pb={0}>
        <Heading size="md" color={textColor}>Create a New Poll</Heading>
      </CardHeader>

      <CardBody>
        <VStack spacing={6} align="stretch">
          <FormControl isRequired>
            <FormLabel fontWeight="medium" color={textColor}>Question</FormLabel>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              resize="vertical"
              disabled={isLoading}
              maxLength={200}
              borderRadius="lg"
              bg={inputBg}
              color={textColor}
              _focus={{ borderColor: accentColor, boxShadow: 'none' }}
              minH="100px"
            />
            <FormHelperText color={mutedColor}>
              {200 - question.length} characters remaining
            </FormHelperText>
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontWeight="medium" color={textColor}>Options</FormLabel>
            <VStack spacing={3} align="stretch">
              {options.map((option, index) => (
                <Flex key={index} gap={2}>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    disabled={isLoading}
                    maxLength={100}
                    borderRadius="lg"
                    bg={inputBg}
                    color={textColor}
                    _focus={{ borderColor: accentColor, boxShadow: 'none' }}
                  />
                  {index >= 2 && (
                    <IconButton
                      icon={<CloseIcon />}
                      onClick={() => handleRemoveOption(index)}
                      variant="ghost"
                      colorScheme="red"
                      disabled={isLoading}
                      aria-label="Remove option"
                      borderRadius="lg"
                    />
                  )}
                </Flex>
              ))}
              {options.length < 5 && (
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddOption}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  color={accentColor}
                  _hover={{ bg: useColorModeValue('brand.50', 'brand.900') }}
                >
                  Add Option
                </Button>
              )}
            </VStack>
            <FormHelperText color={mutedColor}>
              Add up to 5 options
            </FormHelperText>
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontWeight="medium" color={textColor}>Deadline</FormLabel>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date(Date.now() + 300000).toISOString().slice(0, 16)}
              disabled={isLoading}
              borderRadius="lg"
              bg={inputBg}
              color={textColor}
              _focus={{ borderColor: accentColor, boxShadow: 'none' }}
            />
            <FormHelperText color={mutedColor}>
              <TimeIcon mr={1} />
              Poll will automatically close at this time
            </FormHelperText>
          </FormControl>

          <Divider />

          <VStack spacing={4} align="stretch">
            <Heading size="sm" color={textColor} mb={2}>Poll Settings</Heading>
            
            <FormControl>
              <HStack justify="space-between" spacing={4}>
                <Box>
                  <FormLabel mb="0" color={textColor}>Multiple Choice</FormLabel>
                  <FormHelperText color={mutedColor}>Allow selecting multiple options</FormHelperText>
                </Box>
                <Switch
                  isChecked={isMultipleChoice}
                  onChange={(e) => setIsMultipleChoice(e.target.checked)}
                  disabled={isLoading}
                  colorScheme="brand"
                  size="lg"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between" spacing={4}>
                <Box>
                  <FormLabel mb="0" color={textColor}>Enable Whitelist</FormLabel>
                  <FormHelperText color={mutedColor}>Restrict voting to specific addresses</FormHelperText>
                </Box>
                <Switch
                  isChecked={hasWhitelist}
                  onChange={(e) => setHasWhitelist(e.target.checked)}
                  disabled={isLoading}
                  colorScheme="brand"
                  size="lg"
                />
              </HStack>
            </FormControl>

            {hasWhitelist && (
              <FormControl>
                <FormLabel color={textColor} fontSize="sm">Whitelisted Addresses</FormLabel>
                <VStack spacing={3} align="stretch">
                  {whitelistedAddresses.map((address, index) => (
                    <Flex key={index} gap={2}>
                      <Input
                        value={address}
                        onChange={(e) => handleWhitelistAddressChange(index, e.target.value)}
                        placeholder="0x..."
                        disabled={isLoading}
                        isInvalid={address && !ethers.utils.isAddress(address)}
                        borderRadius="lg"
                        bg={inputBg}
                        color={textColor}
                        _focus={{ borderColor: accentColor, boxShadow: 'none' }}
                      />
                      {index > 0 && (
                        <IconButton
                          icon={<CloseIcon />}
                          onClick={() => handleRemoveWhitelistAddress(index)}
                          variant="ghost"
                          colorScheme="red"
                          disabled={isLoading}
                          aria-label="Remove address"
                          borderRadius="lg"
                        />
                      )}
                    </Flex>
                  ))}
                  <Button
                    leftIcon={<AddIcon />}
                    onClick={handleAddWhitelistAddress}
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    color={accentColor}
                    _hover={{ bg: useColorModeValue('brand.50', 'brand.900') }}
                  >
                    Add Address
                  </Button>
                </VStack>
                <FormHelperText color={mutedColor}>
                  Only these addresses will be able to vote on this poll
                </FormHelperText>
              </FormControl>
            )}
          </VStack>

          <Button
            colorScheme="brand"
            onClick={handleCreatePoll}
            isLoading={isLoading}
            loadingText="Creating Poll..."
            disabled={!createPoll || isLoading}
            size="lg"
            borderRadius="xl"
            fontWeight="semibold"
            _hover={{
              transform: !isLoading ? 'translateY(-1px)' : undefined,
              boxShadow: !isLoading ? 'lg' : undefined,
            }}
            _active={{
              transform: 'translateY(0)',
              boxShadow: 'md',
            }}
          >
            Create Poll
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default CreatePoll; 