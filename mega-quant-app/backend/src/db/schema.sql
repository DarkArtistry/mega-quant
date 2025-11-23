-- MEGA QUANT Database Schema
-- Based on analysis-plan.md Section 3
-- 13 Tables for Multi-Chain Delta-Neutral Trading Platform

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS funding_payments CASCADE;
DROP TABLE IF EXISTS lp_positions CASCADE;
DROP TABLE IF EXISTS options_positions CASCADE;
DROP TABLE IF EXISTS perp_positions CASCADE;
DROP TABLE IF EXISTS gas_reserves CASCADE;
DROP TABLE IF EXISTS token_balances CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS strategy_executions CASCADE;
DROP TABLE IF EXISTS wallet_config CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;

-- 1. strategies table
CREATE TABLE strategies (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  execution_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'stopped',
  trading_views JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  stopped_at TIMESTAMP
);

CREATE INDEX idx_strategies_status ON strategies(status);

-- 2. wallet_config table
CREATE TABLE wallet_config (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  UNIQUE(strategy_id, wallet_address, chain_id)
);

CREATE INDEX idx_wallet_config_strategy ON wallet_config(strategy_id);
CREATE INDEX idx_wallet_config_address ON wallet_config(wallet_address);

-- 3. strategy_executions table
CREATE TABLE strategy_executions (
  id VARCHAR(36) PRIMARY KEY,
  strategy_id VARCHAR(36) NOT NULL,
  execution_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'opened',

  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,

  starting_inventory JSONB,
  ending_inventory JSONB,

  total_pnl_usd DECIMAL(18, 2) DEFAULT 0,
  total_gas_cost_usd DECIMAL(18, 2) DEFAULT 0,
  bridge_fees_usd DECIMAL(18, 2) DEFAULT 0,
  funding_received_usd DECIMAL(18, 2) DEFAULT 0,
  funding_paid_usd DECIMAL(18, 2) DEFAULT 0,
  premiums_collected_usd DECIMAL(18, 2) DEFAULT 0,
  premiums_paid_usd DECIMAL(18, 2) DEFAULT 0,
  farming_rewards_usd DECIMAL(18, 2) DEFAULT 0,
  impermanent_loss_usd DECIMAL(18, 2) DEFAULT 0,
  slippage_cost_usd DECIMAL(18, 2) DEFAULT 0,
  hedging_cost_usd DECIMAL(18, 2) DEFAULT 0,

  net_pnl_usd DECIMAL(18, 2) GENERATED ALWAYS AS (
    total_pnl_usd - total_gas_cost_usd - bridge_fees_usd
    - slippage_cost_usd - hedging_cost_usd - impermanent_loss_usd
    - premiums_paid_usd - funding_paid_usd
    + funding_received_usd + premiums_collected_usd + farming_rewards_usd
  ) STORED,

  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX idx_executions_strategy ON strategy_executions(strategy_id);
CREATE INDEX idx_executions_status ON strategy_executions(status);
CREATE INDEX idx_executions_opened_at ON strategy_executions(opened_at DESC);

-- 4. trades table
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36),
  strategy_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50),
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  block_number INTEGER NOT NULL,

  token_in_address VARCHAR(42) NOT NULL,
  token_in_symbol VARCHAR(20) NOT NULL,
  token_in_amount DECIMAL(36, 18) NOT NULL,

  token_out_address VARCHAR(42) NOT NULL,
  token_out_symbol VARCHAR(20) NOT NULL,
  token_out_amount DECIMAL(36, 18) NOT NULL,

  token_in_price_usd DECIMAL(18, 8),
  token_out_price_usd DECIMAL(18, 8),
  value_in_usd DECIMAL(18, 2),
  value_out_usd DECIMAL(18, 2),
  profit_loss_usd DECIMAL(18, 2),

  gas_used INTEGER,
  gas_price_gwei DECIMAL(18, 9),
  gas_cost_usd DECIMAL(18, 2),

  status VARCHAR(20) DEFAULT 'completed',

  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE SET NULL
);

CREATE INDEX idx_trades_strategy_wallet ON trades(strategy_id, wallet_address);
CREATE INDEX idx_trades_execution ON trades(execution_id);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_trades_chain ON trades(chain_id);
CREATE INDEX idx_trades_tx_hash ON trades(tx_hash);

-- 5. assets table (for tracking all tokens)
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_name VARCHAR(100),
  decimals INTEGER NOT NULL DEFAULT 18,
  is_native BOOLEAN DEFAULT false,
  coingecko_id VARCHAR(100),
  last_price_usd DECIMAL(18, 8),
  price_updated_at TIMESTAMP,
  UNIQUE(chain_id, token_address)
);

CREATE INDEX idx_assets_chain_symbol ON assets(chain_id, token_symbol);

-- 6. token_balances table
CREATE TABLE token_balances (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  balance_usd DECIMAL(18, 2),
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, chain_id, token_address)
);

CREATE INDEX idx_token_balances_wallet ON token_balances(wallet_address);
CREATE INDEX idx_token_balances_chain ON token_balances(chain_id);

-- 7. gas_reserves table
CREATE TABLE gas_reserves (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  native_token_symbol VARCHAR(10) NOT NULL,
  balance DECIMAL(36, 18) NOT NULL,
  balance_usd DECIMAL(18, 2),
  avg_gas_cost_usd DECIMAL(18, 8),
  estimated_trades_remaining INTEGER,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, chain_id)
);

CREATE INDEX idx_gas_reserves_wallet ON gas_reserves(wallet_address);

-- 8. perp_positions table (for perpetual futures)
CREATE TABLE perp_positions (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  market VARCHAR(50) NOT NULL,
  position_type VARCHAR(10) NOT NULL,
  size DECIMAL(36, 18) NOT NULL,
  entry_price DECIMAL(18, 8) NOT NULL,
  leverage DECIMAL(5, 2),
  collateral_usd DECIMAL(18, 2),
  unrealized_pnl_usd DECIMAL(18, 2),
  funding_rate DECIMAL(10, 6),
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX idx_perp_positions_execution ON perp_positions(execution_id);
CREATE INDEX idx_perp_positions_status ON perp_positions(status);

-- 9. options_positions table
CREATE TABLE options_positions (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  underlying VARCHAR(20) NOT NULL,
  option_type VARCHAR(10) NOT NULL,
  strike_price DECIMAL(18, 8) NOT NULL,
  expiry TIMESTAMP NOT NULL,
  contracts DECIMAL(18, 8) NOT NULL,
  premium_paid_usd DECIMAL(18, 2),
  current_value_usd DECIMAL(18, 2),
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX idx_options_positions_execution ON options_positions(execution_id);
CREATE INDEX idx_options_positions_expiry ON options_positions(expiry);

-- 10. lp_positions table (liquidity pool positions)
CREATE TABLE lp_positions (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  strategy_id VARCHAR(36) NOT NULL,
  chain_id INTEGER NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  pool_address VARCHAR(42) NOT NULL,
  token0_symbol VARCHAR(20) NOT NULL,
  token1_symbol VARCHAR(20) NOT NULL,
  token0_amount DECIMAL(36, 18),
  token1_amount DECIMAL(36, 18),
  liquidity DECIMAL(36, 18),
  fee_tier INTEGER,
  initial_value_usd DECIMAL(18, 2),
  current_value_usd DECIMAL(18, 2),
  fees_earned_usd DECIMAL(18, 2),
  impermanent_loss_usd DECIMAL(18, 2),
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX idx_lp_positions_execution ON lp_positions(execution_id);
CREATE INDEX idx_lp_positions_pool ON lp_positions(pool_address);

-- 11. funding_payments table
CREATE TABLE funding_payments (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  perp_position_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  funding_rate DECIMAL(10, 6) NOT NULL,
  payment_usd DECIMAL(18, 8) NOT NULL,
  payment_type VARCHAR(10) NOT NULL,
  FOREIGN KEY (execution_id) REFERENCES strategy_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (perp_position_id) REFERENCES perp_positions(id) ON DELETE CASCADE
);

CREATE INDEX idx_funding_payments_execution ON funding_payments(execution_id);
CREATE INDEX idx_funding_payments_timestamp ON funding_payments(timestamp DESC);

-- 12. portfolio_snapshots table (for historical tracking)
CREATE TABLE portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(36),
  wallet_address VARCHAR(42),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  total_value_usd DECIMAL(18, 2) NOT NULL,
  breakdown JSONB NOT NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_snapshots_strategy ON portfolio_snapshots(strategy_id, timestamp DESC);
CREATE INDEX idx_portfolio_snapshots_wallet ON portfolio_snapshots(wallet_address, timestamp DESC);

-- 13. price_history table (for caching token prices)
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  token_symbol VARCHAR(20) NOT NULL,
  chain_id INTEGER,
  price_usd DECIMAL(18, 8) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(50)
);

CREATE INDEX idx_price_history_symbol_time ON price_history(token_symbol, timestamp DESC);
CREATE INDEX idx_price_history_chain_symbol ON price_history(chain_id, token_symbol, timestamp DESC);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for strategies table
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default gas reserve data for common chains
-- This helps with initial setup
INSERT INTO assets (chain_id, token_address, token_symbol, token_name, decimals, is_native) VALUES
(1, '0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18, true),
(42161, '0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18, true),
(137, '0x0000000000000000000000000000000000000000', 'MATIC', 'Polygon', 18, true),
(56, '0x0000000000000000000000000000000000000000', 'BNB', 'BNB', 18, true),
(43114, '0x0000000000000000000000000000000000000000', 'AVAX', 'Avalanche', 18, true),
(10, '0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18, true),
(8453, '0x0000000000000000000000000000000000000000', 'ETH', 'Ethereum', 18, true)
ON CONFLICT (chain_id, token_address) DO NOTHING;

-- Success message
COMMENT ON DATABASE CURRENT_DATABASE IS 'MEGA QUANT - Multi-chain delta-neutral trading platform database';
