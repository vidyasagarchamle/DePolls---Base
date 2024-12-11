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
        
        {/* Main Logo Shape - Abstract ballot box with checkmark */}
        <path
          d="M15 8h20c1.105 0 2 .895 2 2v20c0 1.105-.895 2-2 2H15c-1.105 0-2-.895-2-2V10c0-1.105.895-2 2-2z"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M13 15l8 8L33 11"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Text "DePolls" with custom styling */}
        <text
          x="45"
          y="27"
          fontFamily="Outfit"
          fontSize="24"
          fontWeight="600"
          letterSpacing="-0.5"
          fill={`url(#${gradientId})`}
        >
          DePolls
        </text>
        
        {/* Decorative elements */}
        <g opacity="0.6">
          <circle cx="140" cy="12" r="2" fill={`url(#${gradientId})`} />
          <circle cx="140" cy="20" r="2" fill={`url(#${gradientId})`} />
          <circle cx="140" cy="28" r="2" fill={`url(#${gradientId})`} />
        </g>
      </svg>
    </Box>
  );
};

export default Logo; 