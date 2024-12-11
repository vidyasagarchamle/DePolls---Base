import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  IconButton,
  Switch,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAccount, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { DePollsABI, POLLS_CONTRACT_ADDRESS } from '../contracts/abis';

const CreatePoll = ({ onPollCreated }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { address } = useAccount();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isWeighted, setIsWeighted] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // 7 days from now in seconds
  const deadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

  // Filter out empty options
  const validOptions = options.map(opt => opt.trim()).filter(opt => opt !== '');

  const { config } = usePrepareContractWrite({
    address: POLLS_CONTRACT_ADDRESS,
    abi: DePollsABI,
    functionName: 'createPoll',
    args: [question.trim(), validOptions, deadline, isWeighted, isMultipleChoice],
    enabled: question.trim() !== '' && validOptions.length >= 2,
  });

  const { write: createPoll, data } = useContractWrite({
    ...config,
    onSuccess: () => {
      toast({
        title: 'Transaction Submitted',
        description: 'Your poll is being created.',
        status: 'info',
        duration: null,
        id: 'creating-poll',
      });
    },
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
    onSuccess: () => {
      toast.close('creating-poll');
      toast({
        title: 'Success!',
        description: 'Your poll has been created successfully.',
        status: 'success',
        duration: 5000,
      });
      resetForm();
      if (onPollCreated) {
        onPollCreated();
        // Call again after a delay to ensure we catch the update
        setTimeout(onPollCreated, 2000);
      }
    },
    onError: () => {
      toast.close('creating-poll');
      toast({
        title: 'Error',
        description: 'Failed to create poll. Please try again.',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    setIsWeighted(false);
    onClose();
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

  const handleSubmit = () => {
    if (!createPoll) return;
    if (question.trim() === '') {
      toast({
        title: 'Error',
        description: 'Please enter a question',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    if (validOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'Please add at least 2 options',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    createPoll();
  };

  if (!address) {
    return (
      <Box
        p={6}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="1px"
        borderColor={borderColor}
        textAlign="center"
      >
        <Text fontSize="lg" fontWeight="medium" color={textColor} mb={2}>
          Create New Poll
        </Text>
        <Text color={mutedTextColor} mb={4}>
          Connect your wallet to create a new poll
        </Text>
        <Button isDisabled>Create Poll</Button>
      </Box>
    );
  }

  return (
    <Box
      p={6}
      bg={bgColor}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      textAlign="center"
    >
      <Text fontSize="lg" fontWeight="medium" color={textColor} mb={2}>
        Create New Poll
      </Text>
      <Text color={mutedTextColor} mb={4}>
        Create a new poll and let the community vote
      </Text>
      <Button onClick={onOpen}>Create Poll</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor} borderRadius="xl">
          <ModalHeader color={textColor}>Create New Poll</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color={textColor}>Question</FormLabel>
                <Input
                  placeholder="Enter your question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  bg={bgColor}
                  color={textColor}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={textColor}>Options (2-5)</FormLabel>
                <VStack spacing={2}>
                  {options.map((option, index) => (
                    <HStack key={index} width="full">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        bg={bgColor}
                        color={textColor}
                      />
                      {options.length > 2 && (
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={() => removeOption(index)}
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Remove option"
                        />
                      )}
                    </HStack>
                  ))}
                  {options.length < 5 && (
                    <Button
                      leftIcon={<AddIcon />}
                      onClick={addOption}
                      size="sm"
                      variant="ghost"
                      width="full"
                    >
                      Add Option
                    </Button>
                  )}
                </VStack>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" color={textColor}>Allow Multiple Choices</FormLabel>
                <Switch
                  colorScheme="brand"
                  isChecked={isMultipleChoice}
                  onChange={(e) => setIsMultipleChoice(e.target.checked)}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" color={textColor}>Enable Token Weighting</FormLabel>
                <Switch
                  colorScheme="brand"
                  isChecked={isWeighted}
                  onChange={(e) => setIsWeighted(e.target.checked)}
                />
              </FormControl>

              <Button
                width="full"
                onClick={handleSubmit}
                isLoading={isLoading}
                loadingText="Creating Poll..."
              >
                Create Poll
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CreatePoll; 