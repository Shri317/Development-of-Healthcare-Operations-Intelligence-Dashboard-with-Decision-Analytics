import unittest
from unittest.mock import patch, MagicMock
from app.services.copilot_service import process_copilot_query, is_conversational_query


class TestCopilotGeminiIntegration(unittest.TestCase):
    """
    Verification suite for Medical Operations Copilot powered by Google Gemini.
    Validates:
    - Conversational queries ("hi", "hello", "what can you do") do not dump operational summaries
    - Operational queries retrieve verified metrics and let Gemini generate grounded explanations
    - Clear distinction between live Gemini responses and deterministic fallback mode
    """

    def test_conversational_query_detection(self):
        """Verify conversational greetings and capability questions are correctly recognized."""
        conversational_samples = [
            'hi',
            'Hello!',
            'hey',
            'Good morning',
            'Good afternoon',
            'Thank you',
            'thanks',
            'What can you do?',
            'How can you help me?',
            'Who are you?',
            'Help'
        ]
        for q in conversational_samples:
            self.assertTrue(
                is_conversational_query(q),
                f"Query '{q}' should be classified as conversational"
            )

        operational_samples = [
            'What is the claim denial rate?',
            'How many patients were admitted?',
            'What is the current bed occupancy?',
            'Which medicines need reordering?',
            'What is driving claim denials?',
            'Summarize hospital operations.'
        ]
        for q in operational_samples:
            self.assertFalse(
                is_conversational_query(q),
                f"Query '{q}' should NOT be classified as conversational"
            )

    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_greeting_uses_real_gemini_response(self, mock_invoke):
        """Verify that typing 'hi' returns the Gemini-generated text and NOT an operational summary."""
        mock_invoke.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': "Hi! Welcome to MedOps Intelligence. I'm your hospital operations assistant. How can I help you today?",
            'errorMessage': None
        }

        res = process_copilot_query("hi", "FAC001")

        self.assertEqual(res['domain'], "Conversational Assistant")
        self.assertFalse(res['is_fallback'])
        self.assertTrue(res['ai_used'])
        self.assertEqual(res['ai_provider'], "Google Gemini")
        self.assertEqual(res['model'], "gemini-3.1-flash-lite")
        self.assertEqual(
            res['answer'],
            "Hi! Welcome to MedOps Intelligence. I'm your hospital operations assistant. How can I help you today?"
        )
        self.assertEqual(len(res['evidence']), 0)
        self.assertNotIn("Total patient admissions are", res['answer'])

    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_operational_query_uses_verified_metrics_with_gemini(self, mock_invoke):
        """Verify operational query passes verified metrics to Gemini and uses Gemini's answer."""
        mock_invoke.return_value = {
            'status': 'success',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': "Across all facilities, the claim denial rate is 9.78% representing ₹500,997.35 in exposed revenue.",
            'errorMessage': None
        }

        res = process_copilot_query("What is the claim denial rate?", "all")

        self.assertEqual(res['domain'], "Insurance Claims Intelligence")
        self.assertFalse(res['is_fallback'])
        self.assertTrue(res['ai_used'])
        self.assertEqual(res['ai_provider'], "Google Gemini")
        self.assertEqual(res['answer'], "Across all facilities, the claim denial rate is 9.78% representing ₹500,997.35 in exposed revenue.")
        self.assertGreater(len(res['evidence']), 0)

        # Verify prompt contained verified metrics
        prompt_arg = mock_invoke.call_args[0][0]
        self.assertIn("Verified Metrics", prompt_arg)
        self.assertIn("claim_denial_rate_pct", prompt_arg)

    @patch('app.services.copilot_service.invoke_ai_summary')
    def test_deterministic_fallback_when_gemini_unavailable(self, mock_invoke):
        """Verify fallback mode is activated honestly when Gemini is unreachable."""
        mock_invoke.return_value = {
            'status': 'error',
            'provider': 'Google Gemini',
            'modelId': 'gemini-3.1-flash-lite',
            'summary': None,
            'errorMessage': 'Gemini API quota or rate limit reached (429)'
        }

        res = process_copilot_query("What is the claim denial rate?", "all")

        self.assertTrue(res['is_fallback'])
        self.assertFalse(res['ai_used'])
        self.assertIn("Deterministic Fallback", res['ai_provider'])
        self.assertIn("Deterministic Fallback", res['ai_status'])
        # Answer must be populated from verified dataset calculations, not Gemini text
        self.assertIn("Claim Denial Rate", res['answer'])
        self.assertGreater(len(res['evidence']), 0)


if __name__ == '__main__':
    unittest.main()
