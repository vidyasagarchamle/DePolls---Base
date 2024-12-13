import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { WagmiConfig } from 'wagmi';
import { config } from './config/wagmi';

// Theme customization
const theme = extendTheme({
  colors: {
    brand: {
      50: '#E5F3FF',
      100: '#B8E1FF',
      200: '#8ACEFF',
      300: '#5CBAFF',
      400: '#2EA7FF',
      500: '#0093FF',
      600: '#0076CC',
      700: '#005899',
      800: '#003B66',
      900: '#001D33',
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
    }),
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </WagmiConfig>
  </React.StrictMode>
); 