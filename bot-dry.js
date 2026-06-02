require('dotenv').config();
const { ethers } = require('ethers');

function getRpcUrl() {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  if (process.env.INFURA_PROJECT_ID) return `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  return '';
}

const RPC_URL = getRpcUrl();
if (!RPC_URL) {
  console.error('Missing RPC provider. Set RPC_URL or ALCHEMY_API_KEY/INFURA_PROJECT_ID in your environment.');
  process.exit(1);
}

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const AMOUNT_IN = ethers.parseEther('10');

const ROUTERS = [
  { name: 'Uniswap V2', address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' },
  { name: 'SushiSwap', address: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f' },
];

const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
];

const MIN_PROFIT_WEI = ethers.parseEther('0.005');

async function getQuote(provider, routerAddress, amountIn, path) {
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    console.error(`Quote failed for router ${routerAddress}:`, error.message || error);
    return 0n;
  }
}

function calculateNetProfit(amountIn, amountOut, feeRatio = 0.003) {
  const grossProfit = amountOut > amountIn ? amountOut - amountIn : 0n;
  const fee = (amountOut * BigInt(Math.floor(feeRatio * 1e6))) / BigInt(1e6);
  return grossProfit > fee ? grossProfit - fee : 0n;
}

async function findArbitrage(provider) {
  const pathFwd = [WETH, DAI];
  const pathBack = [DAI, WETH];

  const quotes = [];
  for (const r of ROUTERS) {
    const price = await getQuote(provider, r.address, AMOUNT_IN, pathFwd);
    quotes.push({ name: r.name, price, address: r.address });
  }

  let best = null;
  for (const buy of quotes) {
    for (const sell of quotes) {
      if (buy.name === sell.name) continue;
      if (buy.price === 0n || sell.price === 0n) continue;
      const amountBack = await getQuote(provider, sell.address, buy.price, pathBack);
      if (amountBack === 0n) continue;
      const netProfit = calculateNetProfit(AMOUNT_IN, amountBack);
      if (netProfit > MIN_PROFIT_WEI) {
        best = { buyDex: buy.name, sellDex: sell.name, netProfit, amountBack };
      }
    }
  }
  return best;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  console.log('Running dry-run arbitrage scan (no transactions will be sent)');
  const opp = await findArbitrage(provider);
  if (!opp) {
    console.log('No profitable arbitrage opportunity found.');
    return;
  }
  console.log('Found simulated opportunity:');
  console.log(' Buy on:', opp.buyDex);
  console.log(' Sell on:', opp.sellDex);
  console.log(' Net profit (ETH):', ethers.formatEther(opp.netProfit));
}

main().catch((e) => {
  console.error('Error in dry-run:', e);
  process.exit(1);
});
