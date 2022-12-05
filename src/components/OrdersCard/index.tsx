import { AlertPayload, alertSet, alertStore } from '../../redux/alertStore';
import { Contract, ContractReceipt, ContractTransaction, Event, Signer, ethers, providers } from 'ethers';
import { Order, OrderResponse, OrderResponseDto } from '../../utils/ordersContractFactory';
import { alertCodes, mapMetamaskErrorToMessage } from '../../utils/alertMap';
import { blockExplorerUrls, networkNames, nodeProviderPublicApiKeys, orderContractAddresses } from '../../utils/networkMap';
import { checked, depositPending, ordersLoaded, ordersStore } from '../../redux/ordersStore';

import Badge from 'react-bootstrap/Badge';
import Big from 'big.js';
import Card from 'react-bootstrap/Card';
import { ContractFactory } from '../../utils/ethersFactory';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { InfoCircleFill } from 'react-bootstrap-icons';
import Loading from '../Loading';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import React from 'react';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import { connectionStore } from '../../redux/connectionStore';
import { createNodeProvider } from '../../utils/ethersFactory';
import erc20ContractAbi from '../../utils/resources/abi-erc20-contract.json';
import gasLimits from '../../utils/resources/gas-limits.json';
import literals from '../../utils/resources/literals/english.json';
import ordersContractAbi from '../../utils/resources/abi-orders-smart-contract.json';
import { tryMetamaskOpAsync } from '../../utils/providerAdapter';
import watch from 'redux-watch';

type Props = {
  className: string,
};

type State = {
  orders: Array<OrderResponse> | null,
};

const ordersContractAddress = orderContractAddresses[connectionStore.getState().networkId];

export default class OrdersCard extends React.Component<Props, State> {
  private orderDirectionMap: { [key: number]: string };
  private orderStatusMap: { [key: number]: string };
  private decimalsMap: { [key: string]: number };

  constructor(props: Props) {
    super(props);
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
      1: 'Pending deposit',
      2: 'Executed',
      3: 'Cancelled'
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

  setUserOrderDashboard = async (account: string | null) => {
    this.setState({ orders: null });

    if (!account) {
      console.warn('Tried to set user order before setting account address');
      return;
    }

    const provider = this.createNodeProvider();
    const contract = ContractFactory.createOrdersReadContract(ordersContractAddress, ordersContractAbi, provider);
    const txResponse = await contract.functions.getOrdersByAddress(account);
    const ordersResponse = txResponse[0];
    const decimalsMap: { [key: string]: number } = {};
    const symbols = ordersResponse.reduce((set: Set<string>, order: OrderResponseDto) => set.add(order.tokenIn), new Set());
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

    const orders: OrderResponse[] = ordersResponse.map((o: OrderResponseDto) => {
      const orderId = parseInt(o.id._hex, 16);
      const ownerTail = o.owner.substring(o.owner.length - 4, o.owner.length);
      const tokenInAmountInt = parseInt(o.tokenInAmount._hex, 16);
      const tokenInDecimals = decimalsMap[o.tokenIn];
      const tokenInAmountIntBig = new Big(`${tokenInAmountInt}e-${tokenInDecimals}`);
      const anonOrderId = `${ownerTail}${orderId}`;

      return new OrderResponse(
        orderId,
        anonOrderId,
        tokenInAmountIntBig.toString(),
        o.tokenIn,
        o.tokenOut,
        this.orderDirectionMap[o.direction],
        o.tokenInTriggerPrice,
        this.orderStatusMap[o.orderState],
      );
    });

    const isOrderDepositPending = orders.some(o => o.orderState === this.orderStatusMap[1]);
    ordersStore.dispatch(depositPending({ isOrderDepositPending }));
    ordersStore.dispatch(ordersLoaded({ isOrdersLoaded: true }))
    this.setState({ orders });
  };

  handleOrderAction = async (orderId: number, actionType: string | null) => {
    switch (actionType) {
      case 'cancel':
        await this.cancelOrder(orderId);
        break;
      default:
        console.warn(`Unhandled action type: ${actionType}`);
        break;
    }

    const lastCheckedTimestamp = Math.floor(Date.now() / 1000);
    ordersStore.dispatch(checked({ lastCheckedTimestamp }));
  };

  convertTokenAmountToBalance = async (contract: Contract, symbol: string, balance: string) => {
    const decimals = await this.getCachedTokenDecimals(contract, symbol);
    const balanceBig = new Big(`${balance}e-${decimals}`);
    return balanceBig.toString();
  };

  getCachedTokenDecimals = async (contract: Contract, symbol: string) => {
    if (this.decimalsMap[symbol]) {
      return this.decimalsMap[symbol];
    }

    const tokenAddresses = await contract.functions.tryGetTokenAddress(symbol);
    const tokenAddress = tokenAddresses[0];
    const tokenContract = new ethers.Contract(tokenAddress, erc20ContractAbi, this.createNodeProvider());
    const decimals = await tokenContract.functions.decimals();
    this.decimalsMap[symbol] = decimals;
    return decimals;
  };

  createAlertSetPayload = (variant: string, code: number, msgPrimary: string, msgSecondary: string | null) => ({
    variant,
    code,
    msgPrimary,
    msgSecondary
  });

  dispatchAlertSet = (payload: AlertPayload) => alertStore.dispatch(alertSet(payload));

  cancelOrder = async (orderId: number) => {
    const providerMetamask = new ethers.providers.Web3Provider((window as any).ethereum);
    const signer = providerMetamask.getSigner();
    const contract = ContractFactory.createOrdersWriteContract(ordersContractAddress, ordersContractAbi, signer);
    this.dispatchAlertSet(this.createAlertSetPayload('primary', alertCodes.FAQ, literals.CONFIRM_METAMASK_TX, literals.CANCEL_CONFIRM));

    let tx: ContractTransaction | null;
    const cancelResult = await tryMetamaskOpAsync(async () => {
      tx = await contract.functions.cancelOrder(orderId, { gasLimit: gasLimits.CANCEL_ORDER });
    });

    if (!cancelResult) {
      return;
    }

    this.dispatchAlertSet(this.createAlertSetPayload('info', alertCodes.FAQ, literals.CANCEL_PROCESSING, literals.CANCEL_REFUND));

    const txReceipt: ContractReceipt = await tx!.wait();
    if (txReceipt.status === 0) {
      throw txReceipt;
    }
    if (!txReceipt.events) {
      throw 'Transaction events not found';
    }

    const event: Event | undefined = txReceipt.events.find((e: Event) => e.event === 'OrderCancelled');
    if (!event || !event.args) {
      throw 'OrderCancelled event not found';
    }

    const tokenInAmount = parseInt(event.args.tokenInAmount._hex, 16).toString();
    const refundBalance = await this.convertTokenAmountToBalance(contract, event.args.tokenIn, tokenInAmount);
    const refundDetails = 'Order cancelled successfully.';
    const blockExplorerTransactionUrl = blockExplorerUrls[connectionStore.getState().networkId];
    const txUrl = `${blockExplorerTransactionUrl}/${txReceipt.transactionHash}`;

    this.dispatchAlertSet(this.createAlertSetPayload('success', alertCodes.FAQ, refundDetails, txUrl));
  };

  getBadgeBgForOrderState = (orderState: string): string => {
    const map = {
      [this.orderStatusMap[0]]: 'warning',
      [this.orderStatusMap[1]]: 'info',
      [this.orderStatusMap[2]]: 'success',
      [this.orderStatusMap[3]]: 'secondary'
    };

    return map[orderState];
  };

  createOverlayTooltip = (msg: string) => (
    <OverlayTrigger placement="bottom" overlay={(<Tooltip>{msg}</Tooltip>)}>
      <InfoCircleFill color="gray" size={16} className="ms-1" />
    </OverlayTrigger>
  );

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
                    <th>
                      Anonymous order ID
                      {this.createOverlayTooltip('This ID is just used as a reference to keep track of orders')}
                    </th>
                    <th>
                      Swap amount
                      {this.createOverlayTooltip('The amount of tokens that will be swapped if/when an order is triggered')}
                    </th>
                    <th>
                      Swap from
                      {this.createOverlayTooltip('This is the token deposited and will be used to swap to something else')}
                    </th>
                    <th>
                      Swap to
                      {this.createOverlayTooltip('The token that will be automatically sent to the order owner upon trigger')}
                    </th>
                    <th>
                      Trigger (USD)
                      {this.createOverlayTooltip('Quotes are in USD. Prices are fetched using an oracle that leverages the official CoinMarketCap API')}
                    </th>
                    <th>
                      Status
                      {this.createOverlayTooltip('Tokens are immediately sent upon swap execution')}
                    </th>
                    <th>
                      Action
                    </th>
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

                        <Badge bg={this.getBadgeBgForOrderState(o.orderState)} text="dark">{o.orderState}</Badge>
                      </td>
                      <td>
                        <DropdownButton title="" onSelect={(actionType, _) => this.handleOrderAction(o.orderId, actionType)} variant="dark">
                          <Dropdown.Item eventKey="cancel" disabled={o.orderState !== this.orderStatusMap[1]}>Cancel order</Dropdown.Item>
                          <Dropdown.Item eventKey="cancel" disabled={o.orderState !== this.orderStatusMap[0]}>Cancel and refund order</Dropdown.Item>
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
