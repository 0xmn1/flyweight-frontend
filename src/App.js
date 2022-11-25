'use strict';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React from 'react';
import watch from 'redux-watch'
import Big from 'big.js';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { connectionStore, disconnected } from './redux/connectionStore';
import { createAlchemyProvider, createOrdersContract } from './utils/ethersFactory';

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
import { alertStore } from './redux/alertStore';
import { ordersStore } from './redux/ordersStore';

const ordersContractAddress = process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS;
const blockExplorerTransactionUrl = process.env.REACT_APP_BLOCK_EXPLORER_TRANSACTION_URL;
const providerAlchemyPublicApiKey = process.env.REACT_APP_PROVIDER_ALCHEMY_PUBLIC_API_KEY;
const providerAlchemyNetworkName = process.env.REACT_APP_PROVIDER_ALCHEMY_NETWORK_NAME;

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      orders: null,
      metamaskEventsBound: false,
      isMetamaskProviderDetected: false,
      isConnected: false,
      showManualLoginModal: false
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

    this.decimalsMap = {};
  }

  async componentDidMount() {
    this.subscribeConnected();
    this.subscribeDisconnected();

    const isMetamaskProviderDetected = !!await detectEthereumProvider();
    this.setState({ isMetamaskProviderDetected });
    this.ensureMetamaskEventsBound();
  }

  ensureMetamaskEventsBound = () => {
    if (!this.state.metamaskEventsBound) {
      window.ethereum.on('accountsChanged', accounts => {
        if (accounts.length) {
          const networkId = connectionStore.getState().networkId;
          const account = accounts[0];
          connectionStore.dispatch(connected({ networkId, account }));
        } else {
          connectionStore.dispatch(disconnected());
        }
      });
      
      window.ethereum.on('chainChanged', networkId => {
        const account = connectionStore.getState().account;
        connectionStore.dispatch(connected({ networkId, account }));
      });

      this.setState({ metamaskEventsBound: true });
    }
  };

  toggleManualLoginModal = () => {
    this.setState(prevState => ({
      showManualLoginModal: !prevState.showManualLoginModal
    }));
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
    connectionStore.dispatch(connected({ networkId, account }));
    this.showAlert(null, null, null, null);
  };

  subscribeConnected = () => {
    const w = watch(connectionStore.getState, 'account');
    connectionStore.subscribe(w((newAccount, oldAccount) => {
      if (oldAccount !== newAccount && newAccount) {
        this.setState({
          showManualLoginModal: false,
          isConnected: true
        });
      }
    }));
  };

  subscribeDisconnected = () => {
    const w = watch(connectionStore.getState, 'account');
    connectionStore.subscribe(w((newAccount, oldAccount) => {
      if (oldAccount !== newAccount && !newAccount) {
        this.setState({ isConnected: false });
      }
    }));
  };

  createAlchemyProvider = () => createAlchemyProvider(providerAlchemyNetworkName, providerAlchemyPublicApiKey);

  createOrdersContract = providerOrSigner => createOrdersContract(ordersContractAddress, ordersContractAbi, providerOrSigner);

  handleOrderAction = async (orderId, actionType) => {
    switch (actionType) {
      case 'cancel':
        await this.cancelOrder(orderId);
        break;
      default:
        console.warn(`Unhandled action type: ${actionType}`);
        break;
    }

    const lastCheckedTimestamp = Math.floor(new Date() / 1000);
    ordersStore.dispatch(checked({ lastCheckedTimestamp }));
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

  showAlert = (alertVariant, alertCode, alertMsgPrimary, alertMsgSecondary) => this.setState({ alertVariant, alertCode, alertMsgPrimary, alertMsgSecondary });

  render() {
    return (
      <>
        <Banner show={connectionStore.getState().networkId === '0x5'} networkId={connectionStore.getState().networkId} ordersContractAddress={ordersContractAddress} />
        <Header isConnected={this.state.isConnected} isMetamaskProviderDetected={this.state.isMetamaskProviderDetected} toggleManualLoginModal={this.toggleManualLoginModal} metamaskLogin={this.metamaskLogin} />
        <Container>
          <Row>
            <Col>
              <FlyweightAlert />
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={8}>
              {connectionStore.getState().networkId ? (
                <OrdersCard orders={this.state.orders} handleOrderAction={this.handleOrderAction} account={connectionStore.getState().account} className="mb-3 mb-lg-0" />
              ) : (
                <WelcomeCard className="mb-3 mb-lg-0" />
              )}
            </Col>
            <Col xs={12} lg={4}>
                <NewOrderCard isMetamaskProviderDetected={this.state.isMetamaskProviderDetected} />
            </Col>
          </Row>
        </Container>
        <PlainTextLoginModal show={this.state.showManualLoginModal} onHide={this.toggleManualLoginModal} defaultValue={connectionStore.getState().manualLoginAddress} />
      </> 
    );
  }
}

export default App;
