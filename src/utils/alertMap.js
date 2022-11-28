export const alertCodes = {
    FAQ: 1,
    WHAT_IS_ETH_TX: 2,
    HOW_ORDERS_ADDED: 3,
    CREATE_ORDER_MULTI_TX: 4,
    SELF_CUSTODY: 5,
    ORDER_LIVE: 6,
    HOW_BLOCKCHAIN_READ: 7
};

export const alertCodeMap = {
    [alertCodes.FAQ]: {
        label: 'Frequently asked questions',
        href: ''
    },
    [alertCodes.WHAT_IS_ETH_TX]: {
        label: 'What is an ethereum transaction?',
        href: ''
    },
    [alertCodes.HOW_ORDERS_ADDED]: {
        label: 'How are orders added in the smart contract?',
        href: ''
    },
    [alertCodes.CREATE_ORDER_MULTI_TX]: {
        label: 'Why does creating an order involve 2 ethereum transactions instead of 1?',
        href: ''
    },
    [alertCodes.SELF_CUSTODY]: {
        label: 'How does the smart contract implement self-custody of coins?',
        href: ''
    },
    [alertCodes.ORDER_LIVE]: {
        label: 'My order is live, what now?',
        href: ''
    },
    [alertCodes.HOW_BLOCKCHAIN_READ]: {
        label: 'How does Flyweight read the Ethereum blockchain?',
        href: ''
    }
};

export const emptyAlert = {
    variant: null,
    code: null,
    msgPrimary: null,
    msgSecondary: null
};

export const mapMetamaskErrorToMessage = errorReasonOrCode => {
    switch (errorReasonOrCode) {
        case 'user rejected transaction':
        case 'ACTION_REJECTED':
        return 'Transaction was cancelled';
    case -32002:
        return 'Please unlock Metamask to continue.';
    default:
        console.warn(`Unsuccessfully mapped metamask error to message: ${errorReasonOrCode}`);
        return `We're sorry, something went wrong`;
    }
};
