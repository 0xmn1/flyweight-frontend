import React from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

const PlainTextLoginModal = props => (
    <Modal show={props.show} onHide={props.onHide}>
        <Modal.Header closeButton>
            <Modal.Title>Connect using plain-text</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>This is an alternate decentralized connection method, if you prefer to not use Metamask yet.</p>
            <p>This will allow you to view orders, which are stored on the blockchain.</p>
            <h6>Wallet address:</h6>
            <Form.Control type="text" placeholder="e.g.: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'" defaultValue={props.defaultValue} onChange={props.setManualLoginAddress} />
            <h6>Network:</h6>
            <DropdownButton title={props.manualLoginNetworkName} onSelect={props.setManualLoginNetworkName} variant="dark">
                <Dropdown.Item eventKey="mainnet" active={props.manualLoginNetworkName === 'mainnet'}>mainnet</Dropdown.Item>
                <Dropdown.Item eventKey="goerli" active={props.manualLoginNetworkName === 'goerli'}>goerli</Dropdown.Item>
            </DropdownButton>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={props.onHide}>
                Cancel
            </Button>
            <Button variant="primary" onClick={props.manualLogin}>
                Connect
            </Button>
        </Modal.Footer>
    </Modal>
);

export default PlainTextLoginModal;
