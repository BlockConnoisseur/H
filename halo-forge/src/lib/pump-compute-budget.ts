import { ComputeBudgetProgram, VersionedTransaction } from "@solana/web3.js";

// Include both instructions before hashing or mint signing. Phantom can insert
// a priority price into an unsigned transaction that only specifies a CU limit.
// 400,000 CU × 25,000 micro-lamports = 10,000 lamports (0.00001 SOL).
export function pumpComputeBudget() {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 25_000 }),
  ];
}

export function canReusePumpTransaction(
  tx: { wire: string; signature?: string; lastValidBlockHeight: number },
  finalizedHeight: number,
) {
  if (finalizedHeight > tx.lastValidBlockHeight) return false;
  // Never replace a submitted transaction while it can still land.
  if (tx.signature) return true;
  const { message } = VersionedTransaction.deserialize(
    Buffer.from(tx.wire, "base64"),
  );
  return message.compiledInstructions.some(
    (ix) =>
      message.staticAccountKeys[ix.programIdIndex].equals(
        ComputeBudgetProgram.programId,
      ) &&
      ix.data.length === 9 &&
      ix.data[0] === 3,
  );
}
