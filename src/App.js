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
      triggerPrice: '0.02',
      userMessages: {
        info: 'Blockchain transaction is now submitting (ethereum block approval time takes ~15 secs).',
        warning: 'No effect has taken place (the blockchain transaction was reverted).'
      }
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
              <Alert key="info" variant="info" show={this.state.userMessages.info}>
                <div>{this.state.userMessages.info}</div>
                <Alert.Link href="#" target="_blank">Frequently asked questions</Alert.Link>
              </Alert>
              <Alert key="warning" variant="warning" show={this.state.userMessages.warning}>
                <div>We're sorry, something went wrong.</div>
                <div>{this.state.userMessages.warning}</div>
                <Alert.Link href="#" target="_blank">Frequently asked questions</Alert.Link>
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
                      <Stack direction="horizontal" gap={1}>                  
                        <Form.Control type="number" placeholder="token in amount" defaultValue={this.state.tokenInDecimalAmount} onChange={e => this.setState({ tokenInAmount: e.target.value })} />
                        <DropdownButton title={this.state.tokenInSymbol} onSelect={(tokenInSymbol, _) => this.setState({ tokenInSymbol })} variant="dark">
                          <Dropdown.Item eventKey="UNI" active={this.state.tokenInSymbol === 'UNI'}>UNI (Uniswap)</Dropdown.Item>
                        </DropdownButton>
                        <Form.Text>to</Form.Text>
                        <DropdownButton title={this.state.tokenOutSymbol} onSelect={(tokenOutSymbol, _) => this.setState({ tokenOutSymbol })} variant="dark">
                          <Dropdown.Item eventKey="WETH" active={this.state.tokenOutSymbol === 'WETH'}>WETH (Wrapped ether)</Dropdown.Item>
                        </DropdownButton>
                      </Stack>
                      <Form.Text>when the price of <span className="fw-bold">{this.state.tokenInSymbol}</span> is</Form.Text>
                      <Stack direction="horizontal" gap={1}>
                        <DropdownButton title={this.getOrderDirectionLabel(this.state.triggerDirection)} onSelect={(triggerDirection, _) => this.setState({ triggerDirection })} variant="dark">
                          <Dropdown.Item eventKey={2} active={this.state.triggerDirection === 2}>{this.getOrderDirectionLabel(2)}</Dropdown.Item>
                          <Dropdown.Item eventKey={1} active={this.state.triggerDirection === 1}>{this.getOrderDirectionLabel(1)}</Dropdown.Item>
                          <Dropdown.Item eventKey={0} active={this.state.triggerDirection === 0}>{this.getOrderDirectionLabel(0)}</Dropdown.Item>
                        </DropdownButton>
                        <Form.Control type="number" placeholder="trigger price for token in" defaultValue={this.state.triggerPrice} onChange={e => this.setState({ triggerPrice: e.target.value })} />
                      </Stack>
                    </Form.Group>
                  </Form>
                </Card.Body>
                <Card.Footer>
                  <Button variant="primary" type="button" onClick={this.addOrder}>
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
