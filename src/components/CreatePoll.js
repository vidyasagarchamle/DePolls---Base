import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Switch,
  IconButton,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DePollsABI } from '../contracts/abis';

const CreatePoll = () => {
  const { address } = useAccount();
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [isWeighted, setIsWeighted] = useState(false);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  const { config } = usePrepareContractWrite({
    address: process.env.REACT_APP_POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: [
      question,
      options.filter(opt => opt.trim() !== ''),
      Math.floor(new Date(deadline).getTime() / 1000),
      isWeighted,
      isMultipleChoice,
    ],
    enabled: Boolean(question && options.length >= 2 && deadline),
  });

  const { write: createPoll, isLoading } = useContractWrite(config);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      await createPoll?.();
      toast({
        title: 'Success',
        description: 'Poll created successfully',
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

  return (
    <Box bg="white" p={6} rounded="lg" shadow="sm">
      <Heading size="md" mb={6}>Create New Poll</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Question</FormLabel>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
            />
          </FormControl>

          {options.map((option, index) => (
            <HStack key={index}>
              <FormControl isRequired>
                <FormLabel>Option {index + 1}</FormLabel>
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
              </FormControl>
              {index >= 2 && (
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => handleRemoveOption(index)}
                  aria-label="Remove option"
                  mt={8}
                />
              )}
            </HStack>
          ))}

          <Button
            leftIcon={<AddIcon />}
            onClick={handleAddOption}
            size="sm"
            variant="ghost"
          >
            Add Option
          </Button>

          <FormControl isRequired>
            <FormLabel>Deadline</FormLabel>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Enable Token-Weighted Voting</FormLabel>
            <Switch
              isChecked={isWeighted}
              onChange={(e) => setIsWeighted(e.target.checked)}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Allow Multiple Choice</FormLabel>
            <Switch
              isChecked={isMultipleChoice}
              onChange={(e) => setIsMultipleChoice(e.target.checked)}
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isLoading}
            isDisabled={!createPoll || !address}
          >
            Create Poll
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default CreatePoll; 