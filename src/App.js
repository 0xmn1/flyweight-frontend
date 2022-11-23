'use strict';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React from 'react';
import Big from 'big.js';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Card from 'react-bootstrap/Card';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Fade from 'react-bootstrap/Fade';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import coinSymbols from './coin-symbols.json';
import ordersContractAbi from './orders-smart-contract-abi.json';
import erc20ContractAbi from './erc20-contract-abi.json';
import { ethers } from 'ethers';
import { ArrowClockwise } from 'react-bootstrap-icons';
import detectEthereumProvider from '@metamask/detect-provider';

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
    const networkId = this.state.manualLoginNetworkName === 'mainnet' ? 1 : 5;
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
          // chkpt
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

  render() {
    return (
      <>
        {this.state.networkId && this.state.networkId === 5 && (
            <div className="banner-warning text-center text-dark bg-warning">
              <div>Currently connected to a testnet (network id: {this.state.networkId}).</div>
              <div>This network only supports the UNI &amp; WETH coins.</div>
              <div>This decentralized app is open source on <a href={`https://goerli.etherscan.io/address/${ordersContractAddress}#code`} target="_blank" title="Opens etherscan in a new tab">Etherscan</a> &amp; <a href="https://github.com/0xmn1?tab=repositories" target="_blank" title="Opens the github repos in a new tab">Github</a>.</div>
            </div>
        )}
        <Navbar bg="light" expand="lg" className="mb-3" id="navbar">
          <Container>
            <Navbar.Brand>
              <Stack direction="vertical" gap={0}>
                <div><b>Fly</b>weight</div>
              </Stack>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse>
              <Nav className="me-auto">
                <Nav.Link>Home</Nav.Link>
                <Nav.Link>Dashboard</Nav.Link>
                <Nav.Link>FAQ</Nav.Link>
                <Nav.Link href="https://github.com/0xmn1?tab=repositories" target="_blank">Github</Nav.Link>
              </Nav>
            </Navbar.Collapse>

            {this.state.networkId ? (
              <Button variant="primary" type="button" onClick={this.disconnect}>
                Disconnect from Ethereum
              </Button>
            ) : (
              <>
                <Stack direction="horizontal" gap={2}>
                  <Button variant="primary" type="button" onClick={this.toggleManualLoginModal}>
                    Connect using plain-text
                  </Button>
                  <Button variant="primary" type="button" onClick={this.metamaskLogin}>
                    Connect using Metamask
                  </Button>
                </Stack>
              </>
            )}
          </Container>
        </Navbar>
        <Container>
          <Row>
            <Col>
              <Alert variant={this.state.alertVariant} show={this.state.alertMsgPrimary} onClose={() => this.showAlert(null, null, null, null)} className='wrapper-alert' transition={Fade} dismissible>
                <h5 className="d-flex align-items-center mb-0">
                <div className={this.state.alertVariant === 'info' ? 'anim-pulsing-circle anim-pulse' : null}></div>
                  <div>{this.state.alertMsgPrimary}</div>
                </h5>
                <div>
                  <small>{this.state.alertMsgSecondary}</small>
                </div>
                <Alert.Link href={this.alertCodeMap[this.state.alertCode]?.href} target="_blank">
                  <small className="text-muted">
                    {this.alertCodeMap[this.state.alertCode]?.label}
                  </small>
                </Alert.Link>
              </Alert>
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={8}>
              <Card className="mb-3 mb-lg-0">
                <Card.Body>
                  {this.state.networkId ? (
                    <>
                      <Card.Title>
                        Orders
                      </Card.Title>

                      {!this.state.orders ? (
                        <div className="d-flex align-items-center justify-content-center wrapper-loading">
                          <ArrowClockwise color="lightgray" size={64} className="anim-spin" />
                          <div>reading ethereum contract..</div>
                        </div>
                      ) : this.state.orders.length ? (
                        <>
                          <Card.Text className="text-muted">
                            Your orders for <Badge bg="secondary">{this.state.account}</Badge> are listed here. You can cancel orders using the "Action" button on the right, & change wallet addresses by selecting a different address in Metamask.
                          </Card.Text>
                          <Table responsive striped bordered hover>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Swap amount</th>
                                <th>Swap from</th>
                                <th>Swap to</th>
                                <th>Trigger (USD)</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {this.state.orders.map(o => (
                                <tr key={o.orderId}>
                                  <td>{o.anonOrderId}</td>
                                  <td>{o.tokenInAmount}</td>
                                  <td>{o.tokenIn}</td>
                                  <td>{o.tokenOut}</td>
                                  <td>
                                    {o.direction}&nbsp;${o.tokenInTriggerPrice}
                                  </td>
                                  <td>
                                    {o.orderState === 'Untriggered' ? (
                                      <Badge bg="warning" text="dark">{o.orderState}</Badge>
                                    ) : (o.orderState === 'Executed' ? (
                                      <Badge bg="success">{o.orderState}</Badge>
                                    ) : (o.orderState === 'Cancelled') ? (
                                      <Badge bg="secondary">{o.orderState}</Badge>
                                    ) : (
                                      <Badge>{o.orderState}</Badge>
                                    ))}
                                  </td>
                                  <td>
                                    <DropdownButton title="" onSelect={(actionType, _) => this.handleOrderAction(o.orderId, actionType)} variant="dark">
                                      <Dropdown.Item eventKey="cancel" disabled={o.orderState === 'Executed' || o.orderState === 'Cancelled'}>Cancel and refund order</Dropdown.Item>
                                    </DropdownButton>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </>
                      ) : (
                        <Card.Text>
                          No orders found for <Badge bg="secondary">{this.state.account}</Badge>. You can create an order using the "New order" panel, or switch to another account in Metamask.
                        </Card.Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Card.Title>
                        Welcome to Flyweight.
                      </Card.Title>
                      <Card.Text>
                        To start using this decentralized app, please connect to Ethereum using one of the methods in the top-right.
                      </Card.Text>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} lg={4}>
              <Card>
                <Card.Body>
                  <Card.Title>New order</Card.Title>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Text>I want to swap...</Form.Text>
                      <Stack direction="horizontal" gap={1} className="mb-2">
                        <Form.Control type="number" placeholder="example: 10.0001" defaultValue={this.state.tokenInDecimalAmount} onChange={e => this.setState({ tokenInDecimalAmount: e.target.value })} />
                        <DropdownButton title={this.state.tokenInSymbol} onSelect={(tokenInSymbol, _) => this.setState({ tokenInSymbol })} variant="dark">
                          {coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenInSymbol === symbol} disabled={!this.state.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                          ))}
                        </DropdownButton>
                        <Form.Text>to</Form.Text>
                        <DropdownButton title={this.state.tokenOutSymbol} onSelect={(tokenOutSymbol, _) => this.setState({ tokenOutSymbol })} variant="dark">
                          {coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenOutSymbol === symbol} disabled={!this.state.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                          ))}
                        </DropdownButton>
                      </Stack>
                      <Form.Text>when the price of <span className="fw-bold">{this.state.tokenInSymbol}</span> becomes</Form.Text>
                      <Stack direction="horizontal" gap={1}>
                        <DropdownButton title={this.getOrderDirectionLabel(this.state.triggerDirection)} onSelect={(triggerDirection, _) => this.setState({ triggerDirection })} variant="dark">
                          <Dropdown.Item eventKey={2} active={this.state.triggerDirection === 2}>{this.getOrderDirectionLabel(2)}</Dropdown.Item>
                          <Dropdown.Item eventKey={1} active={this.state.triggerDirection === 1}>{this.getOrderDirectionLabel(1)}</Dropdown.Item>
                          <Dropdown.Item eventKey={0} active={this.state.triggerDirection === 0}>{this.getOrderDirectionLabel(0)}</Dropdown.Item>
                        </DropdownButton>
                        <Form.Control type="number" placeholder="example: 250.90" defaultValue={this.state.triggerPrice} onChange={e => this.setState({ triggerPrice: e.target.value })} />
                        <Form.Text>USD$</Form.Text>
                      </Stack>
                    </Form.Group>
                  </Form>
                </Card.Body>
                <Card.Footer>
                  <div className="d-flex align-items-center justify-content-between">
                    <Button variant="primary" type="button" onClick={this.tryAddOrder}>
                      Create order
                    </Button>
                    <Card.Text>
                      <small className="text-muted text-right">
                        (opens <a href="https://metamask.io/" target="_blank" title="Opens metamask home page in a new browser tab">Metamask</a>)
                      </small>
                    </Card.Text>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Container>
        <Modal show={this.state.showManualLoginModal} onHide={this.toggleManualLoginModal}>
          <Modal.Header closeButton>
            <Modal.Title>Connect using plain-text</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>This is an alternate decentralized connection method, if you prefer to not use Metamask yet.</p>
            <p>This will allow you to view orders, which are stored on the blockchain.</p>
            <h6>Wallet address:</h6>
            <Form.Control type="text" placeholder="e.g.: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'" defaultValue={this.state.manualLoginAddress} onChange={e => this.setState({ manualLoginAddress: e.target.value })} />
            <h6>Network:</h6>
            <DropdownButton title={this.state.manualLoginNetworkName} onSelect={(manualLoginNetworkName, _) => this.setState({ manualLoginNetworkName })} variant="dark">
              <Dropdown.Item eventKey="mainnet" active={this.state.manualLoginNetworkName === 'mainnet'}>mainnet</Dropdown.Item>
              <Dropdown.Item eventKey="goerli" active={this.state.manualLoginNetworkName === 'goerli'}>goerli</Dropdown.Item>
            </DropdownButton>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={this.toggleManualLoginModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={this.manualLogin}>
              Connect
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

export default App;
