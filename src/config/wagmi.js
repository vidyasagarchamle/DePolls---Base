import { createConfig, configureChains } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { w3mConnectors, w3mProvider } from '@web3modal/ethereum';

const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;
const chains = [baseSepolia];

const { publicClient, webSocketPublicClient } = configureChains(
  chains,
  [
    w3mProvider({ projectId }),
    publicProvider()
  ],
  {
    pollingInterval: 2000,
    stallTimeout: 2000,
    retryCount: 5,
    retryDelay: 1000,
    batch: {
      multicall: true
    }
  }
);

export const config = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, version: '2', chains }),
  publicClient,
  webSocketPublicClient,
  syncConnectedChain: true,
  persister: null,
});

export const ethereumClient = new EthereumClient(config, chains); 