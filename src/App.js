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
import coinSymbols from './coin-symbols.json';
import ordersContractAbi from './orders-smart-contract-abi.json';
import { ethers } from 'ethers';
import { HourglassSplit } from 'react-bootstrap-icons';

const ordersContractAddress = '0x0180efB63Ae8C1607443B4Af87fF8ed49848Bb25';
const erc20Abi = [{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"rawAmount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

let signer = null;
let ordersContract = null;

const initContracts = () => {
  const signer = provider.getSigner();
  ordersContract = new ethers.Contract(ordersContractAddress, ordersContractAbi, signer);
};

const provider = new ethers.providers.Web3Provider(window.ethereum);

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      tokenInDecimalAmount: 0.001,
      tokenInSymbol: 'UNI',
      tokenOutSymbol: 'WETH',
      triggerDirection: 2,
      triggerPrice: '0.02',
      whitelistedCoinSymbols: [],
      alertMsgPrimary: null,
      alertMsgSecondary: null,
      alertVariant: null
    };
  }

  async componentDidMount() {
    provider.send('eth_requestAccounts', [])
      .then(async () => {
        initContracts();
        await this.setWhitelistedCoinSymbols();
      })
      .catch(console.error);
  }

  setWhitelistedCoinSymbols = async () => {
    const res = await ordersContract.functions.getWhitelistedSymbols(coinSymbols);
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

  tryAddOrder = async () => {
    if (this.state.tokenInDecimalAmount <= 0) {
      this.showAlert('warning', 'Please select a postive number of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInDecimalAmount}" tokens`);
    } else if (this.state.tokenInSymbol === this.state.tokenOutSymbol) {
      this.showAlert('warning', 'Please select 2 different pairs of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInSymbol}" to "${this.state.tokenOutSymbol}"`);
    } else if (this.state.triggerPrice < 0) {
      this.showAlert('warning', 'Please select a non-negative trigger price.', `Your order is currently configured to trigger at "${this.state.triggerPrice} $USD"`);
    } else {
      this.showAlert(null, null, null);
      await this.addOrder();
    }
  };

  addOrder = async () => {
    const signer = provider.getSigner();
    const tokenInAddresses = await ordersContract.functions.tryGetTokenAddress(this.state.tokenInSymbol);
    const tokenOutAddresses = await ordersContract.functions.tryGetTokenAddress(this.state.tokenOutSymbol);
    const tokenInAddress = tokenInAddresses[0];
    const tokenOutAddress = tokenOutAddresses[0];
    const tokenInContract = new ethers.Contract(tokenInAddress, erc20Abi, signer);
    const tokenOutContract = new ethers.Contract(tokenOutAddress, erc20Abi, signer);

    const tokenInDecimals = await tokenInContract.functions.decimals();
    const tokenOutDecimals = await tokenOutContract.functions.decimals();
    const tokenInAmount = new Big(`${this.state.tokenInDecimalAmount}e${tokenInDecimals}`);
    const tokenInAmountStr = tokenInAmount.toString();

    try {
      this.showAlert('primary', 'Please confirm transaction [1] of [2] in metamask.', 'This will add your order to the ethereum smart contract. This transaction transfers data only and does not transfer any coins.');
      const txNewOrder = await ordersContract.functions.addNewOrder(
        this.state.tokenInSymbol,
        this.state.tokenOutSymbol,
        this.state.triggerPrice,
        this.state.triggerDirection,
        tokenInAmountStr
      );

      this.showAlert('info', 'Processing transaction, beep boop...', 'Awaiting network approval (ethereum blocks take ~15 secs, unless there is degen monkey nft minting going on, or something worse than monkeys..)');
      const txNewOrderReceipt = await txNewOrder.wait();
      if (txNewOrderReceipt.status === 0) {
        throw txNewOrderReceipt;
      }

      this.showAlert('success', 'Please confirm transaction [2] of [2] in metamask.', 'This allows you to deposit the coins for your order to automatically swap via uniswap. Users can cancel untriggered orders at any time to get their coins sent back');
      const metamaskSigner = provider.getSigner();
      const txDeposit = await tokenInContract.transfer(ordersContractAddress, tokenInAmountStr);

      this.showAlert('info', 'Finalizing your order now, boop beep...', 'Awaiting network approval. Remember the bull market days when gas was 2000+ gwei? Wen zk sync token');
      const txDepositReceipt = await txDeposit.wait();
      if (txDepositReceipt.status === 0) {
        throw txDepositReceipt;
      }

      this.showAlert('success', 'Neat! Your order is now live, and will be triggered when your conditions are met.', 'This is a decentralized protocol: users can refund coin deposits at any time, yay. Goodluck in the casino comrade (you may now close this box/browser tab)');
    } catch (err) {
      console.error(err);
      this.showAlert('warning', `Order cancelled (${err.reason})`);
    }
  };

  showAlert = (alertVariant, alertMsgPrimary, alertMsgSecondary) => this.setState({ alertVariant, alertMsgPrimary, alertMsgSecondary });

  render() {
    return (
      <>
        <Navbar bg="light" expand="lg" className="mb-3">
          <Container>
            <Navbar.Brand>
              <Stack direction="vertical" gap={0}>
                <div>Flyweight</div>
              </Stack>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse>
              <Nav className="me-auto">
                <Nav.Link>Home</Nav.Link>
                <Nav.Link>Dashboard</Nav.Link>
                <Nav.Link>FAQ</Nav.Link>
                <Nav.Link>Github</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
        <Container>
          <Row>
            <Col>
              <Alert variant={this.state.alertVariant} show={this.state.alertMsgPrimary} onClose={() => this.showAlert(null, null, null)} className='wrapper-alert' dismissible>
                <h5 className="d-flex align-items-center mb-0">
                <div className={this.state.alertVariant === 'info' ? 'anim-pulsing-circle anim-pulse' : null}></div>
                  <div>{this.state.alertMsgPrimary}</div>
                </h5>
                <div>
                  <small>{this.state.alertMsgSecondary}</small>
                </div>
                <Alert.Link href="#" target="_blank">
                  <small class="text-muted">Frequently asked questions</small>
                </Alert.Link>
              </Alert>
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={7}>
              <Card className="mb-3 mb-lg-0">
                <Card.Body>
                  <Card.Title>Order history</Card.Title>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} lg={5}>
              <Card>
                <Card.Body>
                  <Card.Title>New order</Card.Title>
                  <Form>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
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
                  <Button variant="primary" type="button" onClick={this.tryAddOrder}>
                    Add order
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default App;
