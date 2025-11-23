// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Simple Uniswap V4 Swap Router
 *
 * This contract implements the IUnlockCallback interface to enable swaps on Uniswap V4.
 * Deploy this contract once per chain, then use it from your TypeScript strategies.
 *
 * Deployment: Deploy with the PoolManager address for your chain
 * Usage: Call executeSwap() with pool key, swap params, and hook data
 *
 * IMPORTANT: This is a simplified router for educational/testing purposes.
 * For production, use the official UniversalRouter or PositionManager.
 */

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (int128, int128);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

contract UniswapV4SwapRouter is IUnlockCallback {
    IPoolManager public immutable poolManager;

    struct CallbackData {
        address sender;
        IPoolManager.PoolKey key;
        IPoolManager.SwapParams params;
        bytes hookData;
    }

    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        int256 amountSpecified,
        int128 amount0Delta,
        int128 amount1Delta
    );

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    /**
     * Execute a swap on Uniswap V4
     * @param key Pool key identifying the pool
     * @param params Swap parameters (direction, amount, price limit)
     * @param hookData Data to pass to hooks
     * @return amount0Delta Change in token0 balance
     * @return amount1Delta Change in token1 balance
     */
    function executeSwap(
        IPoolManager.PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external returns (int128 amount0Delta, int128 amount1Delta) {
        // Encode callback data
        bytes memory data = abi.encode(CallbackData({
            sender: msg.sender,
            key: key,
            params: params,
            hookData: hookData
        }));

        // Call unlock on PoolManager, which will callback to unlockCallback
        bytes memory result = poolManager.unlock(data);
        (amount0Delta, amount1Delta) = abi.decode(result, (int128, int128));

        emit SwapExecuted(
            msg.sender,
            key.currency0,
            key.currency1,
            params.amountSpecified,
            amount0Delta,
            amount1Delta
        );
    }

    /**
     * Callback function called by PoolManager during unlock
     * This is where the actual swap happens
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager can call");

        // Decode callback data
        CallbackData memory cbData = abi.decode(data, (CallbackData));

        // Determine which token is being sold
        address tokenIn = cbData.params.zeroForOne ? cbData.key.currency0 : cbData.key.currency1;
        address tokenOut = cbData.params.zeroForOne ? cbData.key.currency1 : cbData.key.currency0;

        // Transfer input tokens from sender to this contract
        uint256 amountIn = uint256(cbData.params.amountSpecified); // Assuming exact input
        IERC20(tokenIn).transferFrom(cbData.sender, address(this), amountIn);

        // Approve PoolManager to spend input tokens
        IERC20(tokenIn).approve(address(poolManager), amountIn);

        // Execute the swap
        (int128 amount0Delta, int128 amount1Delta) = poolManager.swap(
            cbData.key,
            cbData.params,
            cbData.hookData
        );

        // Calculate output amount (negative delta is what we receive)
        uint256 amountOut = cbData.params.zeroForOne
            ? uint256(uint128(-amount1Delta))
            : uint256(uint128(-amount0Delta));

        // Transfer output tokens to sender
        IERC20(tokenOut).transfer(cbData.sender, amountOut);

        // Return the deltas
        return abi.encode(amount0Delta, amount1Delta);
    }

    /**
     * Emergency function to recover stuck tokens
     */
    function recoverToken(address token, uint256 amount) external {
        IERC20(token).transfer(msg.sender, amount);
    }
}
