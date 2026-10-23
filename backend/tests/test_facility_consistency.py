import unittest
from unittest.mock import patch, MagicMock

from app.services.facility_resolver import (
    AUTHORITATIVE_FACILITIES,
    LEGACY_FACILITY_ALIASES,
    normalize_facility_id,
    get_facility_canonical_name,
    get_facility_display_label,
    get_authoritative_facility_map,
    get_all_canonical_facilities,
    validate_and_sanitize_ai_response
)
from app.services.ai_service import (
    generate_executive_summary_insights,
    _build_deterministic_executive_insights
)
from app.services.copilot_service import process_copilot_query


class TestFacilityResolverMapping(unittest.TestCase):
    """Verifies that the authoritative facility lookup correctly resolves all 5 facilities."""

    EXPECTED_MAPPINGS = {
        'FAC001': 'Hyderabad Central Hospital',
        'FAC002': 'Hyderabad West Clinic',
        'FAC003': 'Secunderabad Medical Center',
        'FAC004': 'Bengaluru Care Hospital',
        'FAC005': 'Chennai Health Center',
        'all': 'All Network Facilities'
    }

    def test_all_five_facilities_canonical_names(self):
        """Ensure all 5 facilities and network scope match the expected authoritative names."""
        for fac_id, expected_name in self.EXPECTED_MAPPINGS.items():
            resolved = get_facility_canonical_name(fac_id)
            self.assertEqual(resolved, expected_name, f"Facility {fac_id} resolved to {resolved}, expected {expected_name}")

    def test_all_five_facilities_display_labels(self):
        """Ensure display labels follow the format 'Name (ID)' or 'All Network Facilities'."""
        self.assertEqual(get_facility_display_label('all'), 'All Network Facilities')
        self.assertEqual(get_facility_display_label('FAC001'), 'Hyderabad Central Hospital (FAC001)')
        self.assertEqual(get_facility_display_label('FAC002'), 'Hyderabad West Clinic (FAC002)')
        self.assertEqual(get_facility_display_label('FAC003'), 'Secunderabad Medical Center (FAC003)')
        self.assertEqual(get_facility_display_label('FAC004'), 'Bengaluru Care Hospital (FAC004)')
        self.assertEqual(get_facility_display_label('FAC005'), 'Chennai Health Center (FAC005)')

    def test_normalization_variations(self):
        """Ensure normalize_facility_id handles case variations, hyphens, and numeric strings."""
        self.assertEqual(normalize_facility_id('fac001'), 'FAC001')
        self.assertEqual(normalize_facility_id('fac-001'), 'FAC001')
        self.assertEqual(normalize_facility_id('1'), 'FAC001')
        self.assertEqual(normalize_facility_id('FAC-003'), 'FAC003')
        self.assertEqual(normalize_facility_id('3'), 'FAC003')
        self.assertEqual(normalize_facility_id('fac005'), 'FAC005')
        self.assertEqual(normalize_facility_id('5'), 'FAC005')
        self.assertEqual(normalize_facility_id('ALL'), 'all')
        self.assertEqual(normalize_facility_id(''), 'all')
        self.assertEqual(normalize_facility_id(None), 'all')

    def test_unknown_facility_id_safety(self):
        """Ensure unknown facility ID does not invent names but reports verified ID."""
        self.assertEqual(get_facility_canonical_name('FAC999'), 'Facility FAC999')
        self.assertEqual(get_facility_display_label('FAC999'), 'Facility FAC999')

    def test_get_all_canonical_facilities_list(self):
        """Ensure all canonical facilities list returns 5 complete facility records."""
        facilities = get_all_canonical_facilities()
        self.assertEqual(len(facilities), 5)
        ids = [f['id'] for f in facilities]
        self.assertEqual(ids, ['FAC001', 'FAC002', 'FAC003', 'FAC004', 'FAC005'])


class TestFacilitySanitization(unittest.TestCase):
    """Verifies that AI responses hallucinating legacy aliases are sanitized while preserving numbers."""

    def test_legacy_aliases_replaced(self):
        """Ensure each legacy hospital name is sanitized to its canonical counterpart."""
        test_cases = [
            ("Metro Health Center", "Hyderabad Central Hospital", "FAC001"),
            ("Metro Health Center (FAC001)", "Hyderabad Central Hospital (FAC001)", "FAC001"),
            ("St. Jude Community Hospital", "Hyderabad West Clinic", "FAC002"),
            ("Highland Regional Medical Center", "Secunderabad Medical Center", "FAC003"),
            ("Valley Childrens & Specialty Clinic", "Bengaluru Care Hospital", "FAC004"),
            ("Valley Children's & Specialty Clinic", "Bengaluru Care Hospital", "FAC004"),
            ("Lakeside Memorial Hospital", "Chennai Health Center", "FAC005"),
        ]
        for legacy, canonical, fac_id in test_cases:
            text = f"Recent clinical records from {legacy} indicate strong performance."
            sanitized = validate_and_sanitize_ai_response(text, fac_id)
            self.assertIn(canonical, sanitized)
            self.assertNotIn(legacy, sanitized)

    def test_metric_and_financial_integrity_preserved(self):
        """Ensure percentages, currencies, integers, and decimals are not corrupted by sanitization."""
        text = (
            "Metro Health Center reported 78.4% occupancy, 1,240 admissions, "
            "and realized ₹3,276,512.89 in revenue with a 9.2% denial rate."
        )
        sanitized = validate_and_sanitize_ai_response(text, "FAC001")
        self.assertIn("Hyderabad Central Hospital", sanitized)
        self.assertNotIn("Metro Health Center", sanitized)
        # Verify clinical & financial integrity
        self.assertIn("78.4%", sanitized)
        self.assertIn("1,240", sanitized)
        self.assertIn("₹3,276,512.89", sanitized)
        self.assertIn("9.2%", sanitized)

    def test_scope_switching_sanitizes_mismatched_facility_names(self):
        """If AI mistakenly mentions a different facility when scoped to FAC002, ensure it corrects it."""
        text = "Operational review for Metro Health Center shows low stock."
        sanitized = validate_and_sanitize_ai_response(text, "FAC002")
        self.assertIn("Hyderabad West Clinic", sanitized)
        self.assertNotIn("Metro Health Center", sanitized)


class TestAIServiceFacilityConsistency(unittest.TestCase):
    """Verifies that executive summary insights consistently identify facilities."""

    def setUp(self):
        self.mock_metrics = {
            "totalAdmissions": 2912,
            "avgLOS": 4.2,
            "totalRevenue": 17524000.0,
            "denialRate": 9.8,
            "avgEDWait": 38.5,
            "occupancyRate": 85.2,
            "source": "Local Dataset"
        }

    def test_all_five_facilities_deterministic_insights(self):
        """Verify deterministic generation sets canonical names for all 5 facilities."""
        for fac_id, expected_name in TestFacilityResolverMapping.EXPECTED_MAPPINGS.items():
            norm_id = normalize_facility_id(fac_id)
            canonical_name = get_facility_canonical_name(norm_id)
            label = get_facility_display_label(norm_id)
            insights = _build_deterministic_executive_insights(self.mock_metrics, canonical_name)
            self.assertIn(canonical_name, insights["executive_brief"])
            self.assertNotIn("Metro Health", insights["executive_brief"] if norm_id != 'FAC001' else "")

    def test_hallucination_defense_in_executive_summary(self):
        """Mock Gemini returning a hallucinated legacy name, ensure it is sanitized in output."""
        mock_hallucinated_json = (
            '{"executive_brief": "Metro Health Center is experiencing high inpatient load with 85.2% occupancy.", '
            '"key_trends": ["Metro Health Center admissions trending up"], '
            '"operational_concerns": ["Overtime at Metro Health"], '
            '"management_recommendations": ["Reallocate nurses at Metro Health Center"], '
            '"observations": ["Metro Health operations stable"]}'
        )

        with patch('app.services.ai_service.get_ai_provider') as mock_prov_fn:
            mock_prov = MagicMock()
            mock_prov.get_provider_name.return_value = "Google Gemini"
            mock_prov.invoke.return_value = {
                'status': 'success',
                'provider': 'Google Gemini',
                'modelId': 'gemini-3.1-flash-lite',
                'summary': mock_hallucinated_json,
                'errorMessage': None
            }
            mock_prov_fn.return_value = mock_prov

            result = generate_executive_summary_insights(self.mock_metrics, facility_id="FAC001")

            self.assertEqual(result["facility_id"], "FAC001")
            self.assertEqual(result["facility_name"], "Hyderabad Central Hospital")
            self.assertIn("Hyderabad Central Hospital", result["executive_brief"])
            self.assertNotIn("Metro Health Center", result["executive_brief"])
            self.assertIn("Hyderabad Central Hospital", result["key_trends"][0])
            self.assertNotIn("Metro Health Center", result["key_trends"][0])


class TestCopilotFacilityConsistency(unittest.TestCase):
    """Verifies that Copilot queries correctly identify facilities across all domains."""

    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_copilot_conversational_facility_context(self, mock_ai):
        """Ensure greeting query returns correct canonical facility in response."""
        mock_ai.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': 'Hello! I am your MedOps AI Assistant for Hyderabad Central Hospital (FAC001). How can I assist you?',
            'errorMessage': None
        }
        res = process_copilot_query("Hello there", facility_id="FAC001")
        self.assertEqual(res["facility_id"], "FAC001")
        self.assertEqual(res["facility_name"], "Hyderabad Central Hospital")
        self.assertEqual(res["facility_label"], "Hyderabad Central Hospital (FAC001)")
        self.assertIn("Hyderabad Central Hospital", res["answer"])
        self.assertNotIn("Metro Health", res["answer"])

    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_copilot_switching_facilities(self, mock_ai):
        """Verify switching from FAC001 to FAC004 updates facility context completely."""
        mock_ai.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': 'Hello! I am your MedOps Operations AI Assistant for Hyderabad Central Hospital (FAC001).',
            'errorMessage': None
        }
        res_fac1 = process_copilot_query("Hello", facility_id="FAC001")
        self.assertIn("Hyderabad Central Hospital", res_fac1["answer"])
        self.assertNotIn("Bengaluru Care Hospital", res_fac1["answer"])

        mock_ai.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': 'Hello! I am your MedOps Operations AI Assistant for Bengaluru Care Hospital (FAC004).',
            'errorMessage': None
        }
        res_fac4 = process_copilot_query("Hello", facility_id="FAC004")
        self.assertIn("Bengaluru Care Hospital", res_fac4["answer"])
        self.assertNotIn("Hyderabad Central Hospital", res_fac4["answer"])

    @patch('app.services.copilot_service.get_claims_intelligence')
    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_copilot_hallucination_sanitization(self, mock_ai, mock_claims):
        """Ensure if an LLM returns a legacy name during operational query, it gets sanitized."""
        mock_claims.return_value = {
            'source': 'Local Dataset',
            'totalClaims': 1000,
            'deniedClaims': 80,
            'denialRate': 8.0,
            'deniedAmount': 150000.0,
            'denialReasons': [{'reason': 'Prior Auth', 'count': 40}]
        }
        mock_ai.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': 'At Metro Health Center (FAC001), the claim denial rate is 8.0% with 221 total beds.',
            'errorMessage': None
        }
        res = process_copilot_query("What is driving claim denials?", facility_id="FAC001")
        self.assertEqual(res["facility_name"], "Hyderabad Central Hospital")
        self.assertIn("Hyderabad Central Hospital (FAC001)", res["answer"])
        self.assertNotIn("Metro Health Center", res["answer"])
        self.assertIn("8.0%", res["answer"])
        self.assertIn("221", res["answer"])


if __name__ == '__main__':
    unittest.main()
