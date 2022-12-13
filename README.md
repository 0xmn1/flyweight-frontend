# Flyweight Web3 Frontend
This repo is a lightweight **React Typescript** frontend, to interact with [the Flyweight smart contracts](https://github.com/0xmn1/flyweight-smart-contracts).

## Getting started
The current hosting provider for this front-end is Github @ [flyweight.me](https://flyweight.me/). From there, you can connect to either Goerli (testnet) or Mainnet.

## Local setup
Similar to most react projects, you can get started locally via:
```bash
git clone git@github.com:0xmn1/flyweight-web3-frontend.git
cd 'flyweight-web3-frontend'
npm i
npm start
```

There is no hidden "secrets" file that you need to setup. The front-end does not need any confidential secrets. The repo uses [dotenv](https://github.com/motdotla/dotenv) and comes with a public [.env](https://github.com/0xmn1/flyweight-web3-frontend/blob/main/.env) already committed.

## Contributing
Any open source developers are welcome to contribute by opening new PRs. Please set the PR's target branch to `staging-goerli`.
