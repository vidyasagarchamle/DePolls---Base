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
        backgroundImage: props.colorMode === 'dark' 
          ? 'radial-gradient(circle at 1px 1px, #2D3748 1px, transparent 0)' 
          : 'radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)',
        backgroundSize: '40px 40px',
        transition: 'all 0.2s ease-in-out',
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
    Box: {
      baseStyle: {
        transition: 'all 0.2s ease-in-out',
      },
    },
    Text: {
      baseStyle: {
        transition: 'color 0.2s ease-in-out',
      },
    },
    Heading: {
      baseStyle: {
        transition: 'color 0.2s ease-in-out',
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
          },
        },
      },
      baseStyle: {
        _hover: {
          transform: 'translateY(-2px)',
          transition: 'all 0.2s',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: 'gray.200',
          boxShadow: 'sm',
          p: 6,
          _hover: {
            borderColor: 'brand.500',
            transform: 'translateY(-4px)',
            boxShadow: 'md',
            transition: 'all 0.2s',
          },
          transition: 'all 0.2s',
        },
      },
    },
    Alert: {
      variants: {
        subtle: {
          container: {
            bg: 'white',
            borderWidth: '1px',
            borderColor: 'gray.200',
            borderRadius: 'xl',
          },
        },
      },
      baseStyle: {
        container: {
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          bg: 'blackAlpha.600',
          backdropFilter: 'blur(4px)',
        },
        dialog: {
          bg: 'white',
          borderRadius: 'xl',
          boxShadow: 'xl',
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    Tooltip: {
      baseStyle: {
        bg: 'gray.800',
        color: 'white',
        borderRadius: 'md',
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 3,
        py: 1,
        textTransform: 'none',
        fontWeight: 'medium',
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'white',
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
    Checkbox: {
      baseStyle: {
        control: {
          borderColor: 'gray.300',
          _checked: {
            bg: 'brand.500',
            borderColor: 'brand.500',
          },
        },
      },
    },
    Radio: {
      baseStyle: {
        control: {
          borderColor: 'gray.300',
          _checked: {
            bg: 'brand.500',
            borderColor: 'brand.500',
          },
        },
      },
    },
  },
});

export default theme; 