import { alertSet, alertStore } from '../redux/alertStore';

import literals from './resources/literals/english.json';
import { mapMetamaskErrorToMessage } from './alertMap';
import { serializeError } from 'eth-rpc-errors';

const handleMetamaskError = (err: unknown): void => {
  console.log(err);
  const metamaskErr = serializeError(err);
  const msg = metamaskErr.code
    ? mapMetamaskErrorToMessage(metamaskErr.code)
    : literals.UNKNOWN_ERR;

  const alert = {
    variant: 'secondary',
    code: 1,
    msgPrimary: msg,
    msgSecondary: null
  };
  alertStore.dispatch(alertSet(alert));
};

export const tryMetamaskOpAsync = async (func: () => Promise<void>): Promise<boolean> => {
  try {
    await func;
    return true;
  } catch (err) {
    handleMetamaskError(err);
    return false;
  }
};
