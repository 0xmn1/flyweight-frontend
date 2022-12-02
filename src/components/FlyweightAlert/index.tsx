import { alertClear, alertSet, alertStore } from '../../redux/alertStore';

import Alert from 'react-bootstrap/Alert';
import Fade from 'react-bootstrap/Fade';
import Ping from '../Ping';
import React from 'react';
import { alertCodeMap } from '../../utils/alertMap';
import styles from './FlyweightAlert.module.scss';

type Props = {};
type State = {
  show: boolean,
};

export default class FlyweightAlert extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      show: false
    };
  }

  componentDidMount() {
    this.subscribeAlert();
  }

  subscribeAlert = () => {
    alertStore.subscribe(() => {
      const show = !!alertStore.getState().code;
      this.setState({ show });
    });
  };

  render() {
    if (!this.state.show) {
      return null;
    }

    const alertState = alertStore.getState();
    if (!alertState || !alertState.code) {
      return null;
    }

    const alert = alertCodeMap[alertState.code];
    return this.state.show && (
      <Alert variant={alertState.variant || undefined} show={!!alertState.msgPrimary} onClose={() => alertStore.dispatch(alertClear())} transition={Fade} className='wrapper-alert' id={styles.wrapper} dismissible>
        <h5 className="d-flex align-items-center mb-0">
          <Ping show={alertState.variant === 'info'} />
          <div>{alertState.msgPrimary}</div>
        </h5>
        <div>
          <small>{alertState.msgSecondary}</small>
        </div>
        <a href={alert.href} target="_blank">
          <small className="text-muted">
            {alert.label}
          </small>
        </a>
      </Alert>
    );
  }
}
