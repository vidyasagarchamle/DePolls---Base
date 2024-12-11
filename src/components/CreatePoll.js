import React from 'react';
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
  Switch,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { useAccount } from 'wagmi';

const CreatePoll = ({ onPollCreated }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { address } = useAccount();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

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
              <FormControl>
                <FormLabel color={textColor}>Question</FormLabel>
                <Input placeholder="Enter your question" bg={bgColor} color={textColor} />
              </FormControl>

              <FormControl>
                <FormLabel color={textColor}>Options (one per line)</FormLabel>
                <Input
                  as="textarea"
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  height="100px"
                  bg={bgColor}
                  color={textColor}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" color={textColor}>Allow Multiple Choices</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" color={textColor}>Enable Token Weighting</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>

              <Button width="full" onClick={onClose}>
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