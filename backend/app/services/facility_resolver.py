"""
Authoritative Facility Resolver Utility
======================================
Single source of truth for facility IDs and canonical facility names across
the MedOps platform, aligning backend services, Athena queries, Google Gemini AI,
and Amazon Bedrock Copilot.

Authoritative Mapping (verified from dataset/facilities.csv):
  FAC001: Hyderabad Central Hospital (Hyderabad, Telangana)
  FAC002: Hyderabad West Clinic (Hyderabad, Telangana)
  FAC003: Secunderabad Medical Center (Secunderabad, Telangana)
  FAC004: Bengaluru Care Hospital (Bengaluru, Karnataka)
  FAC005: Chennai Health Center (Chennai, Tamil Nadu)
"""

import re
from typing import Dict, Any, List, Optional

# Authoritative canonical facility registry matching facilities.csv
AUTHORITATIVE_FACILITIES: Dict[str, Dict[str, str]] = {
    'FAC001': {
        'id': 'FAC001',
        'name': 'Hyderabad Central Hospital',
        'city': 'Hyderabad',
        'state': 'Telangana',
        'type': 'Tertiary Care Hospital'
    },
    'FAC002': {
        'id': 'FAC002',
        'name': 'Hyderabad West Clinic',
        'city': 'Hyderabad',
        'state': 'Telangana',
        'type': 'Outpatient Clinic'
    },
    'FAC003': {
        'id': 'FAC003',
        'name': 'Secunderabad Medical Center',
        'city': 'Secunderabad',
        'state': 'Telangana',
        'type': 'Medical Center'
    },
    'FAC004': {
        'id': 'FAC004',
        'name': 'Bengaluru Care Hospital',
        'city': 'Bengaluru',
        'state': 'Karnataka',
        'type': 'Specialty Hospital'
    },
    'FAC005': {
        'id': 'FAC005',
        'name': 'Chennai Health Center',
        'city': 'Chennai',
        'state': 'Tamil Nadu',
        'type': 'Community Health Center'
    }
}

# Known obsolete / legacy / hallucinated aliases mapped to canonical names
LEGACY_FACILITY_ALIASES: Dict[str, str] = {
    'Metro Health Center (FAC001)': 'Hyderabad Central Hospital (FAC001)',
    'Metro Health Center': 'Hyderabad Central Hospital',
    'Metro Health': 'Hyderabad Central Hospital',
    'St. Jude Community Hospital (FAC002)': 'Hyderabad West Clinic (FAC002)',
    'St. Jude Community Hospital': 'Hyderabad West Clinic',
    'St. Jude Hospital': 'Hyderabad West Clinic',
    'St. Jude': 'Hyderabad West Clinic',
    'St Jude': 'Hyderabad West Clinic',
    'Highland Regional Medical Center (FAC003)': 'Secunderabad Medical Center (FAC003)',
    'Highland Regional Medical Center': 'Secunderabad Medical Center',
    'Highland Regional': 'Secunderabad Medical Center',
    'Valley Childrens & Specialty Clinic (FAC004)': 'Bengaluru Care Hospital (FAC004)',
    'Valley Children\'s & Specialty Clinic (FAC004)': 'Bengaluru Care Hospital (FAC004)',
    'Valley Childrens & Specialty Clinic': 'Bengaluru Care Hospital',
    'Valley Children\'s & Specialty Clinic': 'Bengaluru Care Hospital',
    'Valley Childrens': 'Bengaluru Care Hospital',
    'Valley Children\'s': 'Bengaluru Care Hospital',
    'Lakeside Memorial Hospital (FAC005)': 'Chennai Health Center (FAC005)',
    'Lakeside Memorial Hospital': 'Chennai Health Center',
    'Lakeside Memorial': 'Chennai Health Center',
    'Lakeside Hospital': 'Chennai Health Center'
}


def normalize_facility_id(facility_id: Optional[str]) -> str:
    """
    Normalizes any facility identifier into the canonical format (e.g. 'FAC001' or 'all').
    Handles hyphens, lowercase, and numeric-only strings.
    """
    if not facility_id:
        return 'all'

    clean = str(facility_id).strip()
    if clean.lower() in ('all', 'enterprise', 'network', 'none', ''):
        return 'all'

    # Remove hyphens and uppercase (e.g. 'fac-001' -> 'FAC001')
    normalized = clean.replace('-', '').upper()

    # Numeric integer string fallback (e.g. '1' -> 'FAC001')
    if normalized.isdigit():
        num = int(normalized)
        if 1 <= num <= 5:
            return f"FAC{num:03d}"

    if normalized in AUTHORITATIVE_FACILITIES:
        return normalized

    return clean


def get_facility_canonical_name(facility_id: Optional[str]) -> str:
    """
    Resolves a facility ID to its canonical, authoritative facility name.
    Examples:
      'FAC001' -> 'Hyderabad Central Hospital'
      'all'    -> 'All Network Facilities'
      'FAC999' -> 'Facility FAC999'
    """
    norm_id = normalize_facility_id(facility_id)
    if norm_id == 'all':
        return 'All Network Facilities'

    fac = AUTHORITATIVE_FACILITIES.get(norm_id)
    if fac:
        return fac['name']

    return f"Facility {norm_id}"


def get_facility_display_label(facility_id: Optional[str], include_id: bool = True) -> str:
    """
    Returns a formatted display label for the facility.
    Examples:
      get_facility_display_label('FAC001', include_id=True)  -> 'Hyderabad Central Hospital (FAC001)'
      get_facility_display_label('FAC001', include_id=False) -> 'Hyderabad Central Hospital'
      get_facility_display_label('all')                     -> 'All Network Facilities'
    """
    norm_id = normalize_facility_id(facility_id)
    if norm_id == 'all':
        return 'All Network Facilities'

    name = get_facility_canonical_name(norm_id)
    if include_id and norm_id in AUTHORITATIVE_FACILITIES:
        return f"{name} ({norm_id})"

    return name


def get_authoritative_facility_map() -> Dict[str, str]:
    """
    Returns the complete mapping of facility IDs to canonical names,
    including 'all' for network-wide aggregates.
    """
    mapping = {'all': 'All Network Facilities'}
    for fid, meta in AUTHORITATIVE_FACILITIES.items():
        mapping[fid] = meta['name']
    return mapping


def get_all_canonical_facilities() -> List[Dict[str, Any]]:
    """
    Returns the verified list of facilities conforming to the frontend Facility interface.
    """
    facilities = []
    for fid, meta in AUTHORITATIVE_FACILITIES.items():
        facilities.append({
            'id': fid,
            'name': meta['name'],
            'location': f"{meta['city']}, {meta['state']}",
            'type': meta['type']
        })
    return facilities


def validate_and_sanitize_ai_response(text: str, facility_id: Optional[str] = 'all') -> str:
    """
    Application-side validation and sanitization for AI-generated text.
    1. Replaces any legacy or hallucinated facility aliases (e.g. 'Metro Health Center')
       with their authoritative canonical counterpart.
    2. If scoped to a specific facility (e.g. 'FAC001'), ensures that subject headings
       do not mistakenly reference another facility.
    3. Preserves all clinical, operational, financial metrics, and numbers intact.
    """
    if not text or not isinstance(text, str):
        return text

    sanitized = text

    # Step 1: Replace known legacy/hallucinated aliases
    # Sort keys by length descending so longer phrases match first
    for alias, canonical in sorted(LEGACY_FACILITY_ALIASES.items(), key=lambda x: -len(x[0])):
        pattern = re.compile(re.escape(alias), re.IGNORECASE)
        sanitized = pattern.sub(canonical, sanitized)

    # Step 2: If scoped to a specific facility, ensure introductory header alignment
    norm_id = normalize_facility_id(facility_id)
    if norm_id != 'all' and norm_id in AUTHORITATIVE_FACILITIES:
        canonical_name = get_facility_canonical_name(norm_id)
        canonical_label = get_facility_display_label(norm_id, include_id=True)

        # Check for greeting or header mismatch with other facility names
        for other_id, other_meta in AUTHORITATIVE_FACILITIES.items():
            if other_id == norm_id:
                continue
            other_name = other_meta['name']
            other_label = f"{other_name} ({other_id})"

            # If the response explicitly claims to be for another facility in greeting / subject headers
            prefix_pattern = (
                r"(Assistant for|Briefing for|Summary for|Summary of|Census for|"
                r"Operations for|Operational review for|Review for|Report for|"
                r"Intelligence for|Status for|Command Center for|Across|For)"
            )
            greeting_pattern = re.compile(
                rf"{prefix_pattern}\s+{re.escape(other_label)}",
                re.IGNORECASE
            )
            sanitized = greeting_pattern.sub(rf"\1 {canonical_label}", sanitized)

            greeting_pattern_name = re.compile(
                rf"{prefix_pattern}\s+{re.escape(other_name)}",
                re.IGNORECASE
            )
            sanitized = greeting_pattern_name.sub(rf"\1 {canonical_name}", sanitized)

    return sanitized
