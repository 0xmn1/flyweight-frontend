import { connectionStore, disconnected } from '../../redux/connectionStore';

import Button from '../Button';
import Container from 'react-bootstrap/Container';
import Logo from '../Logo';
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
  <Navbar variant="dark" expand="lg" id={styles.wrapper}>
    <Container>
      <Navbar.Brand>
        <Stack direction="horizontal" gap={2}>
          <Logo />
          <div><b>Fly</b>weight</div>
        </Stack>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse>
        <Nav className="me-auto">
          <Nav.Link href="https://flyweight.me/" target="_blank">Home</Nav.Link>
          <Nav.Link href="https://github.com/0xmn1?tab=repositories" target="_blank">Github</Nav.Link>
        </Nav>
      </Navbar.Collapse>

      {props.isConnected ? (
        <Button className="primary" onClick={() => connectionStore.dispatch(disconnected())}>
          Disconnect
        </Button>
      ) : (
        <>
          <Stack direction="horizontal" gap={2}>
            <Button className="primary" onClick={props.toggleManualLoginModal}>
              Connect using plain-text
            </Button>
            <Button className={props.isMetamaskProviderDetected === false ? 'secondary' : 'primary'} onClick={props.metamaskLogin} disabled={props.isMetamaskProviderDetected === false}>
              Connect using Metamask
            </Button>
          </Stack>
        </>
      )}
    </Container>
  </Navbar>
);

export default Header;
