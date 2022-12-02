import React from 'react';
import styles from './Ping.module.scss';

type Props = {
  show: boolean,
};

const Ping = (props: Props) => (
  <div className={props.show ? styles.wrapper : undefined}></div>
);

export default Ping;
