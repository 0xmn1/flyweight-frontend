import { Contract, Signer, ethers, providers } from 'ethers';

export const createNodeProvider = (networkName: string, apiKey: string): providers.AlchemyProvider =>
  new ethers.providers.AlchemyProvider(networkName, apiKey);

export const createMetamaskProvider = (window: any): providers.Web3Provider =>
  new ethers.providers.Web3Provider(window.ethereum);

export const createOrdersContract = (address: string, abi: string, providerOrSigner: providers.Provider | Signer): Contract =>
  new ethers.Contract(address, abi, providerOrSigner);
