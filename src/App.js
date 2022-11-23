'use strict';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React from 'react';
import Big from 'big.js';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import coinSymbols from './coin-symbols.json';
import ordersContractAbi from './orders-smart-contract-abi.json';
import erc20ContractAbi from './erc20-contract-abi.json';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

import Header from './components/Header';
import Banner from './components/Banner';
import FlyweightAlert from './components/FlyweightAlert';
import WelcomeCard from './components/WelcomeCard';
import OrdersCard from './components/OrdersCard';
import NewOrderCard from './components/NewOrderCard';
import PlainTextLoginModal from './components/PlainTextLoginModal';

const ordersContractAddress = '0xE58E94E87547A4FfE03f11Ee086adc31cEED3F03';
const blockExplorerTransactionUrl = 'https://goerli.etherscan.io/tx';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      orders: null,
      tokenInDecimalAmount: 0.001,
      tokenInSymbol: 'UNI',
      tokenOutSymbol: 'WETH',
      triggerDirection: 2,
      triggerPrice: '0.02',
      whitelistedCoinSymbols: [],
      metamaskEventsBound: false,
      isMetamaskProviderDetected: true,
      networkId: null,
      account: null,
      showManualLoginModal: false,
      manualLoginAddress: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522',
      manualLoginNetworkName: 'goerli',
      alertMsgPrimary: null,
      alertMsgSecondary: null,
      alertVariant: null,
      alertCode: null
    };

    this.orderDirectionMap = {
      0: '<',
      1: '=',
      2: '>'
    };

    this.orderStatusMap = {
      0: 'Untriggered',
      1: 'Executed',
      2: 'Cancelled'
    };

    this.alertCodeMap = {
      1: {
        label: 'Frequently asked questions',
        href: ''
      },
      2: {
        label: 'What is an ethereum transaction?',
        href: ''
      },
      3: {
        label: 'How are orders added in the smart contract?',
        href: ''
      },
      4: {
        label: 'Why does creating an order involve 2 ethereum transactions instead of 1?',
        href: ''
      },
      5: {
        label: 'How does the smart contract implement self-custody of coins?',
        href: ''
      },
      6: {
        label: 'My order is live, what now?',
        href: ''
      },
      7: {
        label: 'How does Flyweight read the Ethereum blockchain?',
        href: ''
      }
    };

    this.decimalsMap = {};
  }

  async componentDidMount() {
    await this.setWhitelistedCoinSymbols();

    const isMetamaskProviderDetected = await detectEthereumProvider();
    this.setState({ isMetamaskProviderDetected });
    this.ensureMetamaskEventsBound();
  }

  ensureMetamaskEventsBound = () => {
    if (!this.state.metamaskEventsBound) {
      window.ethereum.on('accountsChanged', accounts => {
        if (accounts.length) {
          this.setUserOrderDashboard(accounts[0]);
        } else {
          this.setState({
            networkId: null,
            account: null
          });
        }
      });
      
      window.ethereum.on('chainChanged', networkId => {
        this.setUserOrderDashboard();
        this.setState({ networkId });
      });

      this.setState({ metamaskEventsBound: true });
    }
  };

  toggleManualLoginModal = () => {
    this.setState(prevState => ({
      showManualLoginModal: !prevState.showManualLoginModal
    }));
  };

  manualLogin = () => {
    const networkId = this.state.manualLoginNetworkName === 'mainnet' ? '0x1' : '0x5';
    const account = this.state.manualLoginAddress;
    this.setState({
      networkId,
      account,
      showManualLoginModal: false
    });

    this.setUserOrderDashboard(account);
  };

  metamaskLogin = async () => {
    const networkId = await window.ethereum.request({ method: 'eth_chainId' });
    const providerMetamask = new ethers.providers.Web3Provider(window.ethereum);

    let accounts;
    try {
      accounts = await providerMetamask.send('eth_requestAccounts', []);
    } catch (err) {
      console.log(err);
      this.showAlert('secondary', 7, this.mapMetamaskErrorToMessage(err.code), 'If you prefer, you can also connect by "pasting" a wallet address into a textbox.');
      return;
    }

    const account = accounts[0];
    this.setState({ networkId, account });
    this.showAlert(null, null, null, null);
    this.setUserOrderDashboard(account);
  };

  disconnect = () => {
    this.setState({
      networkId: null,
      account: null
    });
  };

  createAlchemyProvider = () => {
    const providerAlchemyPublicApiKey = 'dZfJX0zlMxU1bwn_91-6KYdVb4m5V2hs';
    const providerAlchemyNetwork = 'goerli';
    return new ethers.providers.AlchemyProvider(providerAlchemyNetwork, providerAlchemyPublicApiKey);
  };

  createOrdersContract = providerOrSigner => {
    return new ethers.Contract(ordersContractAddress, ordersContractAbi, providerOrSigner);
  };

  setWhitelistedCoinSymbols = async () => {
    const contract = this.createOrdersContract(this.createAlchemyProvider());
    const res = await contract.functions.getWhitelistedSymbols(coinSymbols);
    this.setState({ whitelistedCoinSymbols: res[0] });
  };

  getOrderDirectionLabel = orderDirectionEnum => {
    const orderDirectionInt = parseInt(orderDirectionEnum);
    switch (orderDirectionInt) {
      case 0:
        return 'below';
      case 1:
        return 'equal to';
      case 2:
        return 'above';
    }
  };

  setUserOrderDashboard = async (account) => {
    this.setState({ orders: null });

    if (!account) {
      console.warn('Tried to set user order before setting account address');
      return;
    }

    this.setState({ account });
    const contract = this.createOrdersContract(this.createAlchemyProvider());
    const txResponse = await contract.functions.getOrdersByAddress(account);
    const ordersResponse = txResponse[0];

    const decimalsMap = {};
    const symbols = ordersResponse.reduce((set, order) => set.add(order.tokenIn), new Set());
    for (let symbol of symbols) {
      const isCached = decimalsMap.hasOwnProperty(symbol);
      if (!isCached) {
        const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
        const tokenAddress = tokenAddresses[0];
        const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, this.createAlchemyProvider());
        const tokenDecimals = await tokenContract.functions.decimals();
        decimalsMap[symbol] = tokenDecimals;
      }
    }

    const orders = ordersResponse.map(o => {
      const orderId = parseInt(o.id._hex, 16);
      const ownerTail = o.owner.substring(o.owner.length - 4, o.owner.length);
      const tokenInAmountInt = parseInt(o.tokenInAmount._hex, 16);
      const tokenInDecimals = decimalsMap[o.tokenIn];
      const tokenInAmountIntBig = new Big(`${tokenInAmountInt}e-${tokenInDecimals}`);
      const anonOrderId = `${ownerTail}${orderId}`;

      return {
        orderId: orderId,
        anonOrderId: anonOrderId,
        tokenInAmount: tokenInAmountIntBig.toString(),
        tokenIn: o.tokenIn,
        tokenOut: o.tokenOut,
        direction: this.orderDirectionMap[o.direction],
        tokenInTriggerPrice: o.tokenInTriggerPrice,
        orderState: this.orderStatusMap[o.orderState],
        lastChecked: null
      };
    });

    this.setState({ orders });
  };

  handleOrderAction = async (orderId, actionType) => {
    switch (actionType) {
      case 'cancel':
        await this.cancelOrder(orderId);
        break;
      default:
        console.warn(`Unhandled action type: ${actionType}`);
        break;
    }

    await this.setUserOrderDashboard();
  };

  convertTokenAmountToBalance = async (symbol, balance) => {
    const decimals = await this.getCachedTokenDecimals(symbol);
    const balanceBig = new Big(`${balance}e-${decimals}`);
    return balanceBig.toString();
  };

  getCachedTokenDecimals = async symbol => {
    if (this.decimalsMap[symbol]) {
      return this.decimalsMap[symbol];
    }

    const contract = this.createOrdersContract(this.createAlchemyProvider());
    const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
    const tokenAddress = tokenAddresses[0];
    const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, this.createAlchemyProvider());
    const decimals = tokenContract.functions.decimals();
    this.decimalsMap[symbol] = decimals;
    return decimals;
  };

  cancelOrder = async (orderId) => {
    const providerMetamask = new ethers.providers.Web3Provider(window.ethereum);
    const signer = providerMetamask.getSigner();
    const contract = this.createOrdersContract(signer);

    this.showAlert('primary', 1, 'Please confirm the transaction in metamask.', 'This will be 1 transaction that returns 100% of your order\'s coins back to your wallet.');
    let tx;
    try {
      tx = await contract.functions.cancelOrder(orderId);
    } catch (err) {
      console.log(err);
      const msg = this.mapMetamaskErrorToMessage(err.code);
      this.showAlert('secondary', 1, msg, null);
      return;
    }

    this.showAlert('info', 1, `Cancelling your order now, beep boop...`, 'This transaction is refunding 100% of your order\'s coins back to your wallet.');
    try {
      const txReceipt = await tx.wait();
      if (txReceipt.status === 0) {
        throw txReceipt;
      }

      const event = txReceipt.events.find(e => e.event === 'OrderCancelled');
      const tokenInAmount = parseInt(event.args.tokenInAmount._hex, 16);
      const refundBalance = await this.convertTokenAmountToBalance(event.args.tokenIn, tokenInAmount);
      const refundDetails = `Refunded ${refundBalance} ${event.args.tokenIn} to "${event.args.owner}"`;
      const txUrl = `${blockExplorerTransactionUrl}/${txReceipt.transactionHash}`;
      this.showAlert('success', 1, refundDetails, txUrl);
    } catch (err) {
      console.log(err);
      const msg = this.mapMetamaskErrorToMessage(err.reason);
      this.showAlert('warning', 1, msg, null);
    }
  };

  mapMetamaskErrorToMessage = errorReasonOrCode => {
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

  tryAddOrder = async () => {
    if (this.state.tokenInDecimalAmount <= 0) {
      this.showAlert('warning', 1, 'Please select a postive number of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInDecimalAmount}" tokens`);
    } else if (this.state.tokenInSymbol === this.state.tokenOutSymbol) {
      this.showAlert('warning', 1, 'Please select 2 different pairs of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInSymbol}" to "${this.state.tokenOutSymbol}"`);
    } else if (this.state.triggerPrice < 0) {
      this.showAlert('warning', 1, 'Please select a non-negative trigger price.', `Your order is currently configured to trigger at "${this.state.triggerPrice} $USD"`);
    } else {
      this.showAlert(null, null, null, null);
      const providerMetamask = new ethers.providers.Web3Provider(window.ethereum);
      const signer = providerMetamask.getSigner();
      let accounts = await providerMetamask.send('eth_accounts', []);
      const isMetamaskConnected = accounts.length;
      if (!isMetamaskConnected) {
        this.showAlert('primary', 1, 'Please connect to Metamask to add new orders on Ethereum.');

        try {
          accounts = await providerMetamask.send('eth_requestAccounts', []);
        } catch (err) {
          console.log(err);
          this.showAlert('primary', 3, this.mapMetamaskErrorToMessage(err.code));
        }
      }

      await this.addOrder(signer);
      await this.setUserOrderDashboard(accounts[0]);
    }
  };

  addOrder = async signer => {
    const contract = this.createOrdersContract(signer);
    const tokenInAddresses = await contract.functions.tryGetTokenAddress(this.state.tokenInSymbol);
    const tokenOutAddresses = await contract.functions.tryGetTokenAddress(this.state.tokenOutSymbol);
    const tokenInAddress = tokenInAddresses[0];
    const tokenOutAddress = tokenOutAddresses[0];
    const tokenInContract = new ethers.Contract(tokenInAddress, erc20ContractAbi, signer);
    const tokenOutContract = new ethers.Contract(tokenOutAddress, erc20ContractAbi, signer);

    const tokenInDecimals = await tokenInContract.functions.decimals();
    const tokenOutDecimals = await tokenOutContract.functions.decimals();
    const tokenInAmount = new Big(`${this.state.tokenInDecimalAmount}e${tokenInDecimals}`);
    const tokenInAmountStr = tokenInAmount.toString();

    try {
      this.showAlert('primary', 2, 'Please confirm transaction [1] of [2] in metamask.', 'This will add your order to the ethereum smart contract. This transaction creates data and does not transfer any coins yet.');
      const txNewOrder = await contract.functions.addNewOrder(
        this.state.tokenInSymbol,
        this.state.tokenOutSymbol,
        this.state.triggerPrice,
        this.state.triggerDirection,
        tokenInAmountStr
      );

      this.showAlert('info', 3, 'Processing transaction, beep boop...', 'Awaiting network approval (ethereum blocks take ~15 secs, unless there is degen monkey nft minting going on, or something worse than monkeys..)');
      const txNewOrderReceipt = await txNewOrder.wait();
      if (txNewOrderReceipt.status === 0) {
        throw txNewOrderReceipt;
      }

      this.showAlert('primary', 4, 'Please confirm transaction [2] of [2] in metamask.', 'This allows you to deposit the coins for your order to automatically swap via uniswap. Users can cancel untriggered orders at any time to get their coins sent back');
      const txDeposit = await tokenInContract.transfer(ordersContractAddress, tokenInAmountStr);

      this.showAlert('info', 5, 'Finalizing your order now, boop beep...', 'Awaiting network approval. Remember the bull market days when gas was 2000+ gwei? Wen zk sync token');
      const txDepositReceipt = await txDeposit.wait();
      if (txDepositReceipt.status === 0) {
        throw txDepositReceipt;
      }

      this.showAlert('success', 6, 'Neat! Your order is now live, and will be triggered when your conditions are met.', 'This is a decentralized protocol: users can refund coin deposits at any time, yay. Goodluck in the casino comrade (you may now close this box/browser tab)');
    } catch (err) {
      console.log(err);
      const msg = this.mapMetamaskErrorToMessage(err.reason);
      this.showAlert('secondary', 1, msg, null);
    }
  };

  showAlert = (alertVariant, alertCode, alertMsgPrimary, alertMsgSecondary) => this.setState({ alertVariant, alertCode, alertMsgPrimary, alertMsgSecondary });

  setManualLoginAddress = e => {
    console.log(e.target.value);
    this.setState({ manualLoginAddress: e.target.value });
  };

  setManualLoginNetworkName = manualLoginNetworkName => {
    this.setState({ manualLoginNetworkName });
  };

  setTokenInDecimalAmount = e => {
    this.setState({ tokenInDecimalAmount: e.target.value });
  };

  setTokenInSymbol = tokenInSymbol => {
    this.setState({ tokenInSymbol });
  };

  setTokenOutSymbol = tokenOutSymbol => {
    this.setState({ tokenOutSymbol });
  };

  setTriggerDirection = triggerDirection => {
    this.setState({ triggerDirection });
  };

  setTriggerPrice = e => {
    this.setState({ triggerPrice: e.target.value });
  };

  render() {
    return (
      <>
        <Banner show={this.state.networkId === '0x5'} networkId={this.state.networkId} ordersContractAddress={ordersContractAddress} />
        <Header isConnected={this.state.networkId} disconnect={this.disconnect} toggleManualLoginModal={this.toggleManualLoginModal} metamaskLogin={this.metamaskLogin} />
        <Container>
          <Row>
            <Col>
              <FlyweightAlert alertVariant={this.state.alertVariant} alertMsgPrimary={this.state.alertMsgPrimary} alertMsgSecondary={this.state.alertMsgSecondary} showAlert={this.showAlert} alertCodeMap={this.alertCodeMap} alertCode={this.state.alertCode} />
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={8}>
              {this.state.networkId ? (
                <OrdersCard orders={this.state.orders} handleOrderAction={this.handleOrderAction} account={this.state.account} className="mb-3 mb-lg-0" />
              ) : (
                <WelcomeCard className="mb-3 mb-lg-0" />
              )}
            </Col>
            <Col xs={12} lg={4}>
                <NewOrderCard tokenInDecimalAmount={this.state.tokenInDecimalAmount} tokenInSymbol={this.state.tokenInSymbol} whitelistedCoinSymbols={this.state.whitelistedCoinSymbols} tokenOutSymbol={this.state.tokenOutSymbol} getOrderDirectionLabel={this.getOrderDirectionLabel} triggerDirection={this.state.triggerDirection} triggerPrice={this.state.triggerPrice} tryAddOrder={this.tryAddOrder} coinSymbols={coinSymbols} setTokenInDecimalAmount={this.setTokenInDecimalAmount} setTokenInSymbol={this.setTokenInSymbol} setTokenOutSymbol={this.setTokenOutSymbol} setTriggerDirection={this.setTriggerDirection} setTriggerPrice={this.setTriggerPrice} />
            </Col>
          </Row>
        </Container>
        <PlainTextLoginModal show={this.state.showManualLoginModal} onHide={this.toggleManualLoginModal} defaultValue={this.state.manualLoginAddress} manualLoginNetworkName={this.state.manualLoginNetworkName} manualLogin={this.manualLogin} setManualLoginAddress={this.setManualLoginAddress} setManualLoginNetworkName={this.setManualLoginNetworkName} />
      </>
    );
  }
}

export default App;
