import React from 'react';
import {
  Box,
  Flex,
  HStack,
  useColorMode,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import { Web3Button } from '@web3modal/react';
import Logo from './Logo';

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex={100}
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      backdropFilter="blur(10px)"
      backgroundColor={useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(26, 32, 44, 0.8)')}
    >
      <Flex
        h={16}
        alignItems="center"
        justifyContent="space-between"
        maxW="container.xl"
        mx="auto"
        px={4}
      >
        <Logo height="32px" />
        
        <HStack spacing={4}>
          <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            colorScheme="brand"
          />
          <Web3Button />
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar; 