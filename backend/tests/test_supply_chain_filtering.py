#!/usr/bin/env python3
"""
Unit and Integration Test:
Supply Chain & Vendor Management Facility Filtering Verification
"""

import sys
import unittest
from pathlib import Path

# Add project root and backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.services.dashboard_service import get_supply_chain_vendors

class TestSupplyChainFacilityFiltering(unittest.TestCase):
    """Verifies that get_supply_chain_vendors correctly updates across facilities."""

    def test_all_facilities_scope(self):
        res = get_supply_chain_vendors(facility_id="all", timeframe="realtime")
        self.assertIn("kpis", res)
        self.assertIn("vendors", res)
        kpis = res["kpis"]
        
        self.assertEqual(kpis["totalVendors"], 40)
        self.assertEqual(kpis["totalPOCount"], 1566)
        self.assertAlmostEqual(kpis["totalPOValue"], 453496085.12, delta=1.0)
        self.assertEqual(kpis["compliantVendors"], 25)
        self.assertEqual(kpis["avgQualityScore"], 84.9)
        self.assertEqual(len(res["vendors"]), 40)
        self.assertEqual(kpis["defectRateFormatted"], "Not available from dataset")

    def test_facility_one_filtering(self):
        res = get_supply_chain_vendors(facility_id="FAC001", timeframe="realtime")
        kpis = res["kpis"]
        
        self.assertEqual(res["facilityId"], "FAC001")
        self.assertEqual(kpis["totalVendors"], 40)
        self.assertEqual(kpis["totalPOCount"], 331)
        self.assertAlmostEqual(kpis["totalPOValue"], 93620762.84, delta=1.0)
        self.assertEqual(kpis["compliantVendors"], 25)
        self.assertEqual(kpis["avgOnTimeDeliveryPct"], 37.8)
        self.assertEqual(kpis["avgQualityScore"], 84.9)

    def test_facility_two_filtering(self):
        res = get_supply_chain_vendors(facility_id="FAC002", timeframe="realtime")
        kpis = res["kpis"]
        
        self.assertEqual(res["facilityId"], "FAC002")
        self.assertEqual(kpis["totalVendors"], 40)
        self.assertEqual(kpis["totalPOCount"], 306)
        self.assertAlmostEqual(kpis["totalPOValue"], 77346424.32, delta=1.0)
        self.assertEqual(kpis["compliantVendors"], 25)
        self.assertEqual(kpis["avgOnTimeDeliveryPct"], 41.2)
        self.assertEqual(kpis["avgQualityScore"], 84.9)

    def test_hyphenated_facility_id_normalization(self):
        res_canon = get_supply_chain_vendors(facility_id="FAC001", timeframe="realtime")
        res_hyphen = get_supply_chain_vendors(facility_id="FAC-001", timeframe="realtime")
        
        self.assertEqual(res_hyphen["facilityId"], "FAC001")
        self.assertEqual(res_canon["kpis"]["totalPOCount"], res_hyphen["kpis"]["totalPOCount"])
        self.assertEqual(res_canon["kpis"]["totalPOValue"], res_hyphen["kpis"]["totalPOValue"])
        self.assertEqual(res_canon["kpis"]["avgOnTimeDeliveryPct"], res_hyphen["kpis"]["avgOnTimeDeliveryPct"])

    def test_facility_and_timeframe_combination(self):
        res_m = get_supply_chain_vendors(facility_id="FAC001", timeframe="monthly")
        kpis_m = res_m["kpis"]
        
        self.assertEqual(kpis_m["totalVendors"], 3)
        self.assertEqual(kpis_m["totalPOCount"], 3)
        self.assertAlmostEqual(kpis_m["totalPOValue"], 855553.28, delta=1.0)
        self.assertEqual(kpis_m["compliantVendors"], 1)  # VND022 (Low) [VND003=High, VND027=Medium]
        self.assertEqual(len(res_m["vendors"]), 3)

    def test_unknown_facility_empty_state(self):
        res_empty = get_supply_chain_vendors(facility_id="FAC999", timeframe="realtime")
        kpis_e = res_empty["kpis"]
        
        self.assertEqual(kpis_e["totalVendors"], 0)
        self.assertEqual(kpis_e["totalPOCount"], 0)
        self.assertEqual(kpis_e["totalPOValue"], 0.0)
        self.assertEqual(kpis_e["compliantVendors"], 0)
        self.assertEqual(len(res_empty["vendors"]), 0)

if __name__ == "__main__":
    unittest.main()
