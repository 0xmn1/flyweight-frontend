import React from 'react';
import watch from 'redux-watch';
import Big from 'big.js';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Table from 'react-bootstrap/Table';
import Loading from '../Loading';
import { connectionStore } from '../../redux/connectionStore';
import { ordersStore, checked } from '../../redux/ordersStore';
import { createOrdersContract } from '../../utils/ethersFactory';
import { createAlchemyProvider } from '../../utils/ethersFactory';
import erc20ContractAbi from '../../erc20-contract-abi.json';
import ordersContractAbi from '../../orders-smart-contract-abi.json';

export default class OrdersCard extends React.Component {
    constructor() {
        super();
        this.state = {
            orders: null
        };
    }

    componentDidMount() {
        connectionStore.subscribe(() => {
            const account = connectionStore.getState().account;
            if (account) {
                this.setUserOrderDashboard(account);
            }
        });

        const w = watch(ordersStore.getState, 'lastCheckedTimestamp');
        ordersStore.subscribe(w((newTimestamp, oldTimestamp) => {
            if (newTimestamp > oldTimestamp) {
                const account = connectionStore.getState().account;
                this.setUserOrderDashboard(account);
            }
        }));

        this.setUserOrderDashboard(connectionStore.getState().account);
    }

    setUserOrderDashboard = async (account) => {
        this.setState({ orders: null });

        if (!account) {
            console.warn('Tried to set user order before setting account address');
            return;
        }

        const contract = createOrdersContract(process.env.REACT_APP_ORDERS_CONTRACT_ADDRESS, ordersContractAbi, createAlchemyProvider());
        const txResponse = await contract.functions.getOrdersByAddress(account);
        const ordersResponse = txResponse[0];

        const decimalsMap = {};
        const symbols = ordersResponse.reduce((set, order) => set.add(order.tokenIn), new Set());
        for (let symbol of symbols) {
            const isCached = decimalsMap.hasOwnProperty(symbol);
            if (!isCached) {
                const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
                const tokenAddress = tokenAddresses[0];
                const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, createAlchemyProvider());
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

    render() {
        return (
            <Card className={this.props.className}>
                <Card.Body>
                    <Card.Title>
                        Orders
                    </Card.Title>
        
                    {!this.props.orders ? (
                        <Loading />
                    ) : this.props.orders.length ? (
                        <>
                            <Card.Text className="text-muted">
                                Your orders for <Badge bg="secondary">{this.props.account}</Badge> are listed here. You can cancel orders using the "Action" button on the right, & change wallet addresses by selecting a different address in Metamask.
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
                                    {this.props.orders.map(o => (
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
                                        <DropdownButton title="" onSelect={(actionType, _) => this.props.handleOrderAction(o.orderId, actionType)} variant="dark">
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
                            No orders found for <Badge bg="secondary">{this.props.account}</Badge>. You can create an order using the "New order" panel, or switch to another account in Metamask.
                        </Card.Text>
                    )}
                </Card.Body>
            </Card>
        );
    }
}
