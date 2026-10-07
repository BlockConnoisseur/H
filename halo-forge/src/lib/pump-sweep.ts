import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  bondingCurvePda,
  creatorVaultPda,
  GLOBAL_PDA,
  PUMP_EVENT_AUTHORITY_PDA,
  PUMP_PROGRAM_ID,
} from "@pump-fun/pump-sdk";

// Pump's Rust client 0.2.0, idls/pump.json / sdk/pump_v3.rs.
// The JS SDK 2.0.0 omits this instruction. V3 trading accumulates fees on
// the curve; migration to fee sharing must sweep them in the SAME transaction.
// https://docs.rs/pump-rust-client/0.2.0/pump_rust_client/pump/pump/client/accounts/struct.SweepCreatorFee.html
export function sweepCreatorFee(
  payer: PublicKey,
  mint: PublicKey,
  creator: PublicKey,
  quote: PublicKey,
  quoteProgram: PublicKey,
) {
  const curve = bondingCurvePda(mint),
    vault = creatorVaultPda(creator);
  const accounts: [PublicKey, boolean, boolean][] = [
    [payer, true, true],
    [GLOBAL_PDA, false, false],
    [mint, false, false],
    [quote, false, false],
    [quoteProgram, false, false],
    [ASSOCIATED_TOKEN_PROGRAM_ID, false, false],
    [SystemProgram.programId, false, false],
    [curve, true, false],
    [
      getAssociatedTokenAddressSync(quote, curve, true, quoteProgram),
      true,
      false,
    ],
    [vault, true, false],
    [
      getAssociatedTokenAddressSync(quote, vault, true, quoteProgram),
      true,
      false,
    ],
    [PUMP_EVENT_AUTHORITY_PDA, false, false],
    [PUMP_PROGRAM_ID, false, false],
  ];
  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: accounts.map(([pubkey, isWritable, isSigner]) => ({
      pubkey,
      isWritable,
      isSigner,
    })),
    data: Buffer.from([32, 246, 191, 52, 8, 201, 73, 186]),
  });
}
