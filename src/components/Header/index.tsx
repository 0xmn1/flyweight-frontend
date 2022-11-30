import { connectionStore, disconnected } from '../../redux/connectionStore';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import React from 'react';
import Stack from 'react-bootstrap/Stack';
import styles from './Header.module.scss';

type Props = {
  isConnected: boolean,
  toggleManualLoginModal: () => void,
  isMetamaskProviderDetected: boolean,
  metamaskLogin: () => void,
};

const Header = (props: Props) => (
  <Navbar bg="light" expand="lg" className="mb-3" id={styles.wrapper}>
    <Container>
      <Navbar.Brand>
        <Stack direction="vertical" gap={0}>
          <div><b>Fly</b>weight</div>
        </Stack>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse>
        <Nav className="me-auto">
          <Nav.Link>Home</Nav.Link>
          <Nav.Link>Dashboard</Nav.Link>
          <Nav.Link>FAQ</Nav.Link>
          <Nav.Link href="https://github.com/0xmn1?tab=repositories" target="_blank">Github</Nav.Link>
        </Nav>
      </Navbar.Collapse>

      {props.isConnected ? (
        <Button variant="primary" type="button" onClick={() => connectionStore.dispatch(disconnected())}>
          Disconnect
        </Button>
      ) : (
        <>
          <Stack direction="horizontal" gap={2}>
            <Button variant="primary" type="button" onClick={props.toggleManualLoginModal}>
              Connect using plain-text
            </Button>
            <Button variant={props.isMetamaskProviderDetected === false ? 'secondary' : 'primary'} type="button" onClick={props.metamaskLogin} disabled={props.isMetamaskProviderDetected === false}>
              Connect using Metamask
            </Button>
          </Stack>
        </>
      )}
    </Container>
  </Navbar>
);

export default Header;
