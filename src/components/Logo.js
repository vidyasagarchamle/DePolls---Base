import React from 'react';
import { Box, Icon, useColorModeValue } from '@chakra-ui/react';

export const DePollsLogo = ({ size = "40px", ...props }) => {
  const accentColor = useColorModeValue('brand.500', 'brand.200');
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Background Circle */}
      <circle cx="20" cy="20" r="20" fill={bgColor} />
      
      {/* Main D shape */}
      <path
        d="M12 8h8c5.523 0 10 4.477 10 10s-4.477 10-10 10h-8V8z"
        fill={accentColor}
      />
      
      {/* Poll bars */}
      <rect x="16" y="14" width="12" height="2" rx="1" fill={bgColor} />
      <rect x="16" y="19" width="8" height="2" rx="1" fill={bgColor} />
      <rect x="16" y="24" width="10" height="2" rx="1" fill={bgColor} />
    </Box>
  );
};

export const TokenLogo = ({ size = "40px", ...props }) => {
  const accentColor = useColorModeValue('brand.500', 'brand.200');
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Background Circle */}
      <circle cx="20" cy="20" r="20" fill={bgColor} />
      
      {/* Token symbol */}
      <path
        d="M20 4c8.837 0 16 7.163 16 16s-7.163 16-16 16S4 28.837 4 20 11.163 4 20 4zm0 4c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 4c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8z"
        fill={accentColor}
      />
      
      {/* Poll indicator */}
      <path
        d="M20 16v8M16 20h8"
        stroke={bgColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Box>
  );
};

export default DePollsLogo; 