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
            transform: 'translateY(-2px)',
          },
          _active: {
            bg: 'brand.700',
          },
          transition: 'all 0.2s',
        },
        ghost: {
          color: 'whiteAlpha.900',
          _hover: {
            bg: 'whiteAlpha.200',
          },
        },
      },
    },
    Box: {
      baseStyle: {
        borderRadius: 'xl',
      },
    },
    Container: {
      baseStyle: {
        maxW: 'container.xl',
      },
    },
    Heading: {
      baseStyle: {
        color: 'whiteAlpha.900',
      },
    },
    Text: {
      baseStyle: {
        color: 'whiteAlpha.800',
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.800',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: 'gray.700',
          boxShadow: 'xl',
          p: 6,
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
            borderWidth: '1px',
            borderColor: 'gray.700',
            borderRadius: 'xl',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          bg: 'blackAlpha.800',
          backdropFilter: 'blur(5px)',
        },
        dialog: {
          bg: 'gray.800',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: 'gray.700',
          boxShadow: '2xl',
        },
      },
    },
    Tooltip: {
      baseStyle: {
        bg: 'gray.700',
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
      variants: {
        subtle: {
          bg: 'whiteAlpha.200',
          color: 'whiteAlpha.900',
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'gray.800',
            borderColor: 'gray.600',
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
          borderColor: 'gray.600',
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
          borderColor: 'gray.600',
          _checked: {
            bg: 'brand.500',
            borderColor: 'brand.500',
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'gray.800',
            borderColor: 'gray.600',
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
  },
});

export default theme; 