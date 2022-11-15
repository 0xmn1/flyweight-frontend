import './App.css';
import React from 'react';
import Big from 'big.js';
import { ethers } from 'ethers';

const ordersContractAddress = '0x4CE49b22BDB1f1f41a19160FF907530e62dD3912';
const ordersContractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"OrderExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"OrderTriggered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"string","name":"symbol","type":"string"},{"indexed":false,"internalType":"string","name":"oldPrice","type":"string"},{"indexed":false,"internalType":"string","name":"newPrice","type":"string"}],"name":"PriceUpdated","type":"event"},{"inputs":[{"internalType":"string","name":"tokenIn","type":"string"},{"internalType":"string","name":"tokenOut","type":"string"},{"internalType":"string","name":"tokenInTriggerPrice","type":"string"},{"internalType":"enum Flyweight.OrderTriggerDirection","name":"direction","type":"uint8"},{"internalType":"uint256","name":"tokenInAmount","type":"uint256"}],"name":"addNewOrder","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"orders","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum Flyweight.OrderState","name":"orderState","type":"uint8"},{"internalType":"string","name":"tokenIn","type":"string"},{"internalType":"string","name":"tokenOut","type":"string"},{"internalType":"string","name":"tokenInTriggerPrice","type":"string"},{"internalType":"enum Flyweight.OrderTriggerDirection","name":"direction","type":"uint8"},{"internalType":"uint256","name":"tokenInAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ordersCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"prices","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"price","type":"string"}],"internalType":"struct Flyweight.NewPriceItem[]","name":"newPriceItems","type":"tuple[]"},{"internalType":"uint256[]","name":"newTriggeredOrderIds","type":"uint256[]"}],"name":"storePricesAndProcessTriggeredOrderIds","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"tokenAddresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
const uniTokenAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const wethTokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
const erc20Abi = [{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"rawAmount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

let signer = null;
let ordersContract = null;
let uniTokenContract = null;
let wethTokenContract = null;

const tokenContracts = {
  UNI: null,
  WETH: null
};

const initContracts = () => {
  const signer = provider.getSigner();
  ordersContract = new ethers.Contract(ordersContractAddress, ordersContractAbi, signer);
  tokenContracts.UNI = new ethers.Contract(uniTokenAddress, erc20Abi, signer);
  tokenContracts.WETH = new ethers.Contract(wethTokenAddress, erc20Abi, signer);
};

const provider = new ethers.providers.Web3Provider(window.ethereum);
provider.send('eth_requestAccounts', [])
  .then(initContracts)
  .catch(console.error);

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      tokenInDecimalAmount: 0.001,
      tokenInSymbol: 'UNI',
      tokenOutSymbol: 'WETH',
      triggerDirection: 2,
      triggerPrice: '0.02'
    };
  }

  addOrder = async () => {
    const tokenInDecimals = await tokenContracts[this.state.tokenInSymbol].functions.decimals();
    const tokenOutDecimals = await tokenContracts[this.state.tokenOutSymbol].functions.decimals();
    const tokenInAmount = new Big(`${this.state.tokenInDecimalAmount}e${tokenInDecimals}`);
    const tokenInAmountStr = tokenInAmount.toString();

    console.log(this.state.tokenInSymbol);
    console.log(this.state.tokenOutSymbol);
    console.log(this.state.triggerPrice);
    console.log(this.state.triggerDirection);
    console.log(tokenInAmount.toString());

    try {
      const txNewOrder = await ordersContract.functions.addNewOrder(
        this.state.tokenInSymbol,
        this.state.tokenOutSymbol,
        this.state.triggerPrice,
        this.state.triggerDirection,
        tokenInAmountStr
      );

      const txNewOrderReceipt = await txNewOrder.wait();
      if (txNewOrderReceipt.status === 0) {
        throw txNewOrderReceipt;
      }

      alert('Order added successfully. You may now deposit coins into the contract for your order');

      const metamaskSigner = provider.getSigner();
      const txDeposit = await tokenContracts[this.state.tokenInSymbol]
        .transfer(ordersContractAddress, tokenInAmountStr);

      const txDepositReceipt = await txDeposit.wait();
      if (txDepositReceipt.status === 0) {
        throw txDepositReceipt;
      }

      alert('Coins deposited successfully. Your order is now live will be triggered when the conditions are met.');
    } catch (err) {
      console.error(err);
      alert('Sorry, something went wrong. Please try again');
    }
  };

  render() {
    return (
      <>
        <h1>New order</h1>
        <div>
          Swap
          <input type="number"
            placeholder="token in amount"
            value={this.state.tokenInDecimalAmount}
            onChange={e => this.setState(_ => ({ tokenInAmount: e.target.value }))}
            />
          <select value={this.state.tokenInSymbol}
            onChange={e => this.setState(_ => ({ tokenInSymbol: e.target.value }))}
            >
            <option value="UNI">UNI</option>
          </select>
          for
          <select value={this.state.tokenOutSymbol}
            onChange={e => this.setState(_ => ({ tokenOutSymbol: e.target.value }))}
            >
            <option value="WETH">WETH</option>
          </select>
          when price is
        </div>
        <div>
          <select value={this.state.triggerDirection}
            onChange={e => this.setState(_ => ({ triggerDirection: e.target.value }))}
            >
            <option value="2">above</option>
            <option value="1">equal to</option>
            <option value="0">below</option>
          </select>
        </div>
        <div>
          <input type="text"
            placeholder="trigger price for token in"
            value={this.state.triggerPrice}
            onChange={e => this.setState(_ => ({ triggerPrice: e.target.value }))}
            />
          <button type="button" onClick={this.addOrder}>Add order to smart contract</button>
        </div>
      </>
    );
  }
}

export default App;
