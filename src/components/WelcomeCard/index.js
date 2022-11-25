import React from 'react';
import Card from 'react-bootstrap/Card';

const WelcomeCard = props => (
    <Card className={props.className}>
        <Card.Body>
            <Card.Title>
                Welcome to Flyweight.
            </Card.Title>
            <Card.Text>
                To start viewing your orders, please connect to Ethereum using one of the methods in the top-right.
            </Card.Text>
            <Card.Text>
                The metamask option is only used to read an ethereum address to start the app with. Because of this, users are also able to simply copy-paste in an ethereum address as plain-text.
            </Card.Text>
        </Card.Body>
    </Card>
);

export default WelcomeCard;
