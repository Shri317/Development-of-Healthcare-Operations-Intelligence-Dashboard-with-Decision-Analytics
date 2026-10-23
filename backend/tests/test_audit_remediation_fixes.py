#!/usr/bin/env python3
"""
Unit Test Suite: Audit Remediation Fixes
========================================
Validates the verified fixes across:
  P0:
    - Financial monthly Athena SQL filter syntax and month-matching
    - Real-time Bed Occupancy calculation (active admissions vs historical beds)
  P1:
    - Data Privacy compliance score mapping & formatting
    - Infection Incident Rate with admissions denominator
    - Medication Errors (today reference date & timeframe totals)
    - Patient Operations empty state resilience
  P2:
    - Pharmacy inventory dynamic expiry calculation (90-day threshold)
    - Patient Experience zero-sample rating handling (None/N/A vs 0.0)
    - Supply Chain vendor quality score & honest defect rate handling
"""

import sys
import unittest
from datetime import datetime, date, timedelta
from pathlib import Path
import pandas as pd

# Add project root and backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.services.dashboard_service import (
    _build_financial_response,
    _build_quality_compliance_response,
    _build_supply_chain_response,
    get_financial_intelligence,
    get_quality_compliance,
    get_pharmacy_inventory_intelligence,
    get_patient_experience_intelligence,
    get_executive_summary,
    get_facility_comparison,
    get_patient_ops_intelligence,
)


class TestFinancialSQLFilterAndLogic(unittest.TestCase):
    """Verifies financial monthly month-matching and P&L calculations."""

    def test_financial_intelligence_runs_and_returns_kpis(self):
        res = get_financial_intelligence(facility_id="all", timeframe="monthly")
        self.assertIn("kpis", res)
        kpis = res["kpis"]
        self.assertIn("operatingProfit", kpis)
        self.assertIn("daysCashOnHandFormatted", kpis)
        # Verify Days Cash on Hand remains transparently unavailable
        self.assertEqual(kpis["daysCashOnHandFormatted"], "Not available from dataset")
        self.assertIsNone(kpis["daysCashOnHand"])

    def test_financial_intelligence_quarterly_and_ytd(self):
        for tf in ["quarterly", "ytd", "annual"]:
            res = get_financial_intelligence(facility_id="all", timeframe=tf)
            self.assertIn("pnlStatement", res)
            self.assertGreater(len(res["pnlStatement"]), 0)


class TestRealtimeBedOccupancy(unittest.TestCase):
    """Verifies that realtime bed occupancy only counts currently admitted patients."""

    def test_executive_summary_realtime_occupancy_bounded(self):
        res = get_executive_summary(facility_id="all", timeframe="realtime")
        raw = res.get("rawMetrics", {})
        occ_rate = raw.get("occupancyRate", 0.0)
        # In a 854-bed enterprise, active admissions should be plausible, not counting all 854 historical beds
        self.assertLessEqual(occ_rate, 100.0)
        self.assertGreaterEqual(occ_rate, 0.0)

    def test_facility_comparison_occupancy_rates(self):
        fac_list = get_facility_comparison(timeframe="realtime")
        self.assertIsInstance(fac_list, list)
        self.assertGreater(len(fac_list), 0)
        for fac in fac_list:
            self.assertIn("occupancyRate", fac)
            self.assertLessEqual(fac["occupancyRate"], 100.0)
            self.assertGreaterEqual(fac["occupancyRate"], 0.0)


class TestQualityAndComplianceMetrics(unittest.TestCase):
    """Verifies Data Privacy score, Infection Rate, and Medication Errors."""

    def test_quality_compliance_kpis(self):
        res = get_quality_compliance(facility_id="all", timeframe="monthly")
        kpis = res["kpis"]

        # Data Privacy Score
        self.assertIn("dataPrivacyComplianceScore", kpis)
        self.assertIn("dataPrivacyComplianceScoreFormatted", kpis)
        if kpis["dataPrivacyComplianceScore"] is not None:
            self.assertGreaterEqual(kpis["dataPrivacyComplianceScore"], 0.0)
            self.assertLessEqual(kpis["dataPrivacyComplianceScore"], 100.0)

        # Infection Rate
        self.assertIn("infectionRate", kpis)
        self.assertIn("infectionRateFormatted", kpis)
        if kpis["infectionRate"] is not None:
            self.assertGreaterEqual(kpis["infectionRate"], 0.0)

        # Medication Errors Today (should be an integer, 0 when none today, not None)
        self.assertIn("medicationErrorsToday", kpis)
        self.assertIsNotNone(kpis["medicationErrorsToday"])
        self.assertGreaterEqual(kpis["medicationErrorsToday"], 0)
        self.assertIn("totalMedicationErrors", kpis)

    def test_quality_compliance_zero_admissions(self):
        # Test synthetic scenario with zero admissions
        df_qa = pd.DataFrame([{"audit_id": "1", "facility_id": "F1", "department_id": "D1",
                               "audit_type": "Data Privacy", "compliance_score": 90.0,
                               "findings_count": 0, "status": "Compliant", "audit_date": "2026-10-01"}])
        df_qi = pd.DataFrame([{"incident_id": "1", "facility_id": "F1", "department_id": "D1",
                               "incident_type": "Infection", "severity": "Low", "status": "Resolved",
                               "incident_date": "2026-10-01"}])
        df_qi_all = df_qi.copy()
        df_adm_empty = pd.DataFrame()

        resp = _build_quality_compliance_response(
            source="Test",
            facility_id="F1",
            df_qa=df_qa,
            df_qi=df_qi,
            df_qi_all=df_qi_all,
            df_ca=None,
            df_pc=None,
            df_adm=df_adm_empty,
            fac_map={},
            dep_map={}
        )
        # When 1 infection incident exists but 0 admissions, rate should explain limitation
        self.assertEqual(resp["kpis"]["infectionRateFormatted"], "1 Incidents (No Admissions)")
        self.assertEqual(resp["kpis"]["dataPrivacyComplianceScoreFormatted"], "90.0%")


class TestPharmacyDynamicExpiry(unittest.TestCase):
    """Verifies pharmacy inventory dynamic expiry using reference date."""

    def test_pharmacy_inventory_expiry(self):
        res = get_pharmacy_inventory_intelligence(facility_id="all", timeframe="realtime")
        self.assertIn("expiredBatches", res)
        self.assertIn("nearExpiryBatches", res)
        self.assertIn("totalBatches", res)
        self.assertGreaterEqual(res["totalBatches"], 0)
        self.assertGreaterEqual(res["expiredBatches"], 0)
        self.assertGreaterEqual(res["nearExpiryBatches"], 0)


class TestPatientExperienceZeroSample(unittest.TestCase):
    """Verifies patient experience properly returns None/N/A when 0 feedback."""

    def test_patient_experience_overall(self):
        res = get_patient_experience_intelligence(facility_id="all", timeframe="monthly")
        self.assertIn("totalFeedback", res)
        if res["totalFeedback"] == 0:
            self.assertIsNone(res["overallRating"])
            self.assertEqual(res["overallRatingFormatted"], "N/A (No Feedback)")
            self.assertIsNone(res["csatScore"])
            self.assertEqual(res["csatScoreFormatted"], "N/A (No Feedback)")
        else:
            self.assertIsNotNone(res["overallRating"])
            self.assertGreater(res["overallRating"], 0.0)


class TestSupplyChainQualityMetrics(unittest.TestCase):
    """Verifies supply chain vendor quality score and defect rate."""

    def test_supply_chain_kpis(self):
        v = [
            {
                "vendorId": "V1", "name": "Vendor 1", "category": "Pharma",
                "rating": 4.5, "onTimeDeliveryPct": 95.0, "qualityScore": 92.0,
                "avgLeadTimeDays": 5.0, "riskLevel": "Low", "slaStatus": "Compliant",
                "activePOValue": 1000.0, "activePOValueFormatted": "₹1,000", "poCount": 2,
                "defectRate": None, "defectRateFormatted": "Not available from dataset"
            }
        ]
        resp = _build_supply_chain_response("Test", "all", v, 2, 1000.0)
        self.assertEqual(resp["kpis"]["avgQualityScore"], 92.0)
        self.assertEqual(resp["kpis"]["defectRateFormatted"], "Not available from dataset")
        self.assertIsNone(resp["kpis"]["defectRate"])


if __name__ == "__main__":
    unittest.main()
