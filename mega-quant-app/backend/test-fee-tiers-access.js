// Quick test to see if FEE_TIERS is accessible
(async () => {
  console.log('Testing dt.base.uniswapV4.FEE_TIERS access...')

  try {
    console.log('FEE_TIERS:', dt.base.uniswapV4.FEE_TIERS)
    console.log('✅ FEE_TIERS is accessible!')
  } catch (error) {
    console.log('❌ FEE_TIERS not accessible:', error.message)
  }

  try {
    console.log('\nTesting tokens access...')
    console.log('dt.base.tokens:', dt.base.tokens)
    console.log('✅ tokens is accessible!')
  } catch (error) {
    console.log('❌ tokens not accessible:', error.message)
  }
})()
