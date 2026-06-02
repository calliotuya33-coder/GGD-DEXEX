require('dotenv').config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const FORK_URL = process.env.FORK_URL || process.env.RPC_URL || (ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : '');

module.exports = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      forking: {
        url: FORK_URL,
        blockNumber: 18800000,
      },
    },
  },
};
