import React, { useState, useEffect } from 'react';
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
  Link,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon, TimeIcon, CheckIcon, LockIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction, useNetwork, useSwitchNetwork } from 'wagmi';
import { ethers } from 'ethers';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const CreatePoll = ({ onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState(['']);
  const [touched, setTouched] = useState({
    question: false,
    options: false,
    deadline: false,
    whitelist: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const isWrongNetwork = chain?.id !== 84532;

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.300');
  const inputBg = useColorModeValue('white', 'gray.700');

  // Calculate deadline timestamp
  const getDeadlineTimestamp = () => {
    if (!deadline) return BigInt(0);
    const deadlineDate = new Date(deadline).getTime() / 1000;
    const currentTime = Math.floor(Date.now() / 1000);
    return BigInt(Math.max(deadlineDate, currentTime + 300)); // At least 5 minutes in the future
  };

  // Get valid options (non-empty and unique)
  const getValidOptions = () => {
    const trimmedOptions = options.map(opt => opt.trim());
    const uniqueOptions = [...new Set(trimmedOptions)].filter(opt => opt !== '');
    return uniqueOptions;
  };

  // Check if form is valid
  const isFormValid = () => {
    const validOptions = getValidOptions();
    if (!question.trim() || validOptions.length < 2) return false;

    const deadlineTimestamp = getDeadlineTimestamp();
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    if (deadlineTimestamp <= currentTime) return false;

    if (hasWhitelist) {
      const validAddresses = whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr));
      if (validAddresses.length === 0) return false;
    }

    return true;
  };

  // Prepare contract arguments
  const getContractArgs = () => {
    const validOptions = getValidOptions();
    const validAddresses = hasWhitelist 
      ? whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr))
      : [];

    return [
      question.trim(),
      validOptions,
      getDeadlineTimestamp(),
      isMultipleChoice,
      hasWhitelist,
      validAddresses,
    ];
  };

  // Contract interaction setup
  const { config: createConfig, error: prepareError } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: getContractArgs(),
    enabled: isFormValid() && !isWrongNetwork,
    chainId: 84532,
  });

  const { write: createPoll, data: createData, isLoading: isCreating } = useContractWrite({
    ...createConfig,
    onSuccess: (data) => {
      toast({
        title: 'Creating Poll',
        description: 'Your poll is being created...',
        status: 'info',
        duration: null,
        id: 'creating-poll',
      });
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Contract write error:', error);
      let errorMessage = 'Failed to create poll';

      if (error.message.toLowerCase().includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      } else if (error.message.toLowerCase().includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    },
  });

  const { isLoading: isWaitingCreate } = useWaitForTransaction({
    hash: createData?.hash,
    onSuccess: () => {
      setIsSubmitting(false);
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
      setTouched({
        question: false,
        options: false,
        deadline: false,
        whitelist: false
      });
      // Notify parent
      if (onPollCreated) {
        onPollCreated();
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Transaction error:', error);
      toast({
        title: 'Error',
        description: 'Transaction failed. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleCreatePoll = async () => {
    if (!isFormValid()) {
      setTouched({
        question: true,
        options: true,
        deadline: true,
        whitelist: hasWhitelist
      });
      return;
    }

    try {
      if (!createPoll) {
        throw new Error('Create poll function not available');
      }
      setIsSubmitting(true);
      await createPoll();
    } catch (error) {
      setIsSubmitting(false);
      console.error('Create poll error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleAddOption = () => {
    if (options.length >= 5) return;
    setOptions(prev => [...prev, '']);
    setTouched(prev => ({ ...prev, options: true }));
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== index));
    setTouched(prev => ({ ...prev, options: true }));
  };

  const handleOptionChange = (index, value) => {
    setOptions(prev => prev.map((opt, i) => i === index ? value : opt));
    setTouched(prev => ({ ...prev, options: true }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleAddWhitelistAddress = () => {
    setWhitelistedAddresses(prev => [...prev, '']);
    setTouched(prev => ({ ...prev, whitelist: true }));
  };

  const handleRemoveWhitelistAddress = (index) => {
    if (whitelistedAddresses.length <= 1) return;
    setWhitelistedAddresses(prev => prev.filter((_, i) => i !== index));
    setTouched(prev => ({ ...prev, whitelist: true }));
  };

  const handleWhitelistAddressChange = (index, value) => {
    setWhitelistedAddresses(prev => prev.map((addr, i) => i === index ? value : addr));
    setTouched(prev => ({ ...prev, whitelist: true }));
  };

  return (
    <Card
      bg={bgColor}
      borderRadius="2xl"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      opacity={isSubmitting ? 0.7 : 1}
      pointerEvents={isSubmitting ? 'none' : 'auto'}
    >
      <CardHeader pb={0}>
        <Heading size="md" color={textColor}>Create a New Poll</Heading>
      </CardHeader>

      <CardBody>
        {isWrongNetwork && (
          <Alert status="warning" mb={6} borderRadius="lg">
            <AlertIcon />
            <Box>
              <Text>Please switch to Base Sepolia network to create polls.</Text>
              <Button
                size="sm"
                colorScheme="blue"
                mt={2}
                onClick={() => switchNetwork?.(84532)}
                rightIcon={<ExternalLinkIcon />}
              >
                Switch Network
              </Button>
            </Box>
          </Alert>
        )}

        <VStack spacing={6} align="stretch">
          <FormControl 
            isRequired 
            isInvalid={touched.question && !question.trim()}
          >
            <FormLabel fontWeight="medium" color={textColor}>Question</FormLabel>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onBlur={() => handleBlur('question')}
              placeholder="What would you like to ask?"
              resize="vertical"
              disabled={isSubmitting || isCreating || isWaitingCreate}
              maxLength={200}
              borderRadius="lg"
              bg={inputBg}
              color={textColor}
              _focus={{ borderColor: accentColor, boxShadow: 'none' }}
              minH="100px"
            />
            {touched.question && !question.trim() && (
              <FormHelperText color="red.500">
                Question is required
              </FormHelperText>
            )}
          </FormControl>

          <FormControl 
            isRequired 
            isInvalid={touched.options && getValidOptions().length < 2}
          >
            <FormLabel fontWeight="medium" color={textColor}>Options</FormLabel>
            <VStack spacing={3} align="stretch">
              {options.map((option, index) => (
                <HStack key={index}>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    onBlur={() => handleBlur('options')}
                    placeholder={`Option ${index + 1}`}
                    disabled={isSubmitting || isCreating || isWaitingCreate}
                    borderRadius="lg"
                    bg={inputBg}
                    color={textColor}
                    _focus={{ borderColor: accentColor, boxShadow: 'none' }}
                  />
                  {options.length > 2 && (
                    <IconButton
                      icon={<CloseIcon />}
                      onClick={() => handleRemoveOption(index)}
                      disabled={isSubmitting || isCreating || isWaitingCreate}
                      variant="ghost"
                      colorScheme="red"
                      size="sm"
                    />
                  )}
                </HStack>
              ))}
              {options.length < 5 && (
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddOption}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting || isCreating || isWaitingCreate}
                  color={accentColor}
                >
                  Add Option
                </Button>
              )}
            </VStack>
            {touched.options && getValidOptions().length < 2 && (
              <FormHelperText color="red.500">
                At least 2 different options are required
              </FormHelperText>
            )}
          </FormControl>

          <FormControl 
            isRequired 
            isInvalid={touched.deadline && (!deadline || getDeadlineTimestamp() <= BigInt(Math.floor(Date.now() / 1000)))}
          >
            <FormLabel fontWeight="medium" color={textColor}>Deadline</FormLabel>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              onBlur={() => handleBlur('deadline')}
              min={new Date(Date.now() + 300000).toISOString().slice(0, 16)}
              disabled={isSubmitting || isCreating || isWaitingCreate}
              borderRadius="lg"
              bg={inputBg}
              color={textColor}
              _focus={{ borderColor: accentColor, boxShadow: 'none' }}
            />
            {touched.deadline && !deadline && (
              <FormHelperText color="red.500">
                Deadline is required
              </FormHelperText>
            )}
            {touched.deadline && deadline && getDeadlineTimestamp() <= BigInt(Math.floor(Date.now() / 1000)) && (
              <FormHelperText color="red.500">
                Deadline must be at least 5 minutes in the future
              </FormHelperText>
            )}
          </FormControl>

          <FormControl>
            <HStack justify="space-between" spacing={4}>
              <Box>
                <FormLabel mb="0" color={textColor}>Multiple Choice</FormLabel>
                <FormHelperText color={mutedColor}>Allow selecting multiple options</FormHelperText>
              </Box>
              <Switch
                isChecked={isMultipleChoice}
                onChange={(e) => setIsMultipleChoice(e.target.checked)}
                disabled={isSubmitting || isCreating || isWaitingCreate}
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
                disabled={isSubmitting || isCreating || isWaitingCreate}
                colorScheme="brand"
                size="lg"
              />
            </HStack>
          </FormControl>

          {hasWhitelist && (
            <FormControl 
              isInvalid={touched.whitelist && hasWhitelist && whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr)).length === 0}
            >
              <FormLabel color={textColor} fontSize="sm">Whitelisted Addresses</FormLabel>
              <VStack spacing={3} align="stretch">
                {whitelistedAddresses.map((address, index) => (
                  <HStack key={index}>
                    <Input
                      value={address}
                      onChange={(e) => handleWhitelistAddressChange(index, e.target.value)}
                      onBlur={() => handleBlur('whitelist')}
                      placeholder="0x..."
                      disabled={isSubmitting || isCreating || isWaitingCreate}
                      isInvalid={touched.whitelist && address && !ethers.utils.isAddress(address)}
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
                        disabled={isSubmitting || isCreating || isWaitingCreate}
                        size="sm"
                      />
                    )}
                  </HStack>
                ))}
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddWhitelistAddress}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting || isCreating || isWaitingCreate}
                  color={accentColor}
                >
                  Add Address
                </Button>
              </VStack>
              {touched.whitelist && hasWhitelist && whitelistedAddresses.filter(addr => ethers.utils.isAddress(addr)).length === 0 && (
                <FormHelperText color="red.500">
                  At least one valid address is required for whitelist
                </FormHelperText>
              )}
            </FormControl>
          )}
        </VStack>

        <Button
          mt={6}
          colorScheme="brand"
          size="lg"
          isLoading={isSubmitting || isCreating || isWaitingCreate}
          loadingText={
            isWaitingCreate ? 'Creating Poll...' :
            isCreating ? 'Confirming Transaction...' :
            'Processing...'
          }
          onClick={handleCreatePoll}
          isDisabled={!isFormValid() || isWrongNetwork || isSubmitting}
          w="full"
        >
          Create Poll
        </Button>

        {prepareError && (
          <Alert status="error" borderRadius="lg" mt={4}>
            <AlertIcon />
            <Text>Error preparing transaction: {prepareError.message}</Text>
          </Alert>
        )}
      </CardBody>
    </Card>
  );
};

export default CreatePoll; 