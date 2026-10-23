import json
import logging
from typing import Dict, Any, Optional
from app.aws.session import get_bedrock_client
from app.config import settings

logger = logging.getLogger(__name__)

def invoke_bedrock_summary(prompt: str, context_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Invokes Amazon Bedrock LLM with structured metric context and prompt.
    Supports Amazon Nova models (e.g. amazon.nova-lite-v1:0) natively,
    with clean backward-compatibility for Anthropic Claude models.
    """
    model_id = (settings.AWS_BEDROCK_MODEL or 'amazon.nova-lite-v1:0').strip()

    try:
        bedrock = get_bedrock_client()

        full_prompt = prompt
        if context_data:
            full_prompt += f"\n\nReal Metric Context:\n{json.dumps(context_data, indent=2)}"

        # Determine model family for request payload formatting
        is_claude = "claude" in model_id.lower() or "anthropic" in model_id.lower()

        if is_claude:
            # Anthropic Claude Messages API format
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ]
            }
        else:
            # Amazon Nova Messages format (amazon.nova-lite-v1:0, amazon.nova-pro-v1:0, etc.)
            payload = {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"text": full_prompt}
                        ]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 1000
                }
            }

        response = bedrock.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(payload)
        )

        body_bytes = response.get('body').read()
        res_json = json.loads(body_bytes.decode('utf-8'))

        text = None

        # 1. Amazon Nova response format: res_json["output"]["message"]["content"][...]["text"]
        if "output" in res_json and isinstance(res_json["output"], dict):
            msg = res_json["output"].get("message", {})
            if isinstance(msg, dict):
                content_list = msg.get("content", [])
                if isinstance(content_list, list):
                    text_parts = [
                        c.get("text", "") for c in content_list
                        if isinstance(c, dict) and c.get("text")
                    ]
                    if text_parts:
                        text = "\n\n".join(text_parts)

        # 2. Anthropic Claude response format: res_json["content"][...]["text"]
        if not text and "content" in res_json:
            content_blocks = res_json.get("content", [])
            if isinstance(content_blocks, list):
                text_parts = [
                    b.get("text", "") for b in content_blocks
                    if isinstance(b, dict) and b.get("type") == "text" and b.get("text")
                ]
                if text_parts:
                    text = "\n\n".join(text_parts)
                elif content_blocks and isinstance(content_blocks[0], dict) and "text" in content_blocks[0]:
                    text = content_blocks[0]["text"]

        if not text:
            text = "No AI response content returned."

        return {
            'status': 'success',
            'modelId': model_id,
            'summary': text,
            'errorMessage': None
        }
    except Exception as e:
        logger.error(f"Amazon Bedrock Invocation Error: {e}")
        return {
            'status': 'error',
            'modelId': model_id,
            'summary': None,
            'errorMessage': str(e)
        }
