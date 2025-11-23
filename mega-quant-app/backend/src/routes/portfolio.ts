import express from 'express'
import { query } from '../db/index.js'

const router = express.Router()

// GET /api/portfolio/overview - Get portfolio overview metrics
router.get('/overview', async (req, res) => {
  try {
    const { strategy_id } = req.query

    // Get total balance across all chains
    let balanceQuery = 'SELECT SUM(balance_usd) as total_balance FROM token_balances'
    const balanceParams: any[] = []

    // Get win rate from executions
    let winRateWhere = 'WHERE status = \'closed\''
    const winRateParams: any[] = []
    let paramCount = 1

    if (strategy_id) {
      winRateWhere += ` AND strategy_id = $${paramCount++}`
      winRateParams.push(strategy_id)
    }

    const [balanceResult, winRateResult, pnlResult] = await Promise.all([
      // Total balance
      query(balanceQuery, balanceParams),

      // Win rate calculation
      query(`
        SELECT
          COUNT(*) as total_executions,
          COUNT(CASE WHEN net_pnl_usd > 0 THEN 1 END) as winning_executions,
          CASE
            WHEN COUNT(*) > 0
            THEN (COUNT(CASE WHEN net_pnl_usd > 0 THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0
          END as win_rate
        FROM strategy_executions
        ${winRateWhere}
      `, winRateParams),

      // P&L and other metrics
      query(`
        SELECT
          SUM(net_pnl_usd) as total_pnl,
          MAX(net_pnl_usd) as max_profit,
          MIN(net_pnl_usd) as max_loss,
          AVG(net_pnl_usd) as avg_pnl,
          SUM(total_gas_cost_usd) as total_gas_cost
        FROM strategy_executions
        ${winRateWhere}
      `, winRateParams)
    ])

    // Calculate max drawdown (simplified - would need time series for accurate calculation)
    const drawdownResult = await query(`
      SELECT MIN(net_pnl_usd) as max_drawdown
      FROM strategy_executions
      ${winRateWhere}
    `, winRateParams)

    // Calculate Sharpe ratio (simplified - would need proper historical returns)
    // For now, just return a placeholder
    const sharpeRatio = 0

    res.json({
      success: true,
      overview: {
        totalBalanceUsd: parseFloat(balanceResult.rows[0].total_balance || 0),
        winRate: parseFloat(winRateResult.rows[0].win_rate || 0),
        maxDrawdown: Math.abs(parseFloat(drawdownResult.rows[0].max_drawdown || 0)),
        sharpeRatio,
        totalExecutions: parseInt(winRateResult.rows[0].total_executions || 0),
        winningExecutions: parseInt(winRateResult.rows[0].winning_executions || 0),
        totalPnl: parseFloat(pnlResult.rows[0].total_pnl || 0),
        maxProfit: parseFloat(pnlResult.rows[0].max_profit || 0),
        maxLoss: parseFloat(pnlResult.rows[0].max_loss || 0),
        avgPnl: parseFloat(pnlResult.rows[0].avg_pnl || 0),
        totalGasCost: parseFloat(pnlResult.rows[0].total_gas_cost || 0)
      }
    })
  } catch (error: any) {
    console.error('Error fetching portfolio overview:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/portfolio/assets - Get token balances across all chains
router.get('/assets', async (req, res) => {
  try {
    const { chain_id, wallet_address } = req.query

    let sql = `
      SELECT
        tb.*,
        a.token_name,
        a.is_native
      FROM token_balances tb
      LEFT JOIN assets a ON tb.chain_id = a.chain_id AND tb.token_address = a.token_address
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 1

    if (chain_id) {
      sql += ` AND tb.chain_id = $${paramCount++}`
      params.push(chain_id)
    }
    if (wallet_address) {
      sql += ` AND tb.wallet_address = $${paramCount++}`
      params.push(wallet_address)
    }

    sql += ` ORDER BY tb.balance_usd DESC NULLS LAST, tb.balance DESC`

    const result = await query(sql, params)
    res.json({ success: true, assets: result.rows })
  } catch (error: any) {
    console.error('Error fetching assets:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/portfolio/gas-reserves - Get gas reserves for all chains
router.get('/gas-reserves', async (req, res) => {
  try {
    const { wallet_address } = req.query

    let sql = `
      SELECT * FROM gas_reserves
      WHERE 1=1
    `
    const params: any[] = []

    if (wallet_address) {
      sql += ' AND wallet_address = $1'
      params.push(wallet_address)
    }

    sql += ' ORDER BY chain_id'

    const result = await query(sql, params)

    // Add warnings for low gas
    const reserves = result.rows.map(reserve => ({
      ...reserve,
      warning: reserve.estimated_trades_remaining < 5 ? 'Low gas reserve' : null,
      status: reserve.estimated_trades_remaining < 5 ? 'low' : 'ok'
    }))

    res.json({ success: true, gasReserves: reserves })
  } catch (error: any) {
    console.error('Error fetching gas reserves:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/portfolio/recent-trades - Get recent trades
router.get('/recent-trades', async (req, res) => {
  try {
    const { limit = '50', strategy_id } = req.query

    let sql = `
      SELECT
        t.*,
        s.name as strategy_name,
        e.execution_type
      FROM trades t
      LEFT JOIN strategies s ON t.strategy_id = s.id
      LEFT JOIN strategy_executions e ON t.execution_id = e.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 1

    if (strategy_id) {
      sql += ` AND t.strategy_id = $${paramCount++}`
      params.push(strategy_id)
    }

    sql += ` ORDER BY t.timestamp DESC LIMIT $${paramCount}`
    params.push(limit)

    const result = await query(sql, params)
    res.json({ success: true, trades: result.rows })
  } catch (error: any) {
    console.error('Error fetching recent trades:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/portfolio/snapshot - Create portfolio snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const { strategy_id, wallet_address, total_value_usd, breakdown } = req.body

    if (!total_value_usd || !breakdown) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: total_value_usd, breakdown'
      })
    }

    const result = await query(`
      INSERT INTO portfolio_snapshots (strategy_id, wallet_address, total_value_usd, breakdown)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [strategy_id || null, wallet_address || null, total_value_usd, JSON.stringify(breakdown)])

    res.status(201).json({ success: true, snapshot: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating portfolio snapshot:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/portfolio/snapshots - Get historical portfolio snapshots
router.get('/snapshots', async (req, res) => {
  try {
    const { strategy_id, wallet_address, time_range = '30d' } = req.query

    const ranges: any = {
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    }

    let sql = `
      SELECT * FROM portfolio_snapshots
      WHERE timestamp >= NOW() - INTERVAL '${ranges[time_range as string] || '30 days'}'
    `
    const params: any[] = []
    let paramCount = 1

    if (strategy_id) {
      sql += ` AND strategy_id = $${paramCount++}`
      params.push(strategy_id)
    }
    if (wallet_address) {
      sql += ` AND wallet_address = $${paramCount++}`
      params.push(wallet_address)
    }

    sql += ' ORDER BY timestamp DESC'

    const result = await query(sql, params)
    res.json({ success: true, snapshots: result.rows })
  } catch (error: any) {
    console.error('Error fetching portfolio snapshots:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
