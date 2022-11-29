import { ethers } from 'ethers';
import Big from 'big.js';
import { createOrdersContract } from './ethersFactory';
import ordersContractAbi from './resources/abi-orders-smart-contract.json';
import erc20ContractAbi from './resources/abi-erc20-contract.json';
import { alertStore, alertSet } from '../redux/alertStore';
import { mapMetamaskErrorToMessage } from '../utils/alertMap';
import { connectionStore } from '../redux/connectionStore';
import { orderContractAddresses } from '../utils/networkMap';
import literals from './resources/literals/english.json';

const setAlert = (variant, code, msgPrimary, msgSecondary) => {
  const alert = { variant, code, msgPrimary, msgSecondary };
  alertStore.dispatch(alertSet(alert));
};

export const addOrder = async (signer, order) => {
  const contractAddress = orderContractAddresses[connectionStore.getState().networkId];
  const contract = createOrdersContract(contractAddress, ordersContractAbi, signer);
  const tokenInAddresses = await contract.functions.tryGetTokenAddress(order.tokenInSymbol);
  const tokenInAddress = tokenInAddresses[0];
  const tokenInContract = new ethers.Contract(tokenInAddress, erc20ContractAbi, signer);

  const tokenInDecimals = await tokenInContract.functions.decimals();
  const tokenInAmount = new Big(`${order.tokenInDecimalAmount}e${tokenInDecimals}`);
  const tokenInAmountStr = tokenInAmount.toString();

  try {
    setAlert(
      'primary',
      2,
      literals.CONFIRM_METAMASK_TX_STEP_1,
      literals.CONFIRM_METAMASK_TX_STEP_EXPLANATION,
    );

    const txNewOrder = await contract.functions.addNewOrder(
      order.tokenInSymbol,
      order.tokenOutSymbol,
      order.triggerPrice,
      order.triggerDirection,
      tokenInAmountStr,
    );

    setAlert(
      'info',
      3,
      literals.TX_PROCESSING_1,
      literals.APPROVAL_T,
    );

    const txNewOrderReceipt = await txNewOrder.wait();
    if (txNewOrderReceipt.status === 0) {
      throw txNewOrderReceipt;
    }

    setAlert(
      'primary',
      4,
      literals.CONFIRM_METAMASK_TX_STEP_2,
      literals.CONFIRM_METAMASK_TX_STEP_2_EXPLANATION,
    );

    const txDeposit = await tokenInContract.transfer(contract.address, tokenInAmountStr);

    setAlert(
      'info',
      5,
      literals.FINALIZING,
      literals.TX_PROCESSING_2,
    );

    const txDepositReceipt = await txDeposit.wait();
    if (txDepositReceipt.status === 0) {
      throw txDepositReceipt;
    }

    setAlert(
      'success',
      6,
      literals.ORDER_LIVE,
      literals.DEX,
    );
  } catch (err) {
    console.log(err);
    const msg = mapMetamaskErrorToMessage(err.reason);
    setAlert('secondary', 1, msg, null);
  }
};
