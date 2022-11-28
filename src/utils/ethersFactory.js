import { ethers } from 'ethers';

export const createNodeProvider = (networkName, apiKey) =>
    new ethers.providers.AlchemyProvider(networkName, apiKey);

export const createMetamaskProvider = window =>
    new ethers.providers.Web3Provider(window.ethereum);

export const createOrdersContract = (address, abi, providerOrSigner) =>
    new ethers.Contract(address, abi, providerOrSigner);
