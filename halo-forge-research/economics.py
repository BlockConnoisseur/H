"""Planning model, not a revenue forecast or provider quote.

Run: python economics.py
Reads no credentials, makes no network calls, and writes only economics-output.json.
All monetary calculations use Decimal. Update assumptions after the pilot.
"""

from decimal import Decimal, ROUND_FLOOR
from pathlib import Path
import json


def d(value):
    return Decimal(str(value))


RATES = {
    "input_usd_per_million": d("4"),
    "output_usd_per_million": d("20"),
    "active_vcpu_hour_usd": d("0.128"),
    "provisioned_gb_hour_usd": d("0.0212"),
    "evaluator_worker_hour_usd_assumption": d("1.50"),
    "contingency_fraction": d("0.20"),
}

PROFILES = {
    "light": {
        "calls": 10, "input_tokens_per_call": 20000,
        "billable_output_tokens_per_call": 800,
        "active_vcpu_hours": "0.5", "provisioned_gb_hours": "2",
        "evaluator_worker_hours": "0.25",
    },
    "standard": {
        "calls": 40, "input_tokens_per_call": 60000,
        "billable_output_tokens_per_call": 2000,
        "active_vcpu_hours": "4", "provisioned_gb_hours": "16",
        "evaluator_worker_hours": "0.75",
    },
    "deep": {
        "calls": 100, "input_tokens_per_call": 100000,
        "billable_output_tokens_per_call": 4000,
        "active_vcpu_hours": "16", "provisioned_gb_hours": "64",
        "evaluator_worker_hours": "2",
    },
}


def session_cost(profile):
    if any(d(v) < 0 for v in profile.values()):
        raise ValueError("Usage quantities cannot be negative")
    million = d(1_000_000)
    input_tokens = d(profile["calls"]) * d(profile["input_tokens_per_call"])
    output_tokens = d(profile["calls"]) * d(profile["billable_output_tokens_per_call"])
    parts = {
        "model_input_usd": input_tokens / million * RATES["input_usd_per_million"],
        "model_output_usd": output_tokens / million * RATES["output_usd_per_million"],
        "builder_cpu_usd": d(profile["active_vcpu_hours"]) * RATES["active_vcpu_hour_usd"],
        "builder_memory_usd": d(profile["provisioned_gb_hours"]) * RATES["provisioned_gb_hour_usd"],
        "evaluator_usd_assumption": d(profile["evaluator_worker_hours"]) * RATES["evaluator_worker_hour_usd_assumption"],
    }
    parts["subtotal_usd"] = sum(parts.values(), d(0))
    parts["with_contingency_usd"] = parts["subtotal_usd"] * (1 + RATES["contingency_fraction"])
    return parts


def capacity(eligible_volume_usd, effective_creator_fee, session_allowance_usd=d(16)):
    fee = d(effective_creator_fee)
    volume = d(eligible_volume_usd)
    allowance = d(session_allowance_usd)
    if not d(0) <= fee <= d(1) or volume < 0 or allowance <= 0:
        raise ValueError("Invalid scenario")
    revenue = volume * fee
    compute = revenue * d("0.60")
    return {
        "eligible_volume_usd": volume,
        "effective_creator_fee_fraction_assumption": fee,
        "gross_creator_revenue_usd": revenue,
        "main_compute_usd": compute,
        "reward_allocation_usd_before_zec_purchase": revenue * d("0.25"),
        "operations_verification_reserve_usd": revenue * d("0.15"),
        "funded_sessions_before_other_costs": int((compute / allowance).to_integral_value(rounding=ROUND_FLOOR)),
    }


def check_model():
    # Independently hand-calculated cases and zero-revenue boundary.
    standard = session_cost(PROFILES["standard"])
    assert standard["model_input_usd"] == d("9.6")
    assert standard["model_output_usd"] == d("1.6")
    assert standard["subtotal_usd"] == d("13.1762")
    assert standard["with_contingency_usd"] == d("15.81144")
    assert capacity(0, "0.003")["funded_sessions_before_other_costs"] == 0
    base = capacity(100000, "0.003")
    assert base["gross_creator_revenue_usd"] == d(300)
    assert base["funded_sessions_before_other_costs"] == 11
    assert (base["main_compute_usd"] + base["reward_allocation_usd_before_zec_purchase"]
            + base["operations_verification_reserve_usd"]) == base["gross_creator_revenue_usd"]


def main():
    check_model()
    output = {
        "prepared_date": "2026-10-06",
        "kind": "ILLUSTRATIVE_PLANNING_ASSUMPTIONS_NOT_MEASURED_BILLS",
        "rate_sources": {
            "model_reference": "https://vercel.com/ai-gateway/models/gpt-6-sol-fast",
            "sandbox_iad1": "https://vercel.com/docs/sandbox/pricing",
            "creator_fee_schedule": "https://pump.fun/docs/fees",
        },
        "rates": RATES,
        "profiles": {name: {"usage_assumptions": profile, "cost": session_cost(profile)}
                     for name, profile in PROFILES.items()},
        "daily_revenue_scenarios": [capacity(volume, fee)
            for volume in (0, 10000, 100000, 1000000)
            for fee in ("0.0005", "0.003", "0.0095")],
        "fifty_sessions_daily": {
            "compute_allowance_usd": d(50) * d(16),
            "required_main_creator_revenue_usd": d(50) * d(16) / d("0.60"),
            "eligible_volume_at_0_30_percent": d(50) * d(16) / d("0.60") / d("0.003"),
            "eligible_volume_at_0_05_percent": d(50) * d(16) / d("0.60") / d("0.0005"),
        },
        "exclusions": ["human cryptographic review", "engineering", "support",
            "monthly platform minimums", "legal and accounting", "taxes",
            "Solana rent and transaction fees", "swap fees and price impact",
            "storage and egress", "bridge costs", "reward inventory price movements"],
        "notes": [
            "Output includes billable reasoning; measured provider usage must replace token assumptions.",
            "No prompt-cache discounts assumed. Actual provider/long-context prices may differ.",
            "Eligible volume is volume that actually earns the specified creator fee.",
            "Child-token revenue is excluded from main-token scenarios and earmarked 100% for its agent.",
            "Reference model price is not a claim that this model is the best research worker.",
        ],
    }
    text = json.dumps(output, indent=2, default=str)
    destination = Path(__file__).with_name("economics-output.json")
    destination.write_text(text + "\n", encoding="utf-8")
    for name in PROFILES:
        print(name, session_cost(PROFILES[name])["with_contingency_usd"])
    print("Arithmetic checks passed; wrote", destination.name)


if __name__ == "__main__":
    main()
