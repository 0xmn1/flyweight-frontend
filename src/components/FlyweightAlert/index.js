import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Fade from 'react-bootstrap/Fade';
import Ping from '../Ping';
import styles from './FlyweightAlert.module.scss';

const FlyweightAlert = props => (
    <Alert variant={props.alertVariant} show={props.alertMsgPrimary} onClose={() => props.showAlert(null, null, null, null)} transition={Fade} className='wrapper-alert' id={styles.wrapper} dismissible>
        <h5 className="d-flex align-items-center mb-0">
            <Ping show={props.alertVariant === 'info'} />
            <div>{props.alertMsgPrimary}</div>
        </h5>
        <div>
            <small>{props.alertMsgSecondary}</small>
        </div>
        <Alert.Link href={props.alertCodeMap[props.alertCode]?.href} target="_blank">
            <small className="text-muted">
            {props.alertCodeMap[props.alertCode]?.label}
            </small>
        </Alert.Link>
    </Alert>
);

export default FlyweightAlert;
