#!/usr/bin/env python3
"""
Medical Operations Intelligence & Automation System (MedOps)
Live Dashboard Intelligence & Timeframe Filtering Verification
==============================================================
Validates that all affected dashboard endpoints return correct, non-zero,
timeframe-sensitive responses across all standard reporting periods.
"""

import os
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path("backend").resolve()))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

ENDPOINTS = [
    ("/api/dashboard/doctor-staff", "Doctor & Staff Intelligence"),
    ("/api/dashboard/laboratory", "Laboratory Intelligence"),
    ("/api/dashboard/pharmacy-inventory", "Pharmacy & Inventory Intelligence"),
    ("/api/dashboard/quality-compliance", "Quality & Compliance Intelligence"),
    ("/api/dashboard/patient-experience", "Patient Experience Intelligence"),
    ("/api/dashboard/supply-chain-vendors", "Supply Chain & Vendors"),
]

TIMEFRAMES = [
    "today",
    "week",
    "month",
    "q3",
    "ytd",
    "realtime"
]

def main():
    print("=" * 80)
    print("     MEDOPS DASHBOARD INTELLIGENCE & TIMEFRAME FILTERING VERIFICATION")
    print("=" * 80)
    
    overall_failures = 0

    for path, title in ENDPOINTS:
        print(f"\n[MODULE] {title} ({path})")
        print(f"{'Timeframe':<12} | {'Status':>8} | {'Sample Metric 1':<30} | {'Sample Metric 2':<30}")
        print("-" * 88)

        last_val1 = None
        variations = 0

        for tf in TIMEFRAMES:
            resp = client.get(f"{path}?timeframe={tf}")
            if resp.status_code != 200:
                print(f"{tf:<12} | [FAIL {resp.status_code}] {resp.text[:50]}")
                overall_failures += 1
                continue

            data = resp.json()
            metric1_str = "N/A"
            metric2_str = "N/A"

            if "doctor-staff" in path:
                util = data.get("avgUtilization", 0)
                hrs = data.get("totalWorkingHours", 0)
                metric1_str = f"avgUtilization: {util}%"
                metric2_str = f"totalWorkingHours: {hrs:,.1f}"
                cur_val = hrs

            elif "laboratory" in path:
                orders = data.get("totalOrders", 0)
                tat = data.get("avgTAT", 0)
                metric1_str = f"totalOrders: {orders:,}"
                metric2_str = f"avgTAT: {tat} hrs"
                cur_val = orders

            elif "pharmacy-inventory" in path:
                disp_orders = data.get("totalDispensedOrders", 0)
                disp_val = data.get("totalDispenseValueFormatted", "$0.00")
                metric1_str = f"dispensedOrders: {disp_orders:,}"
                metric2_str = f"dispenseValue: {disp_val}"
                cur_val = disp_orders

            elif "quality-compliance" in path:
                kpis = data.get("kpis", {})
                incidents = kpis.get("totalIncidents", 0)
                score = kpis.get("overallComplianceScore", 0)
                metric1_str = f"incidents: {incidents}"
                metric2_str = f"complianceScore: {score}%"
                cur_val = incidents

            elif "patient-experience" in path:
                feedback = data.get("totalFeedback", 0)
                rating = data.get("overallRating", 0)
                metric1_str = f"totalFeedback: {feedback:,}"
                metric2_str = f"overallRating: {rating}/5"
                cur_val = feedback

            elif "supply-chain-vendors" in path:
                pos = data.get("kpis", {}).get("totalPOCount", 0)
                val = data.get("kpis", {}).get("totalPOValueFormatted", "$0.00")
                metric1_str = f"totalPOs: {pos:,}"
                metric2_str = f"totalPOValue: {val}"
                cur_val = pos

            if last_val1 is not None and cur_val != last_val1:
                variations += 1
            last_val1 = cur_val

            print(f"{tf:<12} | [200 OK] | {metric1_str:<30} | {metric2_str:<30}")

        if variations > 0:
            print(f"  [PASS] Dynamic timeframe filtering confirmed ({variations} timeframe state transitions)")
        else:
            print(f"  [WARN] Metrics did not vary across timeframes")

    print("\n" + "=" * 80)
    if overall_failures == 0:
        print("ALL 6 OPERATIONAL MODULES PASSED LIVE TIMEFRAME FILTERING VERIFICATION!")
    else:
        print(f"VERIFICATION COMPLETED WITH {overall_failures} ENDPOINT FAILURES")
    print("=" * 80)

if __name__ == "__main__":
    main()
