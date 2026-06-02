import { ethers } from 'ethers';

function getRpcUrl() {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  if (process.env.INFURA_PROJECT_ID) return `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  return '';
}

const RPC_URL = getRpcUrl();
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export default async function handler(req, res) {
  if (!RPC_URL || !BOT_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Server wallet is not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
    const ethBalance = await wallet.getBalance();
    const result = {
      address: wallet.address,
      ethBalance: ethers.formatEther(ethBalance),
      tokenAddress: TOKEN_ADDRESS || null,
    };

    if (TOKEN_ADDRESS) {
      const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
      const tokenBalance = await token.balanceOf(wallet.address);
      const decimals = await token.decimals();
      result.tokenBalance = Number(ethers.formatUnits(tokenBalance, decimals));
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Bot status error:', error);
    return res.status(500).json({ error: error.message || 'Bot status failed' });
  }
}
