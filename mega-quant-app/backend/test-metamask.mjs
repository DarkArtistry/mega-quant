import { HDNodeWallet } from 'ethers';

const mnemonic = "top yard margin mystery mystery cram capable cousin taxi sponsor breeze rely";

const account0 = HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0");
const account1 = HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/1");

console.log("\n🔍 MetaMask Compatibility Test\n");
console.log("Mnemonic:", mnemonic);
console.log("\n📊 Addresses derived from mnemonic (MetaMask standard):");
console.log("  Account 0 (m/44'/60'/0'/0/0):", account0.address);
console.log("  Account 1 (m/44'/60'/0'/0/1):", account1.address);
console.log("\n📊 Addresses from MEGA QUANT database:");
console.log("  Account 0:", "0xcf81dD1D889e37a638859382669a74ACec629777");
console.log("  Account 1:", "0x97c012B0f2F691cd51c257B818311EF093e0fe8E");
console.log("\n✅ Verification:");
console.log("  Account 0 Match:", account0.address === "0xcf81dD1D889e37a638859382669a74ACec629777" ? "✅ PASS" : "❌ FAIL");
console.log("  Account 1 Match:", account1.address === "0x97c012B0f2F691cd51c257B818311EF093e0fe8E" ? "✅ PASS" : "❌ FAIL");
console.log("\n");
