import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
} from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          borderRadius="xl"
          p={6}
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Something went wrong
          </AlertTitle>
          <AlertDescription maxWidth="sm" mb={4}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </AlertDescription>
          <VStack spacing={3}>
            <Button
              colorScheme="brand"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onRetry) {
                  this.props.onRetry();
                }
              }}
            >
              Try again
            </Button>
          </VStack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 