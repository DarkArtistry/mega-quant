// Test if we can import from viem/account-abstraction
try {
  const { entryPoint08Abi } = await import('viem/account-abstraction')
  console.log('✅ entryPoint08Abi available from viem/account-abstraction')
  console.log('   Type:', typeof entryPoint08Abi)
} catch (e) {
  console.log('❌ Not available:', e.message)
}
