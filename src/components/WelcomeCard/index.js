import React from 'react';
import Card from 'react-bootstrap/Card';

const WelcomeCard = props => (
    <Card className={props.className}>
        <Card.Body>
            <Card.Title>
                Welcome to Flyweight.
            </Card.Title>
            <Card.Text>
                To start using this decentralized app, please connect to Ethereum using one of the methods in the top-right.
            </Card.Text>
        </Card.Body>
    </Card>
);

export default WelcomeCard;
