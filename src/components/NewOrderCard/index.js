import { render } from 'node-sass';
import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';

const NewOrderCard = () => (
    <Card>
        <Card.Body>
            <Card.Title>New order</Card.Title>
            <Form>
                <Form.Group className="mb-3">
                    <Form.Text>I want to swap...</Form.Text>
                    <Stack direction="horizontal" gap={1} className="mb-2">
                        <Form.Control type="number" placeholder="example: 10.0001" defaultValue={this.props.tokenInDecimalAmount} onChange={this.props.setTokenInDecimalAmount} />
                        <DropdownButton title={this.props.tokenInSymbol} onSelect={this.props.setTokenInSymbol} variant="dark">
                            {this.props.coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={this.props.tokenInSymbol === symbol} disabled={!this.props.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                            ))}
                        </DropdownButton>
                        <Form.Text>to</Form.Text>
                        <DropdownButton title={this.props.tokenOutSymbol} onSelect={this.props.setTokenOutSymbol} variant="dark">
                            {this.props.coinSymbols.map(symbol => (
                            <Dropdown.Item key={symbol} eventKey={symbol} active={this.props.tokenOutSymbol === symbol} disabled={!this.props.whitelistedCoinSymbols.includes(symbol)}>{symbol}</Dropdown.Item>
                            ))}
                        </DropdownButton>
                    </Stack>
                    <Form.Text>when the price of <span className="fw-bold">{this.props.tokenInSymbol}</span> becomes</Form.Text>
                    <Stack direction="horizontal" gap={1}>
                        <DropdownButton title={this.props.getOrderDirectionLabel(this.props.triggerDirection)} onSelect={this.props.setTriggerDirection} variant="dark">
                            <Dropdown.Item eventKey={2} active={this.props.triggerDirection === 2}>{this.props.getOrderDirectionLabel(2)}</Dropdown.Item>
                            <Dropdown.Item eventKey={1} active={this.props.triggerDirection === 1}>{this.props.getOrderDirectionLabel(1)}</Dropdown.Item>
                            <Dropdown.Item eventKey={0} active={this.props.triggerDirection === 0}>{this.props.getOrderDirectionLabel(0)}</Dropdown.Item>
                        </DropdownButton>
                        <Form.Control type="number" placeholder="example: 250.90" defaultValue={this.props.triggerPrice} onChange={this.props.setTriggerPrice} />
                        <Form.Text>USD$</Form.Text>
                    </Stack>
                </Form.Group>
            </Form>
        </Card.Body>
        <Card.Footer>
            <div className="d-flex align-items-center justify-content-between">
                <Button variant="primary" type="button" onClick={this.props.tryAddOrder}>
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
