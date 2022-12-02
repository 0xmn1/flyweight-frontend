import { ContractFactory, createMetamaskProvider, createNodeProvider } from '../../utils/ethersFactory';
import { Order, addOrder } from '../../utils/ordersContractFactory';
import { alertClear, alertSet, alertStore } from '../../redux/alertStore';
import { alertCodes, mapMetamaskErrorToMessage } from '../../utils/alertMap';
import { checked, ordersStore } from '../../redux/ordersStore';
import { networkNames, nodeProviderPublicApiKeys } from '../../utils/networkMap';

import Big from 'big.js';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import React from 'react';
import Stack from 'react-bootstrap/Stack';
import coinSymbols from '../../utils/resources/coin-symbols.json';
import { connectionStore } from '../../redux/connectionStore';
import literals from '../../utils/resources/literals/english.json';
import { orderContractAddresses } from '../../utils/networkMap';
import ordersContractAbi from '../../utils/resources/abi-orders-smart-contract.json';
import { tryMetamaskOpAsync } from '../../utils/providerAdapter';

type Props = {
  isMetamaskProviderDetected: boolean,
};

type State = {
  tokenInDecimalAmount: number,
  tokenInSymbol: string | null,
  tokenOutSymbol: string | null,
  triggerDirection: number,
  triggerPrice: string
};

const initialState: State = {
  tokenInDecimalAmount: 0.001,
  tokenInSymbol: 'UNI',
  tokenOutSymbol: 'WETH',
  triggerDirection: 2,
  triggerPrice: '0.02'
};

export default class NewOrderCard extends React.Component<Props, State> {
  private whitelistedCoinsSymbols: Array<string>;
  private triggerDirections: Array<number>;
  private triggerDirectionNames: { [key: number]: string };

  constructor(props: Props) {
    super(props);
    this.state = initialState;
    this.whitelistedCoinsSymbols = [];
    this.triggerDirections = [0, 1, 2];
    this.triggerDirectionNames = {
      0: 'below',
      1: 'equal to',
      2: 'above'
    };
  }

  async componentDidMount() {
    this.whitelistedCoinsSymbols = await this.getWhitelistedCoinSymbols();
  }

  getWhitelistedCoinSymbols = async () => {
    const networkId = connectionStore.getState().networkId;
    const providerNetworkName = networkNames[networkId];
    const providerApiKey = nodeProviderPublicApiKeys[networkId];
    const provider = createNodeProvider(providerNetworkName, providerApiKey);
    const ordersContractAddress = orderContractAddresses[networkId];
    const contract = ContractFactory.createOrdersReadContract(ordersContractAddress, ordersContractAbi, provider);
    const res = await contract.functions.getWhitelistedSymbols(coinSymbols);
    return res[0];
  };

  setAlert = (variant: string, code: number, msgPrimary: string, msgSecondary: string | null) => {
    const alert = { variant, code, msgPrimary, msgSecondary };
    alertStore.dispatch(alertSet(alert));
  };

  tryAddOrder = async () => {
    if (!this.state.tokenInSymbol) {
      this.setAlert('warning', alertCodes.FAQ, literals.SWAP_FROM, null);
    } else if (!this.state.tokenOutSymbol) {
      this.setAlert('warning', alertCodes.FAQ, literals.SWAP_TO, null);
    } else if (!this.state.tokenInDecimalAmount || this.state.tokenInDecimalAmount <= 0) {
      this.setAlert('warning', alertCodes.FAQ, 'Please select a valid number of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInDecimalAmount}" tokens`);
    } else if (this.state.tokenInSymbol === this.state.tokenOutSymbol) {
      this.setAlert('warning', alertCodes.FAQ, 'Please select 2 different pairs of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInSymbol}" to "${this.state.tokenOutSymbol}"`);
    } else if (!this.state.triggerPrice || new Big(this.state.triggerPrice).lt(0)) {
      this.setAlert('warning', alertCodes.FAQ, 'Please select a valid trigger price.', `Your order is currently configured to trigger at "${this.state.triggerPrice} $USD"`);
    } else {
      alertStore.dispatch(alertClear());
      const provider = createMetamaskProvider(window);
      const signer = provider.getSigner();
      let accounts = await provider.send('eth_accounts', []);
      const isMetamaskConnected = accounts.length;
      if (!isMetamaskConnected) {
        this.setAlert('primary', alertCodes.FAQ, 'Please connect to Metamask to add new orders on Ethereum.', null);

        await tryMetamaskOpAsync(async () => {
          accounts = await provider.send('eth_requestAccounts', []);
        });
      }

      const {
        tokenInDecimalAmount,
        tokenInSymbol,
        tokenOutSymbol,
        triggerDirection,
        triggerPrice
      } = this.state;

      const order = new Order(
        tokenInDecimalAmount,
        tokenInSymbol,
        tokenOutSymbol,
        triggerDirection,
        triggerPrice
      );

      await addOrder(signer, order);
      const lastCheckedTimestamp = Math.floor(Date.now() / 1000);
      ordersStore.dispatch(checked({ lastCheckedTimestamp }));
    }
  };

  render() {
    return (
      <Card>
        <Card.Body>
          <Card.Title>New order</Card.Title>
          <Form>
            <Form.Group className="mb-3">
              <Form.Text>I want to swap...</Form.Text>
              <Stack direction="horizontal" gap={1} className="mb-2">
                <Form.Control type="number" min="0" step="0.001" placeholder="example: 10.0001" defaultValue={this.state.tokenInDecimalAmount} onChange={e => this.setState({ tokenInDecimalAmount: parseFloat(e.target.value) })} required />
                <DropdownButton title={this.state.tokenInSymbol} onSelect={tokenInSymbol => this.setState({ tokenInSymbol })} variant="dark">
                  {coinSymbols.map((symbol: string) => (
                    <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenInSymbol === symbol} disabled={!this.whitelistedCoinsSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                  ))}
                </DropdownButton>
                <Form.Text>to</Form.Text>
                <DropdownButton title={this.state.tokenOutSymbol} onSelect={tokenOutSymbol => this.setState({ tokenOutSymbol })} variant="dark">
                  {coinSymbols.map((symbol: string) => (
                    <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenOutSymbol === symbol} disabled={!this.whitelistedCoinsSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                  ))}
                </DropdownButton>
              </Stack>
              <Form.Text>when the price of <span className="fw-bold">{this.state.tokenInSymbol}</span> becomes</Form.Text>
              <Stack direction="horizontal" gap={1}>
                <DropdownButton title={this.triggerDirectionNames[this.state.triggerDirection]} onSelect={triggerDirection => triggerDirection !== undefined && triggerDirection !== null && this.setState({ triggerDirection: parseInt(triggerDirection) })} variant="dark">
                  {this.triggerDirections.sort((a, b) => b - a).map(d => (
                    <Dropdown.Item key={d} eventKey={d} active={this.state.triggerDirection === d}>{this.triggerDirectionNames[d]}</Dropdown.Item>
                  ))}
                </DropdownButton>
                <Form.Control type="number" min="0" step="0.01" placeholder="example: 250.90" defaultValue={this.state.triggerPrice} onChange={e => this.setState({ triggerPrice: e.target.value })} required />
                <Form.Text>USD$</Form.Text>
              </Stack>
            </Form.Group>
          </Form>
        </Card.Body>
        <Card.Footer>
          <div className="d-flex align-items-center justify-content-between">
            <Button variant={this.props.isMetamaskProviderDetected === false ? 'secondary' : 'primary'} type="button" onClick={this.tryAddOrder} disabled={this.props.isMetamaskProviderDetected === false}>
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
    );
  }
}
