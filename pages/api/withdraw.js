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
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RPC_URL || !BOT_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Server wallet is not configured' });
  }

  const { recipient } = req.body;
  if (!recipient || !ethers.isAddress(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
    let tx;

    if (TOKEN_ADDRESS) {
      const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
      const balance = await token.balanceOf(wallet.address);
      if (balance === 0n) {
        return res.status(400).json({ error: 'No token balance available to withdraw' });
      }
      tx = await token.transfer(recipient, balance);
    } else {
      const balance = await wallet.getBalance();
      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas ?? ethers.parseUnits('120', 'gwei');
      const gasLimit = 21000n;
      const reserved = ethers.parseEther('0.001');
      const gasCost = gasLimit * maxFeePerGas;
      const withdrawAmount = balance > gasCost + reserved ? balance - gasCost - reserved : 0n;

      if (withdrawAmount <= 0n) {
        return res.status(400).json({ error: 'Insufficient ETH balance to withdraw after gas fees' });
      }

      tx = await wallet.sendTransaction({
        to: recipient,
        value: withdrawAmount,
        maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei'),
        gasLimit,
      });
    }

    return res.status(200).json({ txHash: tx.hash });
  } catch (error) {
    console.error('Withdraw error:', error);
    return res.status(500).json({ error: error.message || 'Withdraw failed' });
  }
}
