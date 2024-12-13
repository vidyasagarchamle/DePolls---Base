import React from 'react';
import { Container, VStack } from '@chakra-ui/react';
import { PollList } from './components';

function App() {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <PollList />
      </VStack>
    </Container>
  );
}

export default App; 