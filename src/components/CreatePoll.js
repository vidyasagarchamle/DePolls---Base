import React, { useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  IconButton,
  useToast,
  Switch,
  Text,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Collapse,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const CreatePoll = ({ onPollCreated }) => {
  const { isOpen, onToggle } = useDisclosure();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isWeighted, setIsWeighted] = useState(false);
  const toast = useToast();

  // 7 days from now in seconds
  const deadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

  // Filter out empty options and trim whitespace
  const validOptions = options.map(opt => opt.trim()).filter(opt => opt !== '');

  const { config, error: prepareError } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: [question.trim(), validOptions, deadline, isWeighted, isMultipleChoice],
    enabled: question.trim() !== '' && validOptions.length >= 2,
  });

  const { write: createPoll, isLoading: isCreating, data } = useContractWrite({
    ...config,
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        status: 'error',
        duration: 5000,
      });
      console.error('Contract error:', error);
    },
  });

  const { isLoading: isWaiting } = useWaitForTransaction({
    hash: data?.hash,
    onSuccess: () => {
      toast({
        title: 'Poll Created!',
        description: 'Your poll has been created successfully.',
        status: 'success',
        duration: 5000,
      });
      resetForm();
      if (onPollCreated) {
        onPollCreated();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create poll. Please try again.',
        status: 'error',
        duration: 5000,
      });
      console.error('Transaction error:', error);
    },
  });

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    setIsWeighted(false);
    onToggle();
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createPoll) {
      if (prepareError) {
        toast({
          title: 'Error',
          description: prepareError.message || 'Failed to prepare transaction',
          status: 'error',
          duration: 5000,
        });
        console.error('Prepare error:', prepareError);
      }
      return;
    }

    toast({
      title: 'Creating Poll...',
      description: 'Please wait while your transaction is being processed.',
      status: 'info',
      duration: null,
      isClosable: false,
      id: 'creating-poll',
    });

    createPoll();
  };

  const isFormValid = question.trim() !== '' && validOptions.length >= 2;
  const isLoading = isCreating || isWaiting;

  return (
    <Card variant="outline" width="100%" mb={8}>
      <CardHeader p={4}>
        <HStack justify="space-between" onClick={onToggle} cursor="pointer" width="100%">
          <Heading size="md">Create New Poll</Heading>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </HStack>
      </CardHeader>
      <Collapse in={isOpen}>
        <CardBody pt={0}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Question</FormLabel>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter your question"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Options (2-5)</FormLabel>
                <VStack spacing={2} align="stretch">
                  {options.map((option, index) => (
                    <HStack key={index}>
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <Tooltip label="Remove Option">
                          <IconButton
                            icon={<DeleteIcon />}
                            onClick={() => removeOption(index)}
                            variant="ghost"
                            colorScheme="red"
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  ))}
                  {options.length < 5 && (
                    <Button
                      leftIcon={<AddIcon />}
                      onClick={addOption}
                      size="sm"
                      variant="ghost"
                    >
                      Add Option
                    </Button>
                  )}
                </VStack>
              </FormControl>

              <HStack justify="space-between" spacing={8}>
                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="multiple-choice"
                    isChecked={isMultipleChoice}
                    onChange={(e) => setIsMultipleChoice(e.target.checked)}
                    mr={2}
                  />
                  <FormLabel htmlFor="multiple-choice" mb={0}>
                    Multiple Choice
                  </FormLabel>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="weighted-voting"
                    isChecked={isWeighted}
                    onChange={(e) => setIsWeighted(e.target.checked)}
                    mr={2}
                  />
                  <FormLabel htmlFor="weighted-voting" mb={0}>
                    Weighted Voting
                  </FormLabel>
                </FormControl>
              </HStack>

              {prepareError && (
                <Text color="red.500" fontSize="sm">
                  {prepareError.message}
                </Text>
              )}

              <Button
                type="submit"
                colorScheme="brand"
                isLoading={isLoading}
                isDisabled={!isFormValid || !createPoll}
                loadingText={isWaiting ? 'Creating Poll...' : 'Preparing...'}
              >
                Create Poll
              </Button>
            </VStack>
          </form>
        </CardBody>
      </Collapse>
    </Card>
  );
};

export default CreatePoll; 