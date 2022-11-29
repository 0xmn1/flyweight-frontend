import React from 'react';
import watch from 'redux-watch';
import Big from 'big.js';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Table from 'react-bootstrap/Table';
import Loading from '../Loading';
import { ethers } from 'ethers';
import { connectionStore } from '../../redux/connectionStore';
import { ordersStore, checked } from '../../redux/ordersStore';
import { alertStore, alertSet } from '../../redux/alertStore';
import { createOrdersContract } from '../../utils/ethersFactory';
import { createNodeProvider } from '../../utils/ethersFactory';
import { mapMetamaskErrorToMessage } from '../../utils/alertMap';
import { blockExplorerUrls, orderContractAddresses, networkNames, nodeProviderPublicApiKeys } from '../../utils/networkMap';
import erc20ContractAbi from '../../utils/resources/abi-erc20-contract.json';
import ordersContractAbi from '../../utils/resources/abi-orders-smart-contract.json';
import literals from '../../utils/resources/literals/english.json';

export default class OrdersCard extends React.Component {
  constructor() {
    super();
    this.state = {
      orders: null
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

  createNodeProvider = () => {
    const providerNetworkId = connectionStore.getState().networkId;
    const providerNetworkName = networkNames[providerNetworkId];
    const providerApiKey = nodeProviderPublicApiKeys[providerNetworkId];
    return createNodeProvider(providerNetworkName, providerApiKey);
  };

  createOrdersContract = providerOrSigner => {
    const address = orderContractAddresses[connectionStore.getState().networkId];
    return createOrdersContract(address, ordersContractAbi, providerOrSigner);
  };

  setUserOrderDashboard = async (account) => {
    this.setState({ orders: null });

    if (!account) {
      console.warn('Tried to set user order before setting account address');
      return;
    }

    const provider = this.createNodeProvider();
    const contract = this.createOrdersContract(provider);
    const txResponse = await contract.functions.getOrdersByAddress(account);
    const ordersResponse = txResponse[0];

    const decimalsMap = {};
    const symbols = ordersResponse.reduce((set, order) => set.add(order.tokenIn), new Set());
    for (let symbol of symbols) {
      const isCached = decimalsMap.hasOwnProperty(symbol);
      if (!isCached) {
        const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
        const tokenAddress = tokenAddresses[0];
        const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, provider);
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

    const lastCheckedTimestamp = Math.floor(new Date() / 1000);
    ordersStore.dispatch(checked({ lastCheckedTimestamp }));
  };

  convertTokenAmountToBalance = async (contract, symbol, balance) => {
    const decimals = await this.getCachedTokenDecimals(contract, symbol);
    const balanceBig = new Big(`${balance}e-${decimals}`);
    return balanceBig.toString();
  };

  getCachedTokenDecimals = async (contract, symbol) => {
    if (this.decimalsMap[symbol]) {
      return this.decimalsMap[symbol];
    }

    const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
    const tokenAddress = tokenAddresses[0];
    const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, this.createNodeProvider());
    const decimals = tokenContract.functions.decimals();
    this.decimalsMap[symbol] = decimals;
    return decimals;
  };

  createAlertSetPayload = (variant, code, msgPrimary, msgSecondary) => ({
    variant,
    code,
    msgPrimary,
    msgSecondary
  });

  dispatchAlertSet = payload => alertStore.dispatch(alertSet(payload));

  cancelOrder = async (orderId) => {
    const providerMetamask = new ethers.providers.Web3Provider(window.ethereum);
    const signer = providerMetamask.getSigner();
    const contract = this.createOrdersContract(signer);
    this.dispatchAlertSet(this.createAlertSetPayload('primary', 1, literals.CONFIRM_METAMASK_TX, literals.CANCEL_CONFIRM));

    let tx;
    try {
      tx = await contract.functions.cancelOrder(orderId);
    } catch (err) {
      console.log(err);
      const msg = mapMetamaskErrorToMessage(err.code);

      this.dispatchAlertSet(this.createAlertSetPayload('secondary', 1, msg, null));
      return;
    }

    this.dispatchAlertSet(this.createAlertSetPayload('info', 1, literals.CANCEL_PROCESSING, literals.CANCEL_REFUND));
    try {
      const txReceipt = await tx.wait();
      if (txReceipt.status === 0) {
        throw txReceipt;
      }

      const event = txReceipt.events.find(e => e.event === 'OrderCancelled');
      const tokenInAmount = parseInt(event.args.tokenInAmount._hex, 16);
      const refundBalance = await this.convertTokenAmountToBalance(contract, event.args.tokenIn, tokenInAmount);
      const refundDetails = `Refunded ${refundBalance} ${event.args.tokenIn} to "${event.args.owner}"`;
      const blockExplorerTransactionUrl = blockExplorerUrls[connectionStore.getState().networkId];
      const txUrl = `${blockExplorerTransactionUrl}/${txReceipt.transactionHash}`;

      this.dispatchAlertSet(this.createAlertSetPayload('success', 1, refundDetails, txUrl));
    } catch (err) {
      console.log(err);
      const msg = mapMetamaskErrorToMessage(err.reason);
      this.dispatchAlertSet(this.createAlertSetPayload('warning', 1, msg, null));
    }
  };

  render() {
    const account = connectionStore.getState().account;
    return (
      <Card className={this.props.className}>
        <Card.Body>
          <Card.Title>
            Orders
          </Card.Title>

          {!this.state.orders ? (
            <Loading />
          ) : this.state.orders.length ? (
            <>
              <Card.Text className="text-muted">
                Your orders for <Badge bg="secondary">{account}</Badge> are listed here. You can cancel orders using the "Action" button on the right, & change wallet addresses by selecting a different address in Metamask.
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
              No orders found for <Badge bg="secondary">{account}</Badge>. You can create an order using the "New order" panel, or switch to another account in Metamask.
            </Card.Text>
          )}
        </Card.Body>
      </Card>
    );
  }
}
