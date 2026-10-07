# ZEC pairs and compute funding

Updated October 6, 2026. This supplements the blueprint with the user's latest requirements.

## Product requirements

Each agent's Pump token should launch against ZEC on Solana. The user requested a 3% total fee and a 1% buy/sell allocation to the platform for compute. An outstanding clarification asks whether that means 3% on each direction with 1 percentage point for shared compute, and where the remaining 2 points belong. No unconfirmed split has been finalized.

The earlier instruction earmarking agent fees for that agent still guides its dedicated compute share. The main token continues funding shared compute and ZEC research rewards. Pairing with ZEC does not make the agent token redeemable for a fixed amount of ZEC or make its trades private.

## Verified on-chain configuration

A read-only `getMultipleAccounts` call at finalized slot **454018869** returned Pump-owned accounts matching the pinned official IDL discriminators and layouts:

| Item | Observation |
|---|---|
| Pump global | `4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf` |
| Quote-control | `6z6GDdfb2AjR9ZhJmAUQ5cipJCVxQvLJhB2H8mCwTFBP` |
| ZEC mint present in quote-control | `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS` |
| ZEC initial virtual quote reserves | 241,038,965 base units, or 2.41038965 ZEC at 8 decimals |
| Custom creator fees enabled | true |
| Maximum custom creator fee | 300 basis points, or 3% |

Virtual reserves are curve parameters, not deposited ZEC or a compute balance. The configuration can change; refresh it for each launch quote. The snapshot does not audit the bridge or demonstrate successful creation/trading.

Evidence: [raw RPC and decoded snapshot](pump-config-snapshot.json), [read-only inspection script](inspect-pump-config.py), [pinned official Pump IDL](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/idl/pump.json). The local decoder is a research aid; use a maintained SDK for production.

The IDL documents passing the quote mint, its curve token account, token program, and quote-control account for assets admitted through quote-control. Custom creator fees require the configurable flag and a permitted nonzero rate. PumpSwap documents carrying the custom creator fee through migration. Neither statement proves our complete launch and distribution flow has been tested. [Migration and custom fees](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/docs/PUMP_SWAP_README.md)

## Making a 3% claim accurate

Model the quote-side trading fees as separate protocol, liquidity-provider, creator, and any additional integrator components. Determine the exact charging basis and integer rounding from the actual route. The total must include all of them; network fees, rent, price impact and slippage must be shown separately.

Setting `creator_fee_bps=300` specifies the creator component. It does not by itself impose an all-inclusive 3% total. If other charges consume part of a 3% total, only the remainder is available for our shared and agent compute allocations. Do not label all 3% as platform revenue.

Illustration only: on 100 ZEC of eligible fee-basis volume, 1 percentage point is 1 ZEC. Taking 1% of a 3-ZEC fee pot would instead produce 0.03 ZEC. Fee-sharing percentages apply to collected creator fees, so they must be derived from the available creator component, with explicit rounding and reconciliation. Never hard-code a one-third split until the actual fee basis is established.

Before finalizing launch configuration, simulate buys and sells before and after graduation, including small and large amounts. Record payer changes, curve/pool reserves, creator vault receipts, protocol/LP components and both compute destinations. Check quote-token distribution support explicitly. A frontend surcharge is bypassable through direct program calls. Pool fees apply to trades in that pool; they do not automatically tax transfers or trades through other pools.

If the supported Pump route cannot produce the requested total and allocation, keep that discrepancy visible and choose a revised fee policy or different launch mechanism with the user. Do not silently increase the total.

## Liquidity and compute logistics

The launch quote must distinguish setup/service payment, initial compute funding, rent/network costs and any optional token purchase. Buying on a ZEC curve requires the exact approved ZEC mint plus enough SOL for chain costs. Verify the canonical post-graduation pool retains that quote mint. A separately seeded secondary pool would need real agent tokens and ZEC; its liquidity funding cannot be borrowed from promised compute credits.

Collect quote-denominated fees, reconcile finalized receipts, and allocate them under the per-agent policy. Convert the compute allocation periodically through bounded, allowlisted treasury transactions into the vendor's supported payment method. Credit spendable compute from realized net proceeds, accounting for conversion costs and reserving gas. Do not promise dollar compute against an unconverted volatile ZEC balance.

Keep launch-funded initial sessions available even if there is no trading. Stop new jobs when their funded budgets run out. Hold reward inventory separately from compute liabilities; shared compute receipts from child tokens are not automatically reward money.

Acceptance gates: exact mint allowlist; supported custom fee configuration; successful creation; correct recipient shares; ZEC buy and sell reconciliation; canonical graduation; post-graduation fee collection; direct-program trading behavior; realistic slippage; paused behavior on configuration changes; zero-volume compute funding; and sufficient SOL for collection/conversion operations.
