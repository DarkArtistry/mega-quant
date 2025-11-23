// MEGA QUANT Trading Library
// Multi-chain delta-neutral trading infrastructure
// Based on trading-class.md

// Main exports
export { DeltaTrade, createDeltaTrade } from './DeltaTrade.js'
export { ChainProxy } from './ChainProxy.js'
export { ProtocolProxy } from './ProtocolProxy.js'

// Protocol implementations
export { UniswapV3Protocol } from './protocols/UniswapV3Protocol.js'

// Configuration
export { CHAIN_CONFIGS, getChainConfig, getChainById } from './config/chains.js'
export { TOKEN_ADDRESSES, getTokenInfo, getTokenByAddress, getChainTokens } from './config/tokens.js'

// Types
export type { ChainConfig } from './config/chains.js'
export type { TokenInfo } from './config/tokens.js'
export type { SwapParams, SwapResult } from './ProtocolProxy.js'
export type { TokenBalance, ExecutionResult } from './DeltaTrade.js'
