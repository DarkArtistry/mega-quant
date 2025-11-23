try {
  const mod = await import('viem/account-abstraction')
  console.log('Available exports:', Object.keys(mod).filter(k => k.toLowerCase().includes('packed') || k.includes('entryPoint08')).join(', '))
  
  if (mod.toPackedUserOperation) {
    console.log('✅ toPackedUserOperation available')
  } else {
    console.log('❌ toPackedUserOperation NOT available')
  }
  
  if (mod.entryPoint08Abi) {
    console.log('✅ entryPoint08Abi available')
  }
} catch (e) {
  console.log('Error:', e.message)
}
