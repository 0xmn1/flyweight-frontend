import React from 'react';
import { ArrowClockwise } from 'react-bootstrap-icons';
import styles from './Loading.module.scss';

const Loading = () => (
  <div className="d-flex align-items-center justify-content-center" id={styles.wrapper}>
    <ArrowClockwise color="lightgray" size={64} className={styles.loadingIcon} />
    <div>reading ethereum contract..</div>
  </div>
);

export default Loading;
