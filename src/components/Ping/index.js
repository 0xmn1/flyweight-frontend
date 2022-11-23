import React from 'react';
import styles from './Ping.module.scss';

const Ping = props => (
    <div className={props.show ? styles.wrapper : null}></div>
);

export default Ping;
