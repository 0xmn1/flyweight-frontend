import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { createMetamaskProvider, createNodeProvider, createOrdersContract } from '../../utils/ethersFactory';
import { addOrder } from '../../utils/ordersContractFactory';
import { alertCodes, mapMetamaskErrorToMessage } from '../../utils/alertMap';
import { networkNames, nodeProviderPublicApiKeys } from '../../utils/networkMap';
import { alertStore, alertSet } from '../../redux/alertStore';
import { ordersStore, checked } from '../../redux/ordersStore';
import ordersContractAbi from '../../orders-smart-contract-abi.json';
import coinSymbols from '../../coin-symbols.json';

export default class NewOrderCard extends React.Component {
    constructor() {
        super();
        this.state = {
            tokenInDecimalAmount: 0.001,
            tokenInSymbol: 'UNI',
            tokenOutSymbol: 'WETH',
            triggerDirection: 2,
            triggerPrice: '0.02'
        };

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
        const providerNetworkName = networkNames[process.env.REACT_APP_NETWORK_ID];
        const providerApiKey = nodeProviderPublicApiKeys[process.env.REACT_APP_NETWORK_ID];
        const provider = createNodeProvider(providerNetworkName, providerApiKey);
        const contract = createOrdersContract(process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS, ordersContractAbi, provider);
        const res = await contract.functions.getWhitelistedSymbols(coinSymbols);
        return res[0];
    };

    setAlert = (variant, code, msgPrimary, msgSecondary) => {
        const alert = { variant, code, msgPrimary, msgSecondary };
        alertStore.dispatch(alertSet(alert));
    };

    tryAddOrder = async () => {
        if (this.state.tokenInDecimalAmount <= 0) {
            this.setAlert('warning', alertCodes.FAQ, 'Please select a postive number of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInDecimalAmount}" tokens`);
        } else if (this.state.tokenInSymbol === this.state.tokenOutSymbol) {
            this.setAlert('warning', alertCodes.FAQ, 'Please select 2 different pairs of tokens to swap.', `Your order is currently configured to swap "${this.state.tokenInSymbol}" to "${this.state.tokenOutSymbol}"`);
        } else if (this.state.triggerPrice < 0) {
            this.setAlert('warning', alertCodes.FAQ, 'Please select a non-negative trigger price.', `Your order is currently configured to trigger at "${this.state.triggerPrice} $USD"`);
        } else {
            this.setAlert(null, null, null, null);
            const provider = createMetamaskProvider(window);
            const signer = provider.getSigner();
            let accounts = await provider.send('eth_accounts', []);
            const isMetamaskConnected = accounts.length;
            if (!isMetamaskConnected) {
                this.setAlert('primary', alertCodes.FAQ, 'Please connect to Metamask to add new orders on Ethereum.');
        
                try {
                    accounts = await provider.send('eth_requestAccounts', []);
                } catch (err) {
                    console.log(err);
                    this.setAlert('primary', alertCodes.HOW_ORDERS_ADDED, mapMetamaskErrorToMessage(err.code));
                }
            }
    
            const {
                tokenInDecimalAmount,
                tokenInSymbol,
                tokenOutSymbol,
                triggerDirection,
                triggerPrice
            } = this.state;

            const order = { tokenInDecimalAmount, tokenInSymbol, tokenOutSymbol, triggerDirection, triggerPrice };
            await addOrder(signer, order);

            const lastCheckedTimestamp = Math.floor(new Date() / 1000);
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
                                <Form.Control type="number" min="0" step="0.001" placeholder="example: 10.0001" defaultValue={this.state.tokenInDecimalAmount} onChange={e => this.setState({ tokenInDecimalAmount: e.target.value })} />
                                <DropdownButton title={this.state.tokenInSymbol} onSelect={tokenInSymbol => this.setState({ tokenInSymbol })} variant="dark">
                                    {coinSymbols.map(symbol => (
                                        <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenInSymbol === symbol} disabled={!this.whitelistedCoinsSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                                    ))}
                                </DropdownButton>
                                <Form.Text>to</Form.Text>
                                <DropdownButton title={this.state.tokenOutSymbol} onSelect={tokenOutSymbol => this.setState({ tokenOutSymbol })} variant="dark">
                                    {coinSymbols.map(symbol => (
                                        <Dropdown.Item key={symbol} eventKey={symbol} active={this.state.tokenOutSymbol === symbol} disabled={!this.whitelistedCoinsSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                                    ))}
                                </DropdownButton>
                            </Stack>
                            <Form.Text>when the price of <span className="fw-bold">{this.state.tokenInSymbol}</span> becomes</Form.Text>
                            <Stack direction="horizontal" gap={1}>
                                <DropdownButton title={this.triggerDirectionNames[this.state.triggerDirection]} onSelect={triggerDirection => this.setState({ triggerDirection: parseInt(triggerDirection) })} variant="dark">
                                    {this.triggerDirections.sort((a, b) => b - a).map(d => (
                                        <Dropdown.Item key={d} eventKey={d} active={this.state.triggerDirection === d}>{this.triggerDirectionNames[d]}</Dropdown.Item>
                                    ))}
                                </DropdownButton>
                                <Form.Control type="number" min="0" step="0.01" placeholder="example: 250.90" defaultValue={this.state.triggerPrice} onChange={e => this.setState({ triggerPrice: e.target.value })} />
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
