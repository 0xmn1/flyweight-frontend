import React from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { connectionStore, connected } from '../../redux/connectionStore';

export default class PlainTextLoginModal extends React.Component {
    constructor() {
        super();

        this.networkNames = {
            '0x1': 'mainnet',
            '0x5': 'goerli'
        };

        this.state = {
            networkId: '0x5',
            account: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'
        };
    }

    connected = () => {
        connectionStore.dispatch(connected({
            networkId: this.state.networkId,
            account: this.state.account
        }));
    };

    render() {
        const networkName = connectionStore.getState().manualLoginNetworkName;
        const networkOptions = Object.keys(this.networkNames).map(networkId => (
            <Dropdown.Item key={networkId} eventKey={networkId} active={this.state.networkId === networkId}>{this.networkNames[networkId]}</Dropdown.Item>
        ));

        return (
            <Modal show={this.props.show} onHide={this.props.onHide}>
                <Modal.Header closeButton>
                    <Modal.Title>Connect using plain-text</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>This is an alternate decentralized connection method, if you prefer to not use Metamask yet.</p>
                    <p>This will allow you to view orders, which are stored on the blockchain.</p>
                    <h6>Wallet address:</h6>
                    <Form.Control type="text" placeholder="e.g.: '0xAF3e8346F1B57B0915851dBA3a1CDE65CF8dF522'" defaultValue={this.state.account} onChange={e => this.setState({ account: e.target.value })} />
                    <h6>Network:</h6>
                    <DropdownButton title={this.networkNames[this.state.networkId]} onSelect={networkId => this.setState({ networkId })} variant="dark">
                        {networkOptions}
                    </DropdownButton>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.props.onHide}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={this.connected}>
                        Connect
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
