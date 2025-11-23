import express from 'express'
import { query } from '../db/index.js'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// GET /api/executions - List all executions (optionally filter by strategy)
router.get('/', async (req, res) => {
  try {
    const { strategy_id } = req.query

    let sql = `
      SELECT e.*, s.name as strategy_name
      FROM strategy_executions e
      LEFT JOIN strategies s ON e.strategy_id = s.id
    `
    const params: any[] = []

    if (strategy_id) {
      sql += ' WHERE e.strategy_id = $1'
      params.push(strategy_id)
    }

    sql += ' ORDER BY e.opened_at DESC'

    const result = await query(sql, params)
    res.json({ success: true, executions: result.rows })
  } catch (error: any) {
    console.error('Error fetching executions:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/executions/:id - Get single execution with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(`
      SELECT e.*, s.name as strategy_name
      FROM strategy_executions e
      LEFT JOIN strategies s ON e.strategy_id = s.id
      WHERE e.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Execution not found' })
    }

    res.json({ success: true, execution: result.rows[0] })
  } catch (error: any) {
    console.error('Error fetching execution:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/executions - Create new execution
router.post('/', async (req, res) => {
  try {
    const { strategy_id, execution_type, starting_inventory } = req.body

    if (!strategy_id || !execution_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: strategy_id, execution_type'
      })
    }

    const id = uuidv4()
    const result = await query(`
      INSERT INTO strategy_executions (
        id, strategy_id, execution_type, status, starting_inventory
      )
      VALUES ($1, $2, $3, 'opened', $4)
      RETURNING *
    `, [id, strategy_id, execution_type, JSON.stringify(starting_inventory || {})])

    res.status(201).json({ success: true, execution: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating execution:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/executions/:id/close - Close execution and calculate P&L
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params
    const { ending_inventory, pnl_components } = req.body

    const updates = [
      'status = $1',
      'closed_at = CURRENT_TIMESTAMP',
      'ending_inventory = $2'
    ]
    const values: any[] = ['closed', JSON.stringify(ending_inventory || {})]
    let paramCount = 3

    // Add P&L components if provided
    if (pnl_components) {
      if (pnl_components.total_pnl_usd !== undefined) {
        updates.push(`total_pnl_usd = $${paramCount++}`)
        values.push(pnl_components.total_pnl_usd)
      }
      if (pnl_components.total_gas_cost_usd !== undefined) {
        updates.push(`total_gas_cost_usd = $${paramCount++}`)
        values.push(pnl_components.total_gas_cost_usd)
      }
      if (pnl_components.bridge_fees_usd !== undefined) {
        updates.push(`bridge_fees_usd = $${paramCount++}`)
        values.push(pnl_components.bridge_fees_usd)
      }
      if (pnl_components.funding_received_usd !== undefined) {
        updates.push(`funding_received_usd = $${paramCount++}`)
        values.push(pnl_components.funding_received_usd)
      }
      if (pnl_components.funding_paid_usd !== undefined) {
        updates.push(`funding_paid_usd = $${paramCount++}`)
        values.push(pnl_components.funding_paid_usd)
      }
      if (pnl_components.slippage_cost_usd !== undefined) {
        updates.push(`slippage_cost_usd = $${paramCount++}`)
        values.push(pnl_components.slippage_cost_usd)
      }
    }

    values.push(id)
    const result = await query(`
      UPDATE strategy_executions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Execution not found' })
    }

    res.json({ success: true, execution: result.rows[0] })
  } catch (error: any) {
    console.error('Error closing execution:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/executions/:id/trades - Get trades for an execution
router.get('/:id/trades', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(`
      SELECT * FROM trades
      WHERE execution_id = $1
      ORDER BY timestamp DESC
    `, [id])

    res.json({ success: true, trades: result.rows })
  } catch (error: any) {
    console.error('Error fetching execution trades:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PATCH /api/executions/:id/inventory - Update starting or ending inventory
router.patch('/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params
    const { starting_inventory, ending_inventory } = req.body

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (starting_inventory !== undefined) {
      updates.push(`starting_inventory = $${paramCount++}`)
      values.push(JSON.stringify(starting_inventory))
    }
    if (ending_inventory !== undefined) {
      updates.push(`ending_inventory = $${paramCount++}`)
      values.push(JSON.stringify(ending_inventory))
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No inventory to update' })
    }

    values.push(id)
    const result = await query(`
      UPDATE strategy_executions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Execution not found' })
    }

    res.json({ success: true, execution: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating execution inventory:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
