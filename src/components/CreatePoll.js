import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  VStack,
  HStack,
  useToast,
  Switch,
  Textarea,
  IconButton,
  useColorModeValue,
  Card,
  CardBody,
  Collapse,
  Flex,
  Text,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@chakra-ui/icons';
import { useContractWrite, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const CreatePoll = ({ onPollCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [whitelistAddresses, setWhitelistAddresses] = useState(['']);
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleWhitelistChange = (index, value) => {
    const newAddresses = [...whitelistAddresses];
    newAddresses[index] = value;
    setWhitelistAddresses(newAddresses);
  };

  const handleAddWhitelist = () => {
    setWhitelistAddresses([...whitelistAddresses, '']);
  };

  const handleRemoveWhitelist = (index) => {
    if (whitelistAddresses.length > 1) {
      const newAddresses = whitelistAddresses.filter((_, i) => i !== index);
      setWhitelistAddresses(newAddresses);
    }
  };

  const getValidOptions = () => {
    return options.filter(opt => opt.trim() !== '');
  };

  const getValidWhitelist = () => {
    return whitelistAddresses.filter(addr => addr.trim() !== '');
  };

  const isFormValid = () => {
    const validOptions = getValidOptions();
    const validWhitelist = getValidWhitelist();
    return (
      question.trim() !== '' &&
      validOptions.length >= 2 &&
      (!hasWhitelist || validWhitelist.length > 0)
    );
  };

  const { write: createPoll, data: createPollData, isLoading: isWriteLoading } = useContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
  });

  const { isLoading: isWaitingForTx } = useWaitForTransaction({
    hash: createPollData?.hash,
    onSuccess() {
      toast({
        title: 'Success',
        description: 'Poll created successfully!',
        status: 'success',
        duration: 5000,
      });
      resetForm();
      setIsExpanded(false);
      if (onPollCreated) {
        onPollCreated();
      }
    },
    onError(error) {
      console.error('Transaction error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    try {
      setIsSubmitting(true);
      const validOptions = getValidOptions();
      const validWhitelist = hasWhitelist ? getValidWhitelist() : [];
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60); // 7 days from now

      const result = await createPoll({
        args: [
          question,
          validOptions,
          isMultipleChoice,
          hasWhitelist,
          validWhitelist,
          deadline,
        ],
      });

      if (!result) {
        throw new Error('Failed to create poll');
      }

      console.log('Create poll transaction:', result);
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    setHasWhitelist(false);
    setWhitelistAddresses(['']);
    setTouched({});
  };

  return (
    <Card 
      bg={bgColor} 
      borderColor={borderColor} 
      borderWidth="1px" 
      borderRadius="xl"
      transition="all 0.2s"
      _hover={!isExpanded ? {
        borderColor: 'brand.500',
        shadow: 'md',
      } : {}}
    >
      <CardBody p={0}>
        <Box
          as="button"
          width="full"
          onClick={() => {
            if (isExpanded) {
              resetForm();
            }
            setIsExpanded(!isExpanded);
          }}
          p={6}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          _hover={!isExpanded ? {
            bg: hoverBg,
          } : {}}
          transition="all 0.2s"
          borderRadius="xl"
        >
          <HStack spacing={3}>
            <Box
              bg={isExpanded ? 'brand.500' : 'gray.100'}
              color={isExpanded ? 'white' : 'gray.600'}
              p={2}
              borderRadius="lg"
              transition="all 0.2s"
            >
              <AddIcon boxSize="4" />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="sm" color={textColor}>
                {isExpanded ? 'Create New Poll' : 'Start a New Poll'}
              </Heading>
              {!isExpanded && (
                <Text fontSize="sm" color={mutedColor}>
                  Click to create a poll and gather community opinions
                </Text>
              )}
            </VStack>
          </HStack>
          {isExpanded ? (
            <ChevronUpIcon boxSize={6} color={mutedColor} />
          ) : (
            <ChevronDownIcon boxSize={6} color={mutedColor} />
          )}
        </Box>

        <Collapse in={isExpanded} animateOpacity>
          <Divider borderColor={borderColor} />
          <Box p={6}>
            <form onSubmit={handleCreatePoll}>
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
                    disabled={isSubmitting}
                    maxLength={200}
                    borderRadius="lg"
                    bg={inputBg}
                    color={textColor}
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
                          disabled={isSubmitting}
                          bg={inputBg}
                          color={textColor}
                        />
                        {options.length > 2 && (
                          <IconButton
                            icon={<CloseIcon />}
                            onClick={() => handleRemoveOption(index)}
                            disabled={isSubmitting}
                            variant="ghost"
                            colorScheme="red"
                            aria-label="Remove option"
                          />
                        )}
                      </HStack>
                    ))}
                  </VStack>
                  {touched.options && getValidOptions().length < 2 && (
                    <FormHelperText color="red.500">
                      At least two valid options are required
                    </FormHelperText>
                  )}
                  {options.length < 10 && (
                    <Button
                      onClick={handleAddOption}
                      mt={2}
                      size="sm"
                      variant="ghost"
                      leftIcon={<AddIcon />}
                      disabled={isSubmitting}
                    >
                      Add Option
                    </Button>
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      colorScheme="brand"
                      size="lg"
                    />
                  </HStack>
                </FormControl>

                {hasWhitelist && (
                  <FormControl>
                    <FormLabel fontWeight="medium" color={textColor}>Whitelisted Addresses</FormLabel>
                    <VStack spacing={3} align="stretch">
                      {whitelistAddresses.map((address, index) => (
                        <HStack key={index}>
                          <Input
                            value={address}
                            onChange={(e) => handleWhitelistChange(index, e.target.value)}
                            placeholder="0x..."
                            disabled={isSubmitting}
                            bg={inputBg}
                            color={textColor}
                          />
                          {whitelistAddresses.length > 1 && (
                            <IconButton
                              icon={<CloseIcon />}
                              onClick={() => handleRemoveWhitelist(index)}
                              disabled={isSubmitting}
                              variant="ghost"
                              colorScheme="red"
                              aria-label="Remove address"
                            />
                          )}
                        </HStack>
                      ))}
                    </VStack>
                    <Button
                      onClick={handleAddWhitelist}
                      mt={2}
                      size="sm"
                      variant="ghost"
                      leftIcon={<AddIcon />}
                      disabled={isSubmitting}
                    >
                      Add Address
                    </Button>
                  </FormControl>
                )}

                <HStack spacing={4} justify="flex-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      resetForm();
                      setIsExpanded(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    size="lg"
                    isLoading={isSubmitting || isWriteLoading || isWaitingForTx}
                    loadingText="Creating Poll..."
                    disabled={!isFormValid() || isSubmitting || isWriteLoading || isWaitingForTx}
                  >
                    Create Poll
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Box>
        </Collapse>
      </CardBody>
    </Card>
  );
};

export default CreatePoll; 