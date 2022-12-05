'use strict';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { alertClear, alertStore } from './redux/alertStore';
import { connected, connectionStore, disconnected } from './redux/connectionStore';

import Banner from './components/Banner';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import FlyweightAlert from './components/FlyweightAlert';
import Header from './components/Header';
import NewOrderCard from './components/NewOrderCard';
import OrdersCard from './components/OrdersCard';
import PlainTextLoginModal from './components/PlainTextLoginModal';
import React from 'react';
import Row from 'react-bootstrap/Row';
import WelcomeCard from './components/WelcomeCard';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import { ordersStore } from './redux/ordersStore';
import { tryMetamaskOpAsync } from './utils/providerAdapter';
import watch from 'redux-watch';

type Props = {};

type State = {
  metamaskEventsBound: boolean,
  isMetamaskProviderDetected: boolean,
  isConnected: boolean,
  showManualLoginModal: boolean,
};

class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      metamaskEventsBound: false,
      isMetamaskProviderDetected: false,
      isConnected: false,
      showManualLoginModal: false,
    };
  }

  async componentDidMount() {
    this.subscribeConnected();
    this.subscribeDisconnected();

    const isMetamaskProviderDetected = !!await detectEthereumProvider();
    this.setState({ isMetamaskProviderDetected });

    if (isMetamaskProviderDetected) {
      this.ensureMetamaskEventsBound((window as any).ethereum);
    }
  }

  ensureMetamaskEventsBound = (metamaskApi: any) => {
    if (this.state.metamaskEventsBound) {
      return;
    }

    metamaskApi.on('accountsChanged', (accounts: Array<string>) => {
      if (accounts.length) {
        const networkId = connectionStore.getState().networkId;
        const account = accounts[0];
        connectionStore.dispatch(connected({ networkId, account }));
      } else {
        connectionStore.dispatch(disconnected());
      }
    });

    metamaskApi.on('chainChanged', (networkId: string) => {
      const account = connectionStore.getState().account;
      connectionStore.dispatch(connected({ networkId, account }));
    });

    this.setState({ metamaskEventsBound: true });
  };

  toggleManualLoginModal = () => {
    this.setState((prevState) => ({
      showManualLoginModal: !prevState.showManualLoginModal,
    }));
  };

  metamaskLogin = async () => {
    const metamaskApi = (window as any).ethereum;
    const networkId = await metamaskApi.request({ method: 'eth_chainId' });

    const metamaskProvider = new ethers.providers.Web3Provider(metamaskApi);
    let accounts: Array<string> | null = null;
    const isRequestSuccess = await tryMetamaskOpAsync(async () => {
      accounts = await metamaskProvider.send('eth_requestAccounts', []);
    });

    if (accounts && isRequestSuccess) {
      const account = accounts[0];
      connectionStore.dispatch(connected({ networkId, account }));
      alertStore.dispatch(alertClear());
    }
  };

  subscribeConnected = () => {
    const w = watch(connectionStore.getState, 'account');
    connectionStore.subscribe(w((newAccount, oldAccount) => {
      if (oldAccount !== newAccount && newAccount) {
        this.setState({
          showManualLoginModal: false,
          isConnected: true,
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

  render() {
    const isConnectedToTestnet = !!(connectionStore.getState().account && connectionStore.getState().networkId !== '0x1');
    return (
      <>
        <Banner show={isConnectedToTestnet} />
        <Header isConnected={this.state.isConnected}
          isMetamaskProviderDetected={this.state.isMetamaskProviderDetected}
          toggleManualLoginModal={this.toggleManualLoginModal}
          metamaskLogin={this.metamaskLogin}
        />
        <Container>
          <Row>
            <Col>
              <FlyweightAlert />
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={8}>
              {connectionStore.getState().account ? (
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
        <PlainTextLoginModal show={this.state.showManualLoginModal} onHide={this.toggleManualLoginModal} />
      </>
    );
  }
}

export default App;
