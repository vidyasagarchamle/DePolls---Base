import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'whiteAlpha.900',
      },
    },
  },
  colors: {
    brand: {
      50: '#f0e4ff',
      100: '#cbb2ff',
      200: '#a480ff',
      300: '#7c4dff',
      400: '#541aff',
      500: '#3b00e6',
      600: '#2d00b4',
      700: '#1f0082',
      800: '#110050',
      900: '#06001f',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        ghost: {
          _hover: {
            bg: 'whiteAlpha.200',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.800',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: 'gray.700',
          boxShadow: 'lg',
          _hover: {
            borderColor: 'brand.500',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s',
          },
        },
      },
    },
    Alert: {
      variants: {
        subtle: {
          container: {
            bg: 'gray.800',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'gray.800',
          borderRadius: 'xl',
        },
      },
    },
    Tooltip: {
      baseStyle: {
        bg: 'gray.700',
        color: 'white',
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 3,
        py: 1,
      },
    },
  },
});

export default theme; 