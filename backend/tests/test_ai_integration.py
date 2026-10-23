import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import app.main
from app.config import settings
from app.services.ai_service import (
    BaseAIProvider,
    GeminiProvider,
    BedrockProvider,
    get_ai_provider,
    invoke_ai_summary,
    _build_deterministic_executive_insights,
    generate_executive_summary_insights
)

class TestGeminiAIIntegration(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app.main.app)
        self.mock_metrics = {
            'totalAdmissions': 12450,
            'avgLOS': 4.2,
            'totalRevenue': 24500000.0,
            'denialRate': 4.8,
            'avgEDWait': 18.5,
            'occupancyRate': 78.4,
            'lowStockMedicinesCount': 5,
            'avgDoctorUtilization': 82.5,
            'criticalIncidentsCount': 0
        }

    def test_provider_resolution(self):
        """Test that get_ai_provider resolves to Gemini or Bedrock based on setting."""
        with patch('app.config.settings.AI_PROVIDER', 'gemini'):
            provider = get_ai_provider()
            self.assertIsInstance(provider, GeminiProvider)
            self.assertEqual(provider.get_provider_name(), "Google Gemini")

        with patch('app.config.settings.AI_PROVIDER', 'bedrock'):
            provider = get_ai_provider()
            self.assertIsInstance(provider, BedrockProvider)
            self.assertEqual(provider.get_provider_name(), "Amazon Bedrock")

    def test_gemini_missing_api_key(self):
        """Test that a missing GEMINI_API_KEY does not crash and returns a safe error."""
        with patch('app.config.settings.GEMINI_API_KEY', ''):
            provider = GeminiProvider()
            self.assertFalse(provider.is_available())
            res = provider.invoke("Analyze metrics")
            self.assertEqual(res['status'], 'error')
            self.assertIn("not configured", res['errorMessage'])

    def test_deterministic_insights_builder(self):
        """Verify deterministic fallback produces structured insights without hallucination."""
        insights = _build_deterministic_executive_insights(self.mock_metrics, "Hyderabad Central Hospital")
        self.assertIn("Hyderabad Central Hospital", insights["executive_brief"])
        self.assertIn("78.4%", insights["executive_brief"])
        self.assertIsInstance(insights["key_trends"], list)
        self.assertGreater(len(insights["key_trends"]), 0)
        self.assertIsInstance(insights["operational_concerns"], list)
        self.assertIsInstance(insights["management_recommendations"], list)
        self.assertIsInstance(insights["observations"], list)

    def test_generate_executive_summary_fallback_on_error(self):
        """Verify generate_executive_summary_insights falls back safely when provider fails."""
        with patch('app.services.ai_service.get_ai_provider') as mock_prov_fn:
            mock_prov = MagicMock()
            mock_prov.get_provider_name.return_value = "Mock Provider"
            mock_prov.invoke.return_value = {
                'status': 'error',
                'provider': 'Mock Provider',
                'modelId': 'test-model',
                'summary': None,
                'errorMessage': 'Rate limit exceeded (429)'
            }
            mock_prov_fn.return_value = mock_prov

            res = generate_executive_summary_insights(
                self.mock_metrics,
                facility_id='all',
                facility_label='All Network Facilities',
                timeframe='realtime'
            )

            self.assertEqual(res['status'], 'fallback')
            self.assertTrue(res['is_fallback'])
            self.assertIn("Rate limit exceeded", res['errorMessage'])
            self.assertIn("All Network Facilities", res['executive_brief'])
            self.assertGreater(len(res['key_trends']), 0)

    def test_health_endpoint_contract(self):
        """Verify /api/health retains all AWS service statuses and exposes aiProvider info."""
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'online')
        self.assertIn('awsServices', data)
        self.assertIn('s3', data['awsServices'])
        self.assertIn('glue', data['awsServices'])
        self.assertIn('athena', data['awsServices'])
        self.assertIn('bedrock', data['awsServices'])
        self.assertIn('aiProvider', data)
        self.assertEqual(data['aiProvider']['active'], settings.AI_PROVIDER)

    def test_dashboard_summary_intact(self):
        """Verify existing /api/dashboard/summary route continues to work."""
        res = self.client.get('/api/dashboard/summary?facility_id=all')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('source', data)
        self.assertIn('kpis', data)
        self.assertIn('rawMetrics', data)

    def test_ai_executive_summary_endpoint(self):
        """Verify new /api/dashboard/ai-summary endpoint returns structured response."""
        res = self.client.get('/api/dashboard/ai-summary?facility_id=all')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data['status'], ['success', 'fallback'])
        self.assertIn('provider', data)
        self.assertIn('model', data)
        self.assertIn('executive_brief', data)
        self.assertIn('key_trends', data)
        self.assertIn('operational_concerns', data)
        self.assertIn('management_recommendations', data)
        self.assertIn('observations', data)
        self.assertIn('data_freshness', data)

    def test_copilot_endpoint_with_ai_provider(self):
        """Verify /api/copilot/query executes successfully with AI provider metadata."""
        res = self.client.post('/api/copilot/query', json={'question': 'What is the claim denial rate?'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('answer', data)
        self.assertIn('evidence', data)
        self.assertIn('ai_explanation', data)
        self.assertIn('ai_status', data)
        self.assertIn('bedrock_used', data)

if __name__ == '__main__':
    unittest.main()
