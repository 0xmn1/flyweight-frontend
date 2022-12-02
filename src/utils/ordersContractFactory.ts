import { Signer, ethers } from 'ethers';
import { alertSet, alertStore } from '../redux/alertStore';

import Big from 'big.js';
import { ContractFactory } from './ethersFactory';
import { connectionStore } from '../redux/connectionStore';
import erc20ContractAbi from './resources/abi-erc20-contract.json';
import literals from './resources/literals/english.json';
import { orderContractAddresses } from './networkMap';
import ordersContractAbi from './resources/abi-orders-smart-contract.json';
import { tryMetamaskOpAsync } from './providerAdapter';

export class Order {
  constructor(
    public tokenInDecimalAmount: number,
    public tokenInSymbol: string,
    public tokenOutSymbol: string,
    public triggerDirection: number,
    public triggerPrice: string,
  ) {
  }
}

export type OrderResponseDto = {
  id: { _hex: string },
  owner: string,
  tokenInAmount: { _hex: string },
  tokenIn: string,
  tokenInTriggerPrice: string,
  tokenOut: string,
  direction: number,
  orderState: number,
};

export class OrderResponse {
  constructor(
    public orderId: number,
    public anonOrderId: string,
    public tokenInAmount: string,
    public tokenIn: string,
    public tokenOut: string,
    public direction: string,
    public tokenInTriggerPrice: string,
    public orderState: string,
  ) {
  }
}

const setAlert = (variant: string, code: number, msgPrimary: string, msgSecondary: string | null) => {
  const alert = { variant, code, msgPrimary, msgSecondary };
  alertStore.dispatch(alertSet(alert));
};

export const addOrder = async (signer: Signer, order: Order) => {
  const contractAddress = orderContractAddresses[connectionStore.getState().networkId];
  const contract = ContractFactory.createOrdersWriteContract(contractAddress, ordersContractAbi, signer);
  const tokenInAddresses = await contract.functions.tryGetTokenAddress(order.tokenInSymbol);
  const tokenInAddress = tokenInAddresses[0];
  const tokenInContract = new ethers.Contract(tokenInAddress, erc20ContractAbi, signer);

  const tokenInDecimals = await tokenInContract.functions.decimals();
  const tokenInAmount = new Big(`${order.tokenInDecimalAmount}e${tokenInDecimals}`);
  const tokenInAmountStr = tokenInAmount.toString();

  await tryMetamaskOpAsync(async () => {
    setAlert('primary', 2, literals.CONFIRM_METAMASK_TX_STEP_1, literals.CONFIRM_METAMASK_TX_STEP_EXPLANATION);
    const txNewOrder = await contract.functions.addNewOrder(
      order.tokenInSymbol,
      order.tokenOutSymbol,
      order.triggerPrice,
      order.triggerDirection,
      tokenInAmountStr,
    );

    setAlert('info', 3, literals.TX_PROCESSING_1, literals.APPROVAL_T);
    const txNewOrderReceipt = await txNewOrder.wait();
    if (txNewOrderReceipt.status === 0) {
      throw txNewOrderReceipt;
    }

    setAlert('primary', 4, literals.CONFIRM_METAMASK_TX_STEP_2, literals.CONFIRM_METAMASK_TX_STEP_2_EXPLANATION);
    const txDeposit = await tokenInContract.transfer(contract.address, tokenInAmountStr);
    setAlert('info', 5, literals.FINALIZING, literals.TX_PROCESSING_2);
    const txDepositReceipt = await txDeposit.wait();
    if (txDepositReceipt.status === 0) {
      throw txDepositReceipt;
    }

    setAlert('success', 6, literals.ORDER_LIVE, literals.DEX);
  });
};
