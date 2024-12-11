import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

const Logo = ({ width = "150px", height = "40px" }) => {
  const gradientId = "depolls-gradient";
  const bgGradient = useColorModeValue(
    "linear(to-r, blue.400, purple.500)",
    "linear(to-r, blue.200, purple.300)"
  );

  return (
    <Box w={width} h={height}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 150 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'var(--chakra-colors-blue-400)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--chakra-colors-purple-500)' }} />
          </linearGradient>
        </defs>
        
        {/* Main Logo Shape - "D" with voting checkmark */}
        <path
          d="M20 5h15c5.523 0 10 4.477 10 10s-4.477 10-10 10H20V5z"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M28 15l4 4 6-6"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Text "ePolls" */}
        <text
          x="50"
          y="25"
          fontFamily="Outfit"
          fontSize="24"
          fontWeight="600"
          fill={`url(#${gradientId})`}
        >
          ePolls
        </text>
        
        {/* Decorative dots representing voting/polling */}
        <circle cx="140" cy="10" r="2" fill={`url(#${gradientId})`} />
        <circle cx="140" cy="20" r="2" fill={`url(#${gradientId})`} />
        <circle cx="140" cy="30" r="2" fill={`url(#${gradientId})`} />
      </svg>
    </Box>
  );
};

export default Logo; 