interface NetworkMap {
  [key: string]: string
}

export const networkNames: NetworkMap = {
  '0x1': 'mainnet',
  '0x5': 'goerli',
};

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
