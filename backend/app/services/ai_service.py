import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from app.config import settings
from app.services.facility_resolver import (
    normalize_facility_id,
    get_facility_canonical_name,
    get_facility_display_label,
    validate_and_sanitize_ai_response,
)

logger = logging.getLogger(__name__)

# =============================================================================
# 1. PROVIDER-INDEPENDENT AI INTERFACE & IMPLEMENTATIONS
# =============================================================================

class BaseAIProvider(ABC):
    """
    Abstract interface for AI inference providers (Google Gemini, Amazon Bedrock).
    Allows seamless switching between providers without modifying business logic.
    """
    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def invoke(self, prompt: str, context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        pass


class GeminiProvider(BaseAIProvider):
    """
    Official Google GenAI SDK (google-genai) provider implementation.
    Reads GEMINI_API_KEY and GEMINI_MODEL securely from environment configuration.
    """
    def __init__(self):
        self.api_key = (settings.GEMINI_API_KEY or '').strip()
        self.model_id = (settings.GEMINI_MODEL or 'gemini-3.1-flash-lite').strip()
        self._client = None
        self._fallback_models = [
            self.model_id,
            'gemini-3.1-flash-lite',
            'gemini-3-flash-preview',
            'gemini-3.8-flash',
            'gemini-flash-latest'
        ]

    def get_provider_name(self) -> str:
        return "Google Gemini"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None and self.is_available():
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def invoke(self, prompt: str, context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.is_available():
            return {
                'status': 'error',
                'provider': self.get_provider_name(),
                'modelId': self.model_id,
                'summary': None,
                'errorMessage': 'GEMINI_API_KEY is not configured in backend environment.'
            }

        full_prompt = prompt
        if context_data:
            full_prompt += f"\n\nOperational Metric Context:\n{json.dumps(context_data, indent=2, default=str)}"

        client = self._get_client()
        if not client:
            return {
                'status': 'error',
                'provider': self.get_provider_name(),
                'modelId': self.model_id,
                'summary': None,
                'errorMessage': 'Failed to initialize Google GenAI client.'
            }

        # Attempt with configured model, falling back to verified alternative flash models if needed
        last_error = None
        attempted_models = []
        for m in self._fallback_models:
            if m in attempted_models:
                continue
            attempted_models.append(m)
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=full_prompt
                )
                text = response.text.strip() if response and response.text else None
                if text:
                    return {
                        'status': 'success',
                        'provider': self.get_provider_name(),
                        'modelId': m,
                        'summary': text,
                        'errorMessage': None
                    }
            except Exception as e:
                last_error = e
                err_str = str(e)
                # If model is retired or not found, try next candidate
                if '404' in err_str or 'NOT_FOUND' in err_str or 'no longer available' in err_str:
                    logger.warning(f"Gemini model '{m}' unavailable, falling back to next candidate: {err_str[:80]}")
                    continue
                # Quota or rate-limit
                elif '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                    logger.error(f"Gemini Quota/Rate-limit reached on '{m}': {err_str[:120]}")
                    return {
                        'status': 'error',
                        'provider': self.get_provider_name(),
                        'modelId': m,
                        'summary': None,
                        'errorMessage': f"Gemini API quota or rate limit reached: {err_str[:120]}"
                    }
                else:
                    logger.warning(f"Gemini invocation error on '{m}': {err_str[:120]}")
                    continue

        err_msg = str(last_error) if last_error else "No response returned from Gemini API."
        return {
            'status': 'error',
            'provider': self.get_provider_name(),
            'modelId': self.model_id,
            'summary': None,
            'errorMessage': f"Gemini invocation failed: {err_msg[:160]}"
        }


class BedrockProvider(BaseAIProvider):
    """
    Amazon Bedrock provider implementation.
    Delegates to app.aws.bedrock.invoke_bedrock_summary.
    """
    def __init__(self):
        self.model_id = (settings.AWS_BEDROCK_MODEL or 'amazon.nova-lite-v1:0').strip()

    def get_provider_name(self) -> str:
        return "Amazon Bedrock"

    def is_available(self) -> bool:
        # Bedrock requires active AWS credentials or Vercel OIDC role assumption
        return bool(settings.AWS_ACCESS_KEY_ID or settings.AWS_BEDROCK_MODEL)

    def invoke(self, prompt: str, context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            from app.aws.bedrock import invoke_bedrock_summary
            res = invoke_bedrock_summary(prompt, context_data)
            return {
                'status': res.get('status', 'error'),
                'provider': self.get_provider_name(),
                'modelId': res.get('modelId', self.model_id),
                'summary': res.get('summary'),
                'errorMessage': res.get('errorMessage')
            }
        except Exception as e:
            return {
                'status': 'error',
                'provider': self.get_provider_name(),
                'modelId': self.model_id,
                'summary': None,
                'errorMessage': f"Amazon Bedrock error: {str(e)[:160]}"
            }


# =============================================================================
# 2. PROVIDER SELECTOR / FACTORY
# =============================================================================

def get_ai_provider() -> BaseAIProvider:
    """
    Returns the configured AI service provider based on AI_PROVIDER setting.
    Defaults to GeminiProvider if configured or if Bedrock is not explicitly chosen.
    """
    configured = (settings.AI_PROVIDER or 'gemini').lower().strip()
    if configured == 'bedrock':
        return BedrockProvider()
    return GeminiProvider()


def invoke_ai_summary(prompt: str, context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Provider-agnostic function to invoke AI summarization.
    Tries primary provider (Gemini); if unconfigured or fails, attempts Bedrock.
    """
    provider = get_ai_provider()
    result = provider.invoke(prompt, context_data)

    # If primary is Gemini and it fails or is unconfigured, try Bedrock if available
    if result.get('status') != 'success' and isinstance(provider, GeminiProvider):
        bedrock_prov = BedrockProvider()
        if bedrock_prov.is_available():
            bedrock_res = bedrock_prov.invoke(prompt, context_data)
            if bedrock_res.get('status') == 'success':
                return bedrock_res

    return result


# =============================================================================
# 3. EXECUTIVE SUMMARY SYNTHESIS & INSIGHTS GENERATION
# =============================================================================

def _build_deterministic_executive_insights(metrics: Dict[str, Any], facility_label: str) -> Dict[str, Any]:
    """
    High-fidelity deterministic fallback generating structured operational insights
    when external LLM APIs are unreachable or unconfigured.
    Guarantees that dashboard executive summaries never fail or crash.
    """
    adm = metrics.get('totalAdmissions', 0)
    rev = metrics.get('totalRevenue', 0.0)
    ed_wait = metrics.get('avgEDWait', 0.0)
    denial = metrics.get('denialRate', 0.0)
    occupancy = metrics.get('occupancyRate', 0.0)
    los = metrics.get('avgLOS', 0.0)

    rev_m = rev / 1e6 if rev >= 1e6 else rev / 1e3
    rev_unit = "M" if rev >= 1e6 else "K"

    brief = (
        f"Operational Executive Briefing for {facility_label}: Current network capacity stands at {occupancy}% bed occupancy "
        f"across {adm:,} verified inpatient admissions, with an average length of stay (ALOS) of {los} days. "
        f"Realized clinical collections total ₹{rev_m:.2f}{rev_unit}. Emergency department patient throughput shows an "
        f"average intake-to-triage waiting interval of {ed_wait:.1f} minutes, while the insurance claims denial rate is maintained at {denial:.2f}%."
    )

    trends = [
        f"Inpatient volume reaches {adm:,} cumulative admissions across monitoring intervals.",
        f"Revenue realization maintains ₹{rev_m:.2f}{rev_unit} net collected revenue across billing cycles.",
        f"Inpatient flow reflects a verified average length of stay of {los:.1f} days per admitted patient."
    ]

    concerns = []
    if denial > 5.0:
        concerns.append(f"Elevated claim denial rate at {denial:.2f}% exceeds the 5.0% target benchmark, exposing revenue to payer rejections.")
    else:
        concerns.append(f"Claims denial rate is currently controlled at {denial:.2f}%, within operational risk tolerance.")

    if ed_wait > 25.0:
        concerns.append(f"Emergency Department average wait time of {ed_wait:.1f} minutes indicates acute arrival triage bottlenecking.")
    else:
        concerns.append(f"Emergency Department throughput is stable with an average wait time of {ed_wait:.1f} minutes.")

    if occupancy > 85.0:
        concerns.append(f"Bed occupancy at {occupancy:.1f}% approaches maximum capacity threshold (85%), limiting emergency surge intake.")

    recommendations = [
        "Audit top denial reason codes in Claims Intelligence to automate payer-specific pre-authorization validation.",
        "Align nursing shift allocations with peak ED arrival windows to compress initial triage waiting time.",
        "Implement discharge planning rounds 24 hours prior to anticipated discharge to improve bed turnover rates."
    ]

    observations = [
        f"Bed occupancy is currently measured at {occupancy:.1f}%.",
        f"Average ED waiting time is {ed_wait:.1f} minutes.",
        f"Claim denial rate across submitted insurance claims is {denial:.2f}%.",
        f"Net collected revenue across department service lines is ₹{rev_m:.2f}{rev_unit}."
    ]

    return {
        "executive_brief": brief,
        "key_trends": trends,
        "operational_concerns": concerns,
        "management_recommendations": recommendations,
        "observations": observations
    }


def generate_executive_summary_insights(
    raw_metrics: Dict[str, Any],
    facility_id: str = 'all',
    facility_label: str = 'All Network Facilities',
    timeframe: str = 'realtime'
) -> Dict[str, Any]:
    """
    Synthesizes executive operational intelligence using verified metrics.
    Distinguishes factual observations from strategic management recommendations.
    Uses Google Gemini as primary provider; falls back deterministically if unavailable.
    Guarantees canonical facility name enforcement and strict anti-hallucination controls.
    """
    provider = get_ai_provider()
    provider_name = provider.get_provider_name()
    timestamp = datetime.now(timezone.utc).isoformat()

    norm_id = normalize_facility_id(facility_id)
    canonical_name = get_facility_canonical_name(norm_id)
    fac_label = get_facility_display_label(norm_id, include_id=True)

    # Base operational context for AI prompt
    context_data = {
        "facility_id": norm_id,
        "facility_name": canonical_name,
        "facility_label": fac_label,
        "authoritative_facility_identity": {
            "facility_id": norm_id,
            "canonical_facility_name": canonical_name,
            "is_authoritative": True
        },
        "reporting_timeframe": timeframe,
        "verified_metrics": {
            "total_admissions": raw_metrics.get("totalAdmissions"),
            "average_length_of_stay_days": raw_metrics.get("avgLOS"),
            "total_revenue_inr": raw_metrics.get("totalRevenue"),
            "claim_denial_rate_pct": raw_metrics.get("denialRate"),
            "avg_emergency_wait_time_minutes": raw_metrics.get("avgEDWait"),
            "bed_occupancy_rate_pct": raw_metrics.get("occupancyRate"),
            "doctor_utilization_pct": raw_metrics.get("avgDoctorUtilization"),
            "low_stock_medicines_count": raw_metrics.get("lowStockMedicinesCount"),
            "critical_quality_incidents": raw_metrics.get("criticalIncidentsCount")
        }
    }

    prompt = (
        f"You are the Chief Healthcare Operations Executive Intelligence Analyst for MedOps.\n"
        f"Analyze the following verified operational metrics for {fac_label} ({timeframe}):\n\n"
        f"AUTHORITATIVE FACILITY IDENTIFIER:\n"
        f"- Facility ID: {norm_id}\n"
        f"- Canonical Facility Name: {canonical_name}\n"
        f"CRITICAL FACILITY IDENTITY RULE: The facility name above is authoritative and verified. "
        f"You must refer to the facility EXCLUSIVELY by its canonical name '{canonical_name}' (or verified ID '{norm_id}'). "
        f"Never invent, rename, alias, or substitute facility names (e.g., do NOT use Metro Health, St. Jude, etc.). "
        f"If a facility name cannot be verified, use the verified facility ID '{norm_id}' and request clarification rather than inventing a name.\n\n"
        f"STRICT RULES:\n"
        f"1. Rely EXCLUSIVELY on the verified numbers provided in the context. Never invent or hallucinate metrics.\n"
        f"2. Never fabricate trends not grounded in the numbers.\n"
        f"3. Clearly distinguish empirical observations from strategic recommendations.\n"
        f"4. Do NOT give individual medical advice or clinical diagnosis.\n"
        f"5. Return your response in STRICT, VALID JSON format with NO markdown wrapping, following this schema:\n"
        f"{{\n"
        f'  "executive_brief": "A concise, professional 2-3 sentence executive operational overview of hospital performance.",\n'
        f'  "key_trends": ["Observation trend 1 backed by real metrics", "Observation trend 2", "Observation trend 3"],\n'
        f'  "operational_concerns": ["Potential bottleneck or concern 1", "Concern 2"],\n'
        f'  "management_recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],\n'
        f'  "observations": ["Empirical data observation 1", "Empirical data observation 2", "Empirical data observation 3"]\n'
        f"}}"
    )

    llm_res = provider.invoke(prompt, context_data)

    if llm_res.get('status') == 'success' and llm_res.get('summary'):
        raw_text = llm_res['summary'].strip()
        # Clean JSON markdown fences if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            parsed = json.loads(raw_text)
            if isinstance(parsed, dict) and "executive_brief" in parsed:
                # Sanitize all AI-generated strings against authoritative facility registry
                exec_brief = validate_and_sanitize_ai_response(parsed.get("executive_brief", ""), norm_id)
                key_trends = [validate_and_sanitize_ai_response(t, norm_id) for t in parsed.get("key_trends", [])]
                operational_concerns = [validate_and_sanitize_ai_response(c, norm_id) for c in parsed.get("operational_concerns", [])]
                management_recommendations = [validate_and_sanitize_ai_response(r, norm_id) for r in parsed.get("management_recommendations", [])]
                observations = [validate_and_sanitize_ai_response(o, norm_id) for o in parsed.get("observations", [])]

                return {
                    "status": "success",
                    "provider": provider_name,
                    "model": llm_res.get('modelId', settings.GEMINI_MODEL),
                    "facility_id": norm_id,
                    "facility_name": canonical_name,
                    "facility_label": fac_label,
                    "timeframe": timeframe,
                    "generated_at": timestamp,
                    "data_freshness": "Real-time Telemetry (Athena / S3 Resilient Layer)",
                    "executive_brief": exec_brief,
                    "key_trends": key_trends,
                    "operational_concerns": operational_concerns,
                    "management_recommendations": management_recommendations,
                    "observations": observations,
                    "metrics_used": context_data["verified_metrics"],
                    "is_fallback": False,
                    "errorMessage": None
                }
        except Exception as json_err:
            logger.warning(f"Could not parse LLM response as JSON: {json_err}. Using text as brief.")
            det = _build_deterministic_executive_insights(raw_metrics, fac_label)
            clean_brief = validate_and_sanitize_ai_response(raw_text[:500], norm_id)
            return {
                "status": "success",
                "provider": provider_name,
                "model": llm_res.get('modelId', settings.GEMINI_MODEL),
                "facility_id": norm_id,
                "facility_name": canonical_name,
                "facility_label": fac_label,
                "timeframe": timeframe,
                "generated_at": timestamp,
                "data_freshness": "Real-time Telemetry (Athena / S3 Resilient Layer)",
                "executive_brief": clean_brief,
                "key_trends": det["key_trends"],
                "operational_concerns": det["operational_concerns"],
                "management_recommendations": det["management_recommendations"],
                "observations": det["observations"],
                "metrics_used": context_data["verified_metrics"],
                "is_fallback": False,
                "errorMessage": None
            }

    # Deterministic fallback when LLM is unavailable or quota error
    logger.info(f"Using deterministic executive summary fallback. Reason: {llm_res.get('errorMessage')}")
    fallback_data = _build_deterministic_executive_insights(raw_metrics, fac_label)
    return {
        "status": "fallback",
        "provider": f"{provider_name} (Deterministic Fallback)",
        "model": llm_res.get('modelId', settings.GEMINI_MODEL),
        "facility_id": norm_id,
        "facility_name": canonical_name,
        "facility_label": fac_label,
        "timeframe": timeframe,
        "generated_at": timestamp,
        "data_freshness": "Real-time Telemetry (Athena / S3 Resilient Layer)",
        "executive_brief": fallback_data["executive_brief"],
        "key_trends": fallback_data["key_trends"],
        "operational_concerns": fallback_data["operational_concerns"],
        "management_recommendations": fallback_data["management_recommendations"],
        "observations": fallback_data["observations"],
        "metrics_used": context_data["verified_metrics"],
        "is_fallback": True,
        "errorMessage": llm_res.get('errorMessage')
    }
