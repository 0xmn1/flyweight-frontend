import { ethers } from 'ethers';
import Big from 'big.js';
import { createOrdersContract } from './ethersFactory';
import ordersContractAbi from '../orders-smart-contract-abi.json';
import erc20ContractAbi from '../erc20-contract-abi.json';
import { alertStore, alertSet } from '../redux/alertStore';
import { mapMetamaskErrorToMessage } from '../utils/alertMap';

const setAlert = (variant, code, msgPrimary, msgSecondary) => {
    const alert = { variant, code, msgPrimary, msgSecondary };
    alertStore.dispatch(alertSet(alert));
};

export const addOrder = async (signer, order) => {
    const contract = createOrdersContract(process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS, ordersContractAbi, signer);
    const tokenInAddresses = await contract.functions.tryGetTokenAddress(order.tokenInSymbol);
    const tokenOutAddresses = await contract.functions.tryGetTokenAddress(order.tokenOutSymbol);
    const tokenInAddress = tokenInAddresses[0];
    const tokenOutAddress = tokenOutAddresses[0];
    const tokenInContract = new ethers.Contract(tokenInAddress, erc20ContractAbi, signer);
    const tokenOutContract = new ethers.Contract(tokenOutAddress, erc20ContractAbi, signer);

    const tokenInDecimals = await tokenInContract.functions.decimals();
    const tokenOutDecimals = await tokenOutContract.functions.decimals();
    const tokenInAmount = new Big(`${order.tokenInDecimalAmount}e${tokenInDecimals}`);
    const tokenInAmountStr = tokenInAmount.toString();

    try {
        setAlert('primary', 2, 'Please confirm transaction [1] of [2] in metamask.', 'This will add your order to the ethereum smart contract. This transaction creates data and does not transfer any coins yet.');
        const txNewOrder = await contract.functions.addNewOrder(
            order.tokenInSymbol,
            order.tokenOutSymbol,
            order.triggerPrice,
            order.triggerDirection,
            tokenInAmountStr
        );

        setAlert('info', 3, 'Processing transaction, beep boop...', 'Awaiting network approval (ethereum blocks take ~15 secs, unless there is degen monkey nft minting going on, or something worse than monkeys..)');
        const txNewOrderReceipt = await txNewOrder.wait();
        if (txNewOrderReceipt.status === 0) {
            throw txNewOrderReceipt;
        }

        setAlert('primary', 4, 'Please confirm transaction [2] of [2] in metamask.', 'This allows you to deposit the coins for your order to automatically swap via uniswap. Users can cancel untriggered orders at any time to get their coins sent back');
        const txDeposit = await tokenInContract.transfer(process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS, tokenInAmountStr);

        setAlert('info', 5, 'Finalizing your order now, boop beep...', 'Awaiting network approval. Remember the bull market days when gas was 2000+ gwei? Wen zk sync token');
        const txDepositReceipt = await txDeposit.wait();
        if (txDepositReceipt.status === 0) {
            throw txDepositReceipt;
        }

        setAlert('success', 6, 'Neat! Your order is now live, and will be triggered when your conditions are met.', 'This is a decentralized protocol: users can refund coin deposits at any time, yay. Goodluck in the casino comrade (you may now close this box/browser tab)');
    } catch (err) {
        console.log(err);
        const msg = mapMetamaskErrorToMessage(err.reason);
        setAlert('secondary', 1, msg, null);
    }
};
