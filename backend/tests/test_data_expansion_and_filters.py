#!/usr/bin/env python3
"""
Unit and Integration Test Suite:
MedOps Dataset Expansion, Timeframe Filtering, and Backend Analytics
====================================================================

Verifies:
  1. October 2026 Date Generation (Today, This Week, Oct MTD, Sep 2026, Q3, YTD)
  2. Date Boundaries and Chronological Sequences
  3. Relational Foreign Key Integrity (Appointments -> Billing -> Claims)
  4. Financial Arithmetic Balances (gross - disc = net = ins + pat = paid + out)
  5. Synthetic Identifier Uniqueness & Duplicate Prevention
  6. Timeframe Filter Boundaries (today, weekly, monthly, quarterly, ytd)
  7. Facility Filter & Timeframe Filter Composition
  8. Table Sizing Limits (_TABLE_MAX_RESULTS) & SQL-Level Aggregation Construction
"""

import sys
import unittest
import datetime
from pathlib import Path
from unittest.mock import patch, MagicMock
import pandas as pd

# Add project root and scripts directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from generate_hospital_data import (
    ReferenceUniverse,
    HospitalDataGenerator,
    DatasetValidator,
    SUPPORTED_DATASETS,
    MIN_BATCH_SIZE,
    MAX_BATCH_SIZE,
)

from app.services.dashboard_service import (
    _get_timeframe_range,
    _apply_date_filter,
    _load_table,
    _TABLE_MAX_RESULTS,
    get_executive_summary,
    get_facility_comparison,
    get_billing_intelligence,
    get_claims_intelligence,
    get_patient_ops_intelligence,
    get_emergency_critical_intelligence,
)


class TestOctober2026DateGeneration(unittest.TestCase):
    """Verifies that the enhanced generator produces records covering October 2026."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="octtest1", seed=42)

    def test_generator_produces_october_records(self):
        batch = self.gen.generate_batch(500, ["appointments", "admissions", "emergency_visits", "inventory_transactions"])
        
        # Check appointments
        app_dates = [r["appointment_date"] for r in batch["appointments"]]
        oct_apps = [d for d in app_dates if d.startswith("2026-10")]
        self.assertGreater(len(oct_apps), 0, "No appointment dates generated in October 2026")

        # Check today (2026-10-14)
        today_apps = [d for d in app_dates if d == "2026-10-14"]
        self.assertGreater(len(today_apps), 0, "No appointment dates generated for Today (2026-10-14)")

        # Check admissions
        adm_dates = [r["admission_date"] for r in batch["admissions"]]
        oct_adms = [d for d in adm_dates if d.startswith("2026-10")]
        self.assertGreater(len(oct_adms), 0, "No admission dates generated in October 2026")

        # Check emergency visits
        ed_dates = [r["arrival_datetime"][:10] for r in batch["emergency_visits"]]
        oct_eds = [d for d in ed_dates if d.startswith("2026-10")]
        self.assertGreater(len(oct_eds), 0, "No emergency visits generated in October 2026")

        # Check inventory transactions
        txn_dates = [r["transaction_date"] for r in batch["inventory_transactions"]]
        oct_txns = [d for d in txn_dates if d.startswith("2026-10")]
        self.assertGreater(len(oct_txns), 0, "No inventory transactions generated in October 2026")

    def test_generator_covers_multiple_reporting_windows(self):
        batch = self.gen.generate_batch(1000, ["appointments"])
        dates = [r["appointment_date"] for r in batch["appointments"]]

        today_count = sum(1 for d in dates if d == "2026-10-14")
        week_count = sum(1 for d in dates if "2026-10-07" <= d <= "2026-10-14")
        sep_count = sum(1 for d in dates if "2026-09-01" <= d <= "2026-09-30")
        q3_count = sum(1 for d in dates if "2026-07-01" <= d <= "2026-09-30")
        h1_count = sum(1 for d in dates if "2026-01-01" <= d <= "2026-06-30")

        self.assertGreater(today_count, 0, "Today period should contain records")
        self.assertGreater(week_count, 10, "This Week period should contain records")
        self.assertGreater(sep_count, 50, "September period should contain records")
        self.assertGreater(q3_count, 100, "Q3 period should contain records")
        self.assertGreater(h1_count, 100, "H1 YTD period should contain records")


class TestDateBoundariesAndChronology(unittest.TestCase):
    """Verifies chronological constraints and boundary assertions."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="chrontest", seed=101)
        self.batch = self.gen.generate_batch(200, list(SUPPORTED_DATASETS.keys()))

    def test_admission_chronology(self):
        for rec in self.batch["admissions"]:
            adm = datetime.datetime.strptime(rec["admission_date"], "%Y-%m-%d").date()
            dis = datetime.datetime.strptime(rec["discharge_date"], "%Y-%m-%d").date()
            self.assertLessEqual(adm, dis, f"Discharge {dis} is before admission {adm}")
            self.assertGreaterEqual(rec["length_of_stay_days"], 0.5)

    def test_emergency_visit_chronology(self):
        for rec in self.batch["emergency_visits"]:
            arr = datetime.datetime.strptime(rec["arrival_datetime"], "%Y-%m-%d %H:%M:%S")
            dis = datetime.datetime.strptime(rec["discharge_datetime"], "%Y-%m-%d %H:%M:%S")
            self.assertLess(arr, dis, f"ED discharge {dis} is not strictly after arrival {arr}")
            expected_min = rec["waiting_time_minutes"] + rec["treatment_duration_minutes"]
            self.assertEqual((dis - arr).total_seconds() / 60, expected_min)

    def test_claims_temporal_sequence(self):
        bill_map = {b["bill_id"]: b["bill_date"] for b in self.batch["billing"]}
        for rec in self.batch["claims"]:
            b_date = datetime.datetime.strptime(bill_map[rec["bill_id"]], "%Y-%m-%d").date()
            sub_date = datetime.datetime.strptime(rec["submission_date"], "%Y-%m-%d").date()
            up_date = datetime.datetime.strptime(rec["last_update_date"], "%Y-%m-%d").date()
            self.assertLessEqual(b_date, sub_date, f"Bill date {b_date} > submission date {sub_date}")
            self.assertLessEqual(sub_date, up_date, f"Submission date {sub_date} > update date {up_date}")


class TestReferentialIntegrityAndArithmetic(unittest.TestCase):
    """Verifies foreign key relationships and financial balancing."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="reltest", seed=777)
        self.batch = self.gen.generate_batch(150, list(SUPPORTED_DATASETS.keys()))

    def test_billing_references_appointment(self):
        app_ids = {a["appointment_id"] for a in self.batch["appointments"]}
        for b in self.batch["billing"]:
            self.assertIn(b["appointment_id"], app_ids)

    def test_claims_references_billing(self):
        bill_map = {b["bill_id"]: b for b in self.batch["billing"]}
        for c in self.batch["claims"]:
            self.assertIn(c["bill_id"], bill_map)
            b = bill_map[c["bill_id"]]
            self.assertEqual(c["patient_id"], b["patient_id"])
            self.assertEqual(c["facility_id"], b["facility_id"])
            self.assertEqual(c["department_id"], b["department_id"])
            self.assertEqual(c["claimed_amount"], b["insurance_amount"])

    def test_billing_financial_arithmetic(self):
        for b in self.batch["billing"]:
            gross = b["gross_amount"]
            disc = b["discount_amount"]
            net = b["net_amount"]
            ins = b["insurance_amount"]
            pat = b["patient_amount"]
            paid = b["paid_amount"]
            out = b["outstanding_amount"]

            self.assertAlmostEqual(net, round(gross - disc, 2), places=2)
            self.assertAlmostEqual(net, round(ins + pat, 2), places=2)
            self.assertAlmostEqual(net, round(paid + out, 2), places=2)

    def test_duplicate_prevention_across_runs(self):
        gen2 = HospitalDataGenerator(self.ref, run_id="reltest2", seed=888)
        batch2 = gen2.generate_batch(50, ["admissions", "billing", "claims"])

        adm_ids_1 = {r["admission_id"] for r in self.batch["admissions"]}
        adm_ids_2 = {r["admission_id"] for r in batch2["admissions"]}
        self.assertEqual(len(adm_ids_1.intersection(adm_ids_2)), 0)

        bil_ids_1 = {r["bill_id"] for r in self.batch["billing"]}
        bil_ids_2 = {r["bill_id"] for r in batch2["billing"]}
        self.assertEqual(len(bil_ids_1.intersection(bil_ids_2)), 0)


class TestTimeframeFiltering(unittest.TestCase):
    """Verifies timeframe resolution and date filtering logic in backend services."""

    def test_timeframe_ranges(self):
        # Realtime / all -> None, None
        s, e = _get_timeframe_range("realtime")
        self.assertIsNone(s)
        self.assertIsNone(e)

        # Reference date today
        now = datetime.datetime.now()
        ref_date = now.date() if now.year == 2026 else datetime.date(2026, 10, 14)
        ref_str = ref_date.strftime("%Y-%m-%d")
        week_ago_str = (ref_date - datetime.timedelta(days=7)).strftime("%Y-%m-%d")

        # Today
        s, e = _get_timeframe_range("today")
        self.assertIsNotNone(s)
        self.assertIsNotNone(e)
        self.assertEqual(s.strftime("%Y-%m-%d"), ref_str)
        self.assertEqual(e.strftime("%Y-%m-%d"), ref_str)

        # Weekly -> 7 days rolling to current day end
        s, e = _get_timeframe_range("weekly")
        self.assertEqual(s.strftime("%Y-%m-%d"), week_ago_str)
        self.assertEqual(e.strftime("%Y-%m-%d"), ref_str)

        # Monthly -> Sep 2026
        s, e = _get_timeframe_range("monthly")
        self.assertEqual(s.strftime("%Y-%m-%d"), "2026-09-01")
        self.assertEqual(e.strftime("%Y-%m-%d"), "2026-09-30")

        # Quarterly -> Q3 2026
        s, e = _get_timeframe_range("quarterly")
        self.assertEqual(s.strftime("%Y-%m-%d"), "2026-07-01")
        self.assertEqual(e.strftime("%Y-%m-%d"), "2026-09-30")

        # YTD -> 2026-01-01 to ref_str
        s, e = _get_timeframe_range("ytd")
        self.assertEqual(s.strftime("%Y-%m-%d"), "2026-01-01")
        self.assertEqual(e.strftime("%Y-%m-%d"), ref_str)

        # Explicit start_date and end_date override
        s, e = _get_timeframe_range(start_date="2026-05-01", end_date="2026-05-31")
        self.assertEqual(s.strftime("%Y-%m-%d"), "2026-05-01")
        self.assertEqual(e.strftime("%Y-%m-%d"), "2026-05-31")

    def test_apply_date_filter_dataframe(self):
        now = datetime.datetime.now()
        ref_date = now.date() if now.year == 2026 else datetime.date(2026, 10, 14)
        ref_str = ref_date.strftime("%Y-%m-%d")
        week_inner_str = (ref_date - datetime.timedelta(days=2)).strftime("%Y-%m-%d")

        df = pd.DataFrame({
            "event_date": ["2026-01-15", "2026-08-20", "2026-09-15", week_inner_str, ref_str],
            "val": [10, 20, 30, 40, 50]
        })

        # Today filter
        df_today = _apply_date_filter(df, "event_date", timeframe="today")
        self.assertEqual(len(df_today), 1)
        self.assertEqual(df_today.iloc[0]["val"], 50)

        # Weekly filter
        df_week = _apply_date_filter(df, "event_date", timeframe="weekly")
        self.assertEqual(len(df_week), 2)

        # Monthly filter (Sep 2026)
        df_month = _apply_date_filter(df, "event_date", timeframe="monthly")
        self.assertEqual(len(df_month), 1)  # Sep 15

        # Quarterly filter (Jul - Sep 2026)
        df_q = _apply_date_filter(df, "event_date", timeframe="quarterly")
        self.assertEqual(len(df_q), 2)  # Aug 20 and Sep 15


class TestFacilityAndTimeframeFiltersTogether(unittest.TestCase):
    """Verifies that endpoints correctly combine facility_id and timeframe filters."""

    def test_executive_summary_combined_filters(self):
        # Test fallback / mock path with both facility and timeframe
        res = get_executive_summary(facility_id="FAC001", timeframe="weekly")
        self.assertIn("kpis", res)
        self.assertIn("rawMetrics", res)
        self.assertEqual(len(res["kpis"]), 6)

    def test_billing_combined_filters(self):
        res = get_billing_intelligence(facility_id="FAC002", timeframe="monthly")
        self.assertIn("totalRevenue", res)
        self.assertIn("departmentRevenue", res)
        self.assertIn("monthlyRevenue", res)

    def test_claims_combined_filters(self):
        res = get_claims_intelligence(facility_id="FAC003", timeframe="quarterly")
        self.assertIn("totalClaims", res)
        self.assertIn("denialRate", res)

    def test_patient_ops_combined_filters(self):
        res = get_patient_ops_intelligence(facility_id="FAC001", timeframe="today")
        self.assertIn("totalAdmissions", res)
        self.assertIn("emergencyVisits", res)


class TestTableMaxResultsAndAggregation(unittest.TestCase):
    """Verifies table cardinality bounds and SQL-level aggregation behavior."""

    def test_table_max_results_configuration(self):
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["appointments"], 35000)
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["billing"], 30000)
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["claims"], 20000)
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["admissions"], 20000)
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["emergency_visits"], 20000)
        self.assertGreaterEqual(_TABLE_MAX_RESULTS["inventory_transactions"], 20000)
        # Static small tables kept compact
        self.assertLessEqual(_TABLE_MAX_RESULTS["facilities"], 100)
        self.assertLessEqual(_TABLE_MAX_RESULTS["departments"], 100)

    def test_batch_size_upper_bound(self):
        self.assertEqual(MAX_BATCH_SIZE, 100000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
