from fastapi import APIRouter, Query, Body
from typing import Optional, Dict, Any
from app.services.dashboard_service import (
    get_facilities_list,
    get_executive_summary,
    get_ai_executive_summary,
    get_facility_comparison,
    get_billing_intelligence,
    get_claims_intelligence,
    get_patient_ops_intelligence,
    get_doctor_staff_intelligence,
    get_laboratory_intelligence,
    get_pharmacy_inventory_intelligence,
    get_financial_intelligence,
    get_supply_chain_vendors,
    get_quality_compliance,
    get_ai_predictive_intelligence,
    get_workflow_automation,
    get_pipeline_status,
    get_operations_drilldown,
    get_medical_coding_intelligence,
    get_emergency_critical_intelligence,
    get_patient_experience_intelligence,
    get_security_governance_intelligence,
    get_integrations_status,
    ping_integration_service
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Intelligence APIs"])

@router.get("/facilities")
def get_facilities():
    return get_facilities_list()

@router.get("/summary")
def get_summary(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_executive_summary(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/ai-summary")
def get_ai_summary(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_ai_executive_summary(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/facilities-comparison")
def get_facilities_comp(
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_facility_comparison(timeframe or 'realtime', start_date, end_date)

@router.get("/billing")
def get_billing(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_billing_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/claims")
def get_claims(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_claims_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/patient-ops")
def get_patient_ops(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_patient_ops_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/doctor-staff")
def get_doctor_staff(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_doctor_staff_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/laboratory")
def get_laboratory(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_laboratory_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/pharmacy-inventory")
def get_pharmacy_inventory(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_pharmacy_inventory_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/financial-intelligence")
def get_financial(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_financial_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/supply-chain-vendors")
def get_supply_chain(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_supply_chain_vendors(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/quality-compliance")
def get_quality(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_quality_compliance(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/ai-predictive-intelligence")
def get_ai_predictive(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_ai_predictive_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/workflow-automation")
def get_workflow(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_workflow_automation(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/pipeline-status")
def get_pipeline(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_pipeline_status(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/drilldown")
def get_drilldown(
    facility_id: Optional[str] = Query('all'),
    department: Optional[str] = Query(None),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_operations_drilldown(facility_id or 'all', department, timeframe or 'realtime', start_date, end_date)

@router.get("/medical-coding")
def get_medical_coding(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_medical_coding_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/emergency-critical")
def get_emergency_critical(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_emergency_critical_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/patient-experience")
def get_patient_experience(
    facility_id: Optional[str] = Query('all'),
    timeframe: Optional[str] = Query('realtime'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    return get_patient_experience_intelligence(facility_id or 'all', timeframe or 'realtime', start_date, end_date)

@router.get("/security-governance")
def get_security_governance():
    return get_security_governance_intelligence()

@router.get("/integrations-status")
def get_integrations():
    return get_integrations_status()

@router.post("/integrations-ping")
def post_integrations_ping(payload: Dict[str, Any] = Body(...)):
    name = payload.get('name', 'Local CSV Dataset Engine')
    return ping_integration_service(name)








