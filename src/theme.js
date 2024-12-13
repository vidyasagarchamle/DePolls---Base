import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Outfit', sans-serif",
    body: "'Outfit', sans-serif",
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
    }),
  },
  colors: {
    brand: {
      50: '#e6f0ff',
      100: '#b3d1ff',
      200: '#80b3ff',
      300: '#4d94ff',
      400: '#1a75ff',
      500: '#0066ff',
      600: '#0052cc',
      700: '#003d99',
      800: '#002966',
      900: '#001433',
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: props => props.colorMode === 'dark' ? 'gray.800' : 'white',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: props => props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          boxShadow: 'lg',
          p: 6,
          _hover: {
            borderColor: 'brand.500',
            transform: 'translateY(-2px)',
            boxShadow: 'xl',
            transition: 'all 0.2s',
          },
          transition: 'all 0.2s',
        },
      },
    },
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
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          },
          _active: {
            bg: 'brand.700',
          },
          transition: 'all 0.2s',
        },
        ghost: {
          color: 'gray.600',
          _hover: {
            bg: 'gray.100',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    Alert: {
      variants: {
        subtle: {
          container: {
            borderWidth: '1px',
            borderColor: 'gray.200',
            borderRadius: 'xl',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: 'xl',
          boxShadow: 'xl',
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _hover: {
              borderColor: 'brand.500',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          borderColor: 'gray.300',
          _hover: {
            borderColor: 'brand.500',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
  },
});

export default theme; 