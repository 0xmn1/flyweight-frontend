import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';

const NewOrderCard = props => (
    <Card>
        <Card.Body>
            <Card.Title>New order</Card.Title>
            <Form>
                <Form.Group className="mb-3">
                    <Form.Text>I want to swap...</Form.Text>
                    <Stack direction="horizontal" gap={1} className="mb-2">
                        <Form.Control type="number" placeholder="example: 10.0001" defaultValue={props.tokenInDecimalAmount} onChange={props.setTokenInDecimalAmount} />
                        <DropdownButton title={props.tokenInSymbol} onSelect={props.setTokenInSymbol} variant="dark">
                            {props.coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={props.tokenInSymbol === symbol} disabled={!props.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                            ))}
                        </DropdownButton>
                        <Form.Text>to</Form.Text>
                        <DropdownButton title={props.tokenOutSymbol} onSelect={props.setTokenOutSymbol} variant="dark">
                            {props.coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={props.tokenOutSymbol === symbol} disabled={!props.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                            ))}
                        </DropdownButton>
                    </Stack>
                    <Form.Text>when the price of <span className="fw-bold">{props.tokenInSymbol}</span> becomes</Form.Text>
                    <Stack direction="horizontal" gap={1}>
                        <DropdownButton title={props.getOrderDirectionLabel(props.triggerDirection)} onSelect={props.setTriggerDirection} variant="dark">
                            <Dropdown.Item eventKey={2} active={props.triggerDirection === 2}>{props.getOrderDirectionLabel(2)}</Dropdown.Item>
                            <Dropdown.Item eventKey={1} active={props.triggerDirection === 1}>{props.getOrderDirectionLabel(1)}</Dropdown.Item>
                            <Dropdown.Item eventKey={0} active={props.triggerDirection === 0}>{props.getOrderDirectionLabel(0)}</Dropdown.Item>
                        </DropdownButton>
                        <Form.Control type="number" placeholder="example: 250.90" defaultValue={props.triggerPrice} onChange={props.setTriggerPrice} />
                        <Form.Text>USD$</Form.Text>
                    </Stack>
                </Form.Group>
            </Form>
        </Card.Body>
        <Card.Footer>
            <div className="d-flex align-items-center justify-content-between">
                <Button variant="primary" type="button" onClick={props.tryAddOrder}>
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

export default NewOrderCard;
