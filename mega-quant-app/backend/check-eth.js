import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const EIL_RPC = 'https://virtual.rpc.tenderly.co/stitchApp/project/private/eil-eth/855f8569-52b8-4149-a19d-55cf5b8de368'
const SMART_ACCOUNT = '0x7428514808b92d3c6628f549e9e47Aa16D3e8017'

const client = createPublicClient({
  chain: mainnet,
  transport: http(EIL_RPC)
})

const balance = await client.getBalance({ address: SMART_ACCOUNT })
console.log('Smart Account ETH Balance:', Number(balance) / 1e18, 'ETH')
if (Number(balance) === 0) {
  console.log('❌ NO ETH! This is why AA23 is failing - account cannot pay for gas!')
}
