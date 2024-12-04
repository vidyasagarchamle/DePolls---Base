import React from 'react';
import { Box, Flex, Button, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { useAccount, useBalance } from 'wagmi';
import { Web3Button } from '@web3modal/react';

const Navbar = () => {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
    token: process.env.REACT_APP_TOKEN_ADDRESS,
  });

  return (
    <Box bg={useColorModeValue('white', 'gray.800')} px={4} shadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Heading size="md" color="blue.500">DePolls</Heading>
        
        <Flex alignItems="center" gap={4}>
          {address && balance && (
            <Text fontSize="sm" color="gray.600">
              {parseFloat(balance?.formatted || '0').toFixed(2)} DPOLL
            </Text>
          )}
          <Web3Button />
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar; 