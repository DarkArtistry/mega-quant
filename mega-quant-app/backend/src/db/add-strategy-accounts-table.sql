-- Add strategy_account_mappings table to SQLite
-- This maps which account a strategy uses for each network

CREATE TABLE IF NOT EXISTS strategy_account_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id TEXT NOT NULL,
  network_id INTEGER NOT NULL,  -- Chain ID (1=Ethereum, 8453=Base, etc.)
  account_id TEXT NOT NULL,     -- Links to accounts table
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(strategy_id, network_id)  -- One account per network per strategy
);

CREATE INDEX idx_strategy_accounts_strategy ON strategy_account_mappings(strategy_id);
CREATE INDEX idx_strategy_accounts_network ON strategy_account_mappings(network_id);
CREATE INDEX idx_strategy_accounts_account ON strategy_account_mappings(account_id);

-- Comments for clarity
-- This table allows:
-- - Each strategy to use different accounts for different networks
-- - Example: Strategy "Arb-001" uses Account "Main" for Ethereum, Account "Trading-1" for Base
-- - When strategy executes, backend automatically loads the correct accounts
