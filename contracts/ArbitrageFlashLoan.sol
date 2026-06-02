// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

interface ILendingPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract ArbitrageFlashLoan {
    ILendingPool public lendingPool;
    IUniswapV2Router02 public router;

    constructor(address _lendingPool, address _router) {
        lendingPool = ILendingPool(_lendingPool);
        router = IUniswapV2Router02(_router);
    }

    function startFlashLoan(
        address asset,
        uint256 amount,
        address[] calldata path,
        uint256 minProfit
    ) external {
        address[] memory assets = new address[](1);
        assets[0] = asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        bytes memory params = abi.encode(path, minProfit, msg.sender);
        lendingPool.flashLoan(address(this), assets, amounts, modes, address(this), params, 0);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        (address[] memory path, uint256 minProfit, address user) = abi.decode(params, (address[], uint256, address));

        IERC20 asset = IERC20(assets[0]);
        asset.approve(address(router), amounts[0]);

        router.swapExactTokensForTokens(amounts[0], 0, path, address(this), block.timestamp + 300);

        // Example: swap back along the reverse path to collect profit.
        // Real implementation must handle exact token flows and repay Aave loan + premium.

        uint256 totalOwed = amounts[0] + premiums[0];
        require(asset.balanceOf(address(this)) >= totalOwed + minProfit, 'No profit');

        asset.transfer(address(lendingPool), totalOwed);
        asset.transfer(user, asset.balanceOf(address(this)) - totalOwed);

        return true;
    }
}
