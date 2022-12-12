interface NetworkMap {
  [key: string]: string
}

export const networkNames: NetworkMap = {
  '0x1': 'mainnet',
  '0x5': 'goerli',
};

/*
 * Seems to be common & well-accepted in web3 dev repos, for alchemy api keys to be public (e.g.: in client-side code).
 * Conclusion is that there is little consequence in worst case scenario (e.g.: if someone spams Alchemy & hits the rate
 * limit, a new api key can be easily "refreshed" or the metamask provider can be used).
 */
export const nodeProviderPublicApiKeys: NetworkMap = {
  '0x1': process.env.REACT_APP_PROVIDER_ALCHEMY_PUBLIC_API_KEY_MAINNET,
  '0x5': process.env.REACT_APP_PROVIDER_ALCHEMY_PUBLIC_API_KEY_GOERLI,
};

export const blockExplorerUrls: NetworkMap = {
  '0x1': process.env.REACT_APP_BLOCK_EXPLORER_TRANSACTION_URL_MAINNET,
  '0x5': process.env.REACT_APP_BLOCK_EXPLORER_TRANSACTION_URL_GOERLI,
};

export const orderContractAddresses: NetworkMap = {
  '0x1': process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS_MAINNET,
  '0x5': process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS_GOERLI,
};

export const confirmDepositUrls: NetworkMap = {
  '0x1': process.env.REACT_APP_CONFIRM_DEPOSIT_URL_MAINNET,
  '0x5': process.env.REACT_APP_CONFIRM_DEPOSIT_URL_GOERLI,
};
