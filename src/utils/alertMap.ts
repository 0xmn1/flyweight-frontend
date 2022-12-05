interface AlertCodes {
  [key: string]: number
}

interface AlertCodeMap {
  [key: string]: {
    label: string,
    href: string
  }
}

export const alertCodes: AlertCodes = {
  FAQ: 1,
  WHAT_IS_ETH_TX: 2,
  HOW_ORDERS_ADDED: 3,
  CREATE_ORDER_MULTI_TX: 4,
  SELF_CUSTODY: 5,
  ORDER_LIVE: 6,
  HOW_BLOCKCHAIN_READ: 7,
  HOW_DEPOSIT_VERIFIED: 8,
};

export const alertCodeMap: AlertCodeMap = {
  [alertCodes.FAQ]: {
    label: 'Frequently asked questions',
    href: '',
  },
  [alertCodes.WHAT_IS_ETH_TX]: {
    label: 'What is an ethereum transaction?',
    href: '',
  },
  [alertCodes.HOW_ORDERS_ADDED]: {
    label: 'How are orders added in the smart contract?',
    href: '',
  },
  [alertCodes.CREATE_ORDER_MULTI_TX]: {
    label: 'Why does creating an order involve 2 ethereum transactions instead of 1?',
    href: '',
  },
  [alertCodes.SELF_CUSTODY]: {
    label: 'How does the smart contract implement self-custody of coins?',
    href: '',
  },
  [alertCodes.ORDER_LIVE]: {
    label: 'My order is live, what now?',
    href: '',
  },
  [alertCodes.HOW_BLOCKCHAIN_READ]: {
    label: 'How does Flyweight read the Ethereum blockchain?',
    href: '',
  },
  [alertCodes.HOW_DEPOSIT_VERIFIED]: {
    label: 'How does Flyweight verify on-chain deposits to the smart contract?',
    href: '',
  },
};

export const mapMetamaskErrorToMessage = (errorReasonOrCode: string | number) => {
  switch (errorReasonOrCode) {
    case 'user rejected transaction':
    case 'ACTION_REJECTED':
      return 'Transaction was cancelled';
    case -32002:
      return 'Please unlock Metamask to continue.';
    default:
      console.warn(`Unsuccessfully mapped metamask error to message: ${errorReasonOrCode}`);
      return `Operation cancelled.`;
  }
};
