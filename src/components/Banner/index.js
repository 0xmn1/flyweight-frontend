import React from 'react';
import styles from './Banner.module.scss';

const Banner = props => props.show && (
    <div className="text-center text-dark bg-warning" id={styles.wrapper}>
        <div>Currently connected to a testnet (network id: {props.networkId}).</div>
        <div>This network only supports the UNI &amp; WETH coins.</div>
        <div>This decentralized app is open source on <a href={`https://goerli.etherscan.io/address/${props.ordersContractAddress}#code`} target="_blank" title="Opens etherscan in a new tab">Etherscan</a> &amp; <a href="https://github.com/0xmn1?tab=repositories" target="_blank" title="Opens the github repos in a new tab">Github</a>.</div>
    </div>
);

export default Banner;
