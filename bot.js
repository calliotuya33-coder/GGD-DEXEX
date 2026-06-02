require('dotenv').config();
const { ethers } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');

function getRpcUrl() {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  if (process.env.INFURA_PROJECT_ID) return `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  return '';
}

const RPC_URL = getRpcUrl();
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
const FLASHBOTS_SIGNING_KEY = process.env.FLASHBOTS_SIGNING_KEY;
const ARBITRAGE_CONTRACT = process.env.ARBITRAGE_CONTRACT;

if (!RPC_URL || !PRIVATE_KEY || !FLASHBOTS_SIGNING_KEY || !ARBITRAGE_CONTRACT) {
  console.error('Missing environment variables. Please set RPC_URL or ALCHEMY_API_KEY/INFURA_PROJECT_ID, PRIVATE_KEY or BOT_PRIVATE_KEY, FLASHBOTS_SIGNING_KEY, and ARBITRAGE_CONTRACT.');
  process.exit(1);
}

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const AMOUNT_IN = ethers.parseEther('10');

const ROUTERS = [
  {
    name: 'Uniswap V2',
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  },
  {
    name: 'SushiSwap',
    address: '0xd9e1CE17f2641f24aE83637ab66a2cca9C378B9F',
  },
];

const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
];

const ARBITRAGE_ABI = [
  'function startFlashLoan(address asset, uint256 amount, address[] calldata path, uint256 minProfit) external',
];

const MIN_PROFIT_WEI = ethers.parseEther('0.005');

async function getQuote(provider, routerAddress, amountIn, path) {
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    console.error(`Quote failed for router ${routerAddress}:`, error.message || error);
    return ethers.Zero;
  }
}

function calculateNetProfit(amountIn, amountOut, feeRatio = 0.003) {
  const grossProfit = amountOut > amountIn ? amountOut - amountIn : ethers.Zero;
  const fee = amountOut * BigInt(Math.floor(feeRatio * 1e6)) / BigInt(1e6);
  return grossProfit > fee ? grossProfit - fee : ethers.Zero;
}

async function findArbitrage(provider) {
  const pathFwd = [WETH, DAI];
  const pathBack = [DAI, WETH];

  const quotes = await Promise.all(
    ROUTERS.map(async (router) => ({
      name: router.name,
      price: await getQuote(provider, router.address, AMOUNT_IN, pathFwd),
    }))
  );

  let bestOpportunity = null;

  for (const buy of quotes) {
    for (const sell of quotes) {
      if (buy.name === sell.name) continue;
      if (buy.price === ethers.Zero || sell.price === ethers.Zero) continue;

      const amountBack = await getQuote(provider, sell.address, buy.price, pathBack);
      if (amountBack === ethers.Zero) continue;

      const netProfit = calculateNetProfit(AMOUNT_IN, amountBack);
      if (netProfit > MIN_PROFIT_WEI) {
        bestOpportunity = {
          buyDex: buy.name,
          sellDex: sell.name,
          amountIn: AMOUNT_IN,
          amountOut: buy.price,
          amountBack,
          netProfit,
        };
      }
    }
  }

  return bestOpportunity;
}

async function submitBundle(provider, wallet, arbitrageInfo) {
  const authSigner = new ethers.Wallet(FLASHBOTS_SIGNING_KEY);
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, authSigner, 'https://relay.flashbots.net');
  const contract = new ethers.Contract(ARBITRAGE_CONTRACT, ARBITRAGE_ABI, wallet);

  const txData = await contract.populateTransaction.startFlashLoan(WETH, AMOUNT_IN, [WETH, DAI], arbitrageInfo.netProfit);
  const feeData = await provider.getFeeData();
  const nonce = await wallet.getTransactionCount('pending');
  const txRequest = {
    chainId: await wallet.getChainId(),
    type: 2,
    to: ARBITRAGE_CONTRACT,
    from: wallet.address,
    data: txData.data,
    nonce,
    gasLimit: ethers.parseUnits('1200000', 0),
    maxFeePerGas: feeData.maxFeePerGas ?? ethers.parseUnits('150', 'gwei'),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? ethers.parseUnits('2', 'gwei'),
  };

  const signedTx = await wallet.signTransaction(txRequest);
  const blockNumber = await provider.getBlockNumber();

  console.log('Submitting private bundle to Flashbots for block', blockNumber + 1);
  const bundleResponse = await flashbotsProvider.sendRawBundle([signedTx], blockNumber + 1);

  if ('error' in bundleResponse) {
    console.error('Flashbots bundle error:', bundleResponse.error.message);
    return;
  }

  const resolution = await bundleResponse.wait();
  console.log('Bundle resolution:', resolution);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Starting MEV bot with wallet', wallet.address);

  const opportunity = await findArbitrage(provider);
  if (!opportunity) {
    console.log('No profitable arbitrage opportunity found at this time.');
    return;
  }

  console.log('Found opportunity:', {
    buyDex: opportunity.buyDex,
    sellDex: opportunity.sellDex,
    netProfitETH: ethers.formatEther(opportunity.netProfit),
  });

  await submitBundle(provider, wallet, opportunity);
}

main().catch((error) => {
  console.error('Bot crashed:', error);
  process.exit(1);
});
