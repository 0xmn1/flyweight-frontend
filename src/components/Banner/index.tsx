import React from 'react';
import Stack from 'react-bootstrap/Stack';
import { connectionStore } from '../../redux/connectionStore';
import { orderContractAddresses } from '../../utils/networkMap';
import styles from './Banner.module.scss';

const networkId = connectionStore.getState().networkId;
const contractAddress = orderContractAddresses[networkId];

type Props = {
  show: boolean,
};

const Banner = (props: Props) => {
  if (!props.show) {
    return null;
  }

  return (
    <div className="py-1 text-center" id={styles.wrapper}>
      <div>Currently connected to a testnet (network id: {networkId}).</div>
      <div>This network only supports the UNI &amp; WETH erc-20&lsquo;s.</div>
      <Stack direction="horizontal" gap={2} className={styles.linkWrapper}>
        <a href={`https://goerli.etherscan.io/address/${contractAddress}#code`} target="_blank" title="Opens etherscan in a new tab">Etherscan</a>
        <a href="https://github.com/0xmn1?tab=repositories" target="_blank" title="Opens the github repos in a new tab">Github</a>
        <a href="https://goerlifaucet.com" target="_blank" title="Opens the alchemy goerli facuet in a new tab">Goerli faucet</a>
      </Stack>
    </div>
  );
};

export default Banner;
