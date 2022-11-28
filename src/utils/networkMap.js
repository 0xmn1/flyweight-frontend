export const networkNames = {
    '0x1': 'mainnet',
    '0x5': 'goerli'
};

export const nodeProviderPublicApiKeys = {
    '0x1': process.env.REACT_APP_PROVIDER_ALCHEMY_PUBLIC_API_KEY_MAINNET,
    '0x5': process.env.REACT_APP_PROVIDER_ALCHEMY_PUBLIC_API_KEY_GOERLI
};

export const blockExplorerUrls = {
    '0x1': process.env.REACT_APP_BLOCK_EXPLORER_TRANSACTION_URL_MAINNET,
    '0x5': process.env.REACT_APP_BLOCK_EXPLORER_TRANSACTION_URL_GOERLI
};