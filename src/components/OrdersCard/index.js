import React from 'react';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Table from 'react-bootstrap/Table';
import Loading from '../Loading';

const OrdersCard = props => (
    <Card className={props.className}>
        <Card.Body>
            <Card.Title>
                Orders
            </Card.Title>

            {!props.orders ? (
                <Loading />
            ) : props.orders.length ? (
                <>
                    <Card.Text className="text-muted">
                        Your orders for <Badge bg="secondary">{props.account}</Badge> are listed here. You can cancel orders using the "Action" button on the right, & change wallet addresses by selecting a different address in Metamask.
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
                            {props.orders.map(o => (
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
                                <DropdownButton title="" onSelect={(actionType, _) => props.handleOrderAction(o.orderId, actionType)} variant="dark">
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
                    No orders found for <Badge bg="secondary">{props.account}</Badge>. You can create an order using the "New order" panel, or switch to another account in Metamask.
                </Card.Text>
            )}
        </Card.Body>
    </Card>
);

export default OrdersCard;
