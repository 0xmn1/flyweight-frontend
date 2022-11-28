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
import { createNodeProvider, createOrdersContract } from './utils/ethersFactory';

import coinSymbols from './coin-symbols.json';
import ordersContractAbi from './orders-smart-contract-abi.json';
import erc20ContractAbi from './erc20-contract-abi.json';
import { networkNames, nodeProviderPublicApiKeys } from './utils/networkMap';
import { mapMetamaskErrorToMessage } from './utils/alertMap';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

import Header from './components/Header';
import Banner from './components/Banner';
import FlyweightAlert from './components/FlyweightAlert';
import WelcomeCard from './components/WelcomeCard';
import OrdersCard from './components/OrdersCard';
import NewOrderCard from './components/NewOrderCard';
import PlainTextLoginModal from './components/PlainTextLoginModal';
import { alertStore, alertSet } from './redux/alertStore';
import { ordersStore, checked } from './redux/ordersStore';

const ordersContractAddress = process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS;
const providerPublicApiKey = nodeProviderPublicApiKeys[process.env.REACT_APP_NETWORK_ID];
const providerNetworkName = networkNames[process.env.REACT_APP_NETWORK_ID];

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
      alertStore.dispatch(alertSet({
        variant: 'secondary',
        code: 7,
        msgPrimary: mapMetamaskErrorToMessage(err.code),
        msgSecondary: 'If you prefer, you can also connect by "pasting" a wallet address into a textbox.'
      }));

      return;
    }

    const account = accounts[0];
    connectionStore.dispatch(connected({ networkId, account }));
    alertStore.dispatch(alertClear());
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
                <OrdersCard className="mb-3 mb-lg-0" />
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
