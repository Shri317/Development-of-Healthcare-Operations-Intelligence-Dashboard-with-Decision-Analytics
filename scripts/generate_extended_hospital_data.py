#!/usr/bin/env python3
"""
Medical Operations Intelligence & Automation System (MedOps)
Extended Operational Dataset Generator
======================================================
Generates connected operational datasets linking directly to existing synthetic
appointments, admissions, and verified baseline reference entities.

Supported Datasets:
  Module A (Doctor & Staff):
    1. doctor_workload
    2. staff_workload
    3. staff_attendance
    4. nurse_shifts
  Module B (Laboratory & Diagnostics):
    5. lab_orders_results
    6. lab_samples
  Module C (Pharmacy & Inventory):
    7. prescriptions
    8. pharmacy_dispensing
    9. medicine_batches
  Module D (Quality & Compliance):
    10. quality_audits
    11. quality_incidents
    12. corrective_actions
  Module E (Patient Experience):
    13. patient_feedback
    14. patient_complaints
  Module F (Supply Chain & Vendors):
    15. purchase_orders
    16. supply_chain_purchase_orders

Safety Guarantees:
  - ZERO AWS write operations in this phase.
  - Reuses valid existing appointment_id, admission_id, doctor_id, staff_id,
    patient_id, medicine_id, vendor_id, facility_id, and department_id.
  - Generates strictly unique synthetic primary keys (SYN-*-{run_id}-{seq}).
  - Never overwrites existing baseline or generated files.
"""

import os
import sys
import csv
import uuid
import random
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

BASE_DATASET_DIR = Path("dataset/medical_operations_core_v9_100k/medical_operations_core_v9_100k")
GENERATED_DIR = Path("generated_data")

EXTENDED_DATASET_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "doctor_workload": {
        "columns": [
            "workload_id", "doctor_id", "facility_id", "department_id", "date",
            "appointments_handled", "emergency_cases", "surgeries_performed",
            "inpatient_rounds", "working_hours", "overtime_hours", "workload_score", "utilization_pct"
        ],
        "id_prefix": "SYN-DWL",
        "s3_prefix": "raw/doctor_workload/",
    },
    "staff_workload": {
        "columns": [
            "workload_id", "staff_id", "facility_id", "department_id", "work_date",
            "appointments_handled", "tasks_completed", "available_hours", "utilization_pct"
        ],
        "id_prefix": "SYN-SWL",
        "s3_prefix": "raw/staff_workload/",
    },
    "staff_attendance": {
        "columns": [
            "staff_id", "attendance_date", "shift", "attendance_status",
            "hours_worked", "overtime_hours"
        ],
        "id_prefix": None,  # Composite key: (staff_id, attendance_date, shift)
        "s3_prefix": "raw/staff_attendance/",
    },
    "nurse_shifts": {
        "columns": [
            "shift_id", "staff_id", "facility_id", "department_id", "shift_date",
            "shift_type", "scheduled_hours", "worked_hours", "overtime_hours",
            "patients_assigned", "patient_nurse_ratio", "absenteeism_flag", "workload_score"
        ],
        "id_prefix": "SYN-NS",
        "s3_prefix": "raw/nurse_shifts/",
    },
    "lab_orders_results": {
        "columns": [
            "lab_order_id", "appointment_id", "patient_id", "doctor_id", "department_id",
            "facility_id", "test_id", "test_name", "category", "order_date",
            "collection_date", "result_date", "tat_hours", "priority", "result_status"
        ],
        "id_prefix": "SYN-LO",
        "s3_prefix": "raw/lab_orders_results/",
    },
    "lab_samples": {
        "columns": [
            "sample_id", "lab_order_id", "patient_id", "facility_id", "test_id",
            "sample_type", "collection_date", "sample_status"
        ],
        "id_prefix": "SYN-SMP",
        "s3_prefix": "raw/lab_samples/",
    },
    "prescriptions": {
        "columns": [
            "prescription_id", "appointment_id", "patient_id", "doctor_id", "facility_id",
            "department_id", "medicine_id", "prescription_date", "route",
            "quantity_prescribed", "prescription_status"
        ],
        "id_prefix": "SYN-RX",
        "s3_prefix": "raw/prescriptions/",
    },
    "pharmacy_dispensing": {
        "columns": [
            "prescription_id", "appointment_id", "patient_id", "facility_id", "medicine_id",
            "dispense_date", "dispensed_quantity", "pharmacist_id", "dispense_value"
        ],
        "id_prefix": None,  # Uses prescription_id as primary key / link
        "s3_prefix": "raw/pharmacy_dispensing/",
    },
    "medicine_batches": {
        "columns": [
            "batch_id", "facility_id", "medicine_id", "vendor_id", "expiry_date",
            "batch_quantity", "unit_cost"
        ],
        "id_prefix": "SYN-BAT",
        "s3_prefix": "raw/medicine_batches/",
    },
    "quality_audits": {
        "columns": [
            "audit_id", "facility_id", "department_id", "audit_date", "audit_type",
            "compliance_score", "findings_count", "status"
        ],
        "id_prefix": "SYN-AUD",
        "s3_prefix": "raw/quality_audits/",
    },
    "quality_incidents": {
        "columns": [
            "incident_id", "facility_id", "department_id", "incident_date", "incident_type",
            "severity", "status", "corrective_action_required"
        ],
        "id_prefix": "SYN-INC",
        "s3_prefix": "raw/quality_incidents/",
    },
    "corrective_actions": {
        "columns": [
            "action_id", "incident_id", "facility_id", "action_type", "due_date", "action_status"
        ],
        "id_prefix": "SYN-CA",
        "s3_prefix": "raw/corrective_actions/",
    },
    "patient_feedback": {
        "columns": [
            "feedback_id", "appointment_id", "patient_id", "facility_id", "department_id",
            "feedback_date", "overall_rating", "wait_time_rating", "staff_rating",
            "service_quality_rating", "recommendation", "sentiment", "feedback_channel",
            "complaint_flag", "nps_score", "csat_score"
        ],
        "id_prefix": "SYN-FB",
        "s3_prefix": "raw/patient_feedback/",
    },
    "patient_complaints": {
        "columns": [
            "complaint_id", "feedback_id", "patient_id", "facility_id", "department_id",
            "complaint_date", "complaint_category", "priority", "status", "resolution_hours"
        ],
        "id_prefix": "SYN-CP",
        "s3_prefix": "raw/patient_complaints/",
    },
    "purchase_orders": {
        "columns": [
            "po_id", "facility_id", "vendor_id", "medicine_id", "order_date",
            "ordered_quantity", "order_value", "po_status"
        ],
        "id_prefix": "SYN-PO",
        "s3_prefix": "raw/purchase_orders/",
    },
    "supply_chain_purchase_orders": {
        "columns": [
            "supply_po_id", "vendor_id", "facility_id", "po_date", "category",
            "order_amount", "status", "expected_delivery_days", "actual_delivery_days", "on_time_flag"
        ],
        "id_prefix": "SYN-SPO",
        "s3_prefix": "raw/supply_chain_purchase_orders/",
    },
}

class ExtendedReferenceUniverse:
    """Loads baseline dimensions and existing synthetic encounters."""

    def __init__(self):
        print("Loading baseline dimensions from dataset/...")
        self.doctors = self._read_csv("doctors.csv")
        self.staff = self._read_csv("staff.csv")
        self.medicines = self._read_csv("medicines.csv")
        self.lab_tests = self._read_csv("lab_tests.csv")
        self.vendors = self._read_csv("vendors.csv")
        self.facilities = self._read_csv("facilities.csv")
        self.departments = self._read_csv("departments.csv")
        self.patients = self._read_csv("patients.csv")

        # Load existing synthetic appointments and admissions
        print("Loading previously generated synthetic encounters from generated_data/...")
        app_file = GENERATED_DIR / "synthetic_appointments_20261014_174523_bed9059a.csv"
        adm_file = GENERATED_DIR / "synthetic_admissions_20261014_174529_d8fabb1b.csv"

        if not app_file.exists():
            raise FileNotFoundError(f"Missing synthetic appointments file: {app_file}")
        if not adm_file.exists():
            raise FileNotFoundError(f"Missing synthetic admissions file: {adm_file}")

        with open(app_file, "r", encoding="utf-8") as f:
            self.synthetic_appointments = list(csv.DictReader(f))
        with open(adm_file, "r", encoding="utf-8") as f:
            self.synthetic_admissions = list(csv.DictReader(f))

        print(f"  * Loaded {len(self.doctors)} doctors")
        print(f"  * Loaded {len(self.staff)} staff")
        print(f"  * Loaded {len(self.medicines)} medicines")
        print(f"  * Loaded {len(self.lab_tests)} lab tests")
        print(f"  * Loaded {len(self.vendors)} vendors")
        print(f"  * Loaded {len(self.synthetic_appointments)} synthetic appointments (batch bed9059a)")
        print(f"  * Loaded {len(self.synthetic_admissions)} synthetic admissions (batch d8fabb1b)\n")

    def _read_csv(self, filename: str) -> List[Dict[str, Any]]:
        p = BASE_DATASET_DIR / filename
        if not p.exists():
            raise FileNotFoundError(f"Baseline file missing: {p}")
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return list(csv.DictReader(f))


class ExtendedHospitalDataGenerator:
    """Generates all 16 connected operational datasets preserving full referential integrity."""

    def __init__(self, ref: ExtendedReferenceUniverse, run_id: Optional[str] = None, seed: Optional[int] = 42):
        self.ref = ref
        self.run_id = run_id or uuid.uuid4().hex[:8]
        if seed is not None:
            random.seed(seed)

    def _sample_date(self) -> datetime.date:
        """
        Stratified temporal distribution across 2026 reporting periods through current date (2026-10-14):
          - ~3%  : Today (2026-10-14)
          - ~10% : This Week (2026-10-07 to 2026-10-13)
          - ~15% : October MTD (2026-10-01 to 2026-10-06)
          - ~25% : September 2026 (2026-09-01 to 2026-09-30)
          - ~22% : Q3 Remainder (2026-07-01 to 2026-08-31)
          - ~25% : YTD Prior Quarters (2026-01-01 to 2026-06-30)
        """
        p = random.random()
        if p < 0.03:
            return datetime.date(2026, 10, 14)
        elif p < 0.13:
            offset = random.randint(0, 6)
            return datetime.date(2026, 10, 7) + datetime.timedelta(days=offset)
        elif p < 0.28:
            offset = random.randint(0, 5)
            return datetime.date(2026, 10, 1) + datetime.timedelta(days=offset)
        elif p < 0.53:
            offset = random.randint(0, 29)
            return datetime.date(2026, 9, 1) + datetime.timedelta(days=offset)
        elif p < 0.75:
            offset = random.randint(0, 61)
            return datetime.date(2026, 7, 1) + datetime.timedelta(days=offset)
        else:
            offset = random.randint(0, 180)
            return datetime.date(2026, 1, 1) + datetime.timedelta(days=offset)

    def generate_all(self) -> Dict[str, List[Dict[str, Any]]]:
        results: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Prescriptions (derived from synthetic appointments)
        print("Generating prescriptions...")
        prescriptions = self._generate_prescriptions(target_count=12000)
        results["prescriptions"] = prescriptions

        # 2. Pharmacy Dispensing (derived from dispensed prescriptions)
        print("Generating pharmacy dispensing...")
        dispensing = self._generate_pharmacy_dispensing(prescriptions, target_count=10000)
        results["pharmacy_dispensing"] = dispensing

        # 3. Lab Orders & Results (derived from synthetic appointments)
        print("Generating lab orders & results...")
        lab_orders = self._generate_lab_orders_results(target_count=10000)
        results["lab_orders_results"] = lab_orders

        # 4. Lab Samples (derived 1:1 from lab orders)
        print("Generating lab samples...")
        lab_samples = self._generate_lab_samples(lab_orders)
        results["lab_samples"] = lab_samples

        # 5. Patient Feedback (derived from synthetic appointments)
        print("Generating patient feedback...")
        feedback = self._generate_patient_feedback(target_count=8000)
        results["patient_feedback"] = feedback

        # 6. Patient Complaints (derived from feedback with complaint_flag == 'Yes')
        print("Generating patient complaints...")
        complaints = self._generate_patient_complaints(feedback, target_count=2500)
        results["patient_complaints"] = complaints

        # 7. Doctor Workload (aggregated by doctor & operational dates)
        print("Generating doctor workload...")
        doctor_workload = self._generate_doctor_workload(target_count=10000)
        results["doctor_workload"] = doctor_workload

        # 8. Staff Attendance (daily shift attendance across staff members)
        print("Generating staff attendance...")
        staff_attendance = self._generate_staff_attendance(target_count=12000)
        results["staff_attendance"] = staff_attendance

        # 9. Nurse Shifts (nursing staff shift roster)
        print("Generating nurse shifts...")
        nurse_shifts = self._generate_nurse_shifts(target_count=8000)
        results["nurse_shifts"] = nurse_shifts

        # 10. Staff Workload (daily staff tasks and utilization)
        print("Generating staff workload...")
        staff_workload = self._generate_staff_workload(target_count=10000)
        results["staff_workload"] = staff_workload

        # 11. Quality Incidents (clinical/operational incidents)
        print("Generating quality incidents...")
        incidents = self._generate_quality_incidents(target_count=2500)
        results["quality_incidents"] = incidents

        # 12. Corrective Actions (derived from incidents where CAPA required)
        print("Generating corrective actions...")
        actions = self._generate_corrective_actions(incidents)
        results["corrective_actions"] = actions

        # 13. Quality Audits (periodic compliance audits)
        print("Generating quality audits...")
        audits = self._generate_quality_audits(target_count=2500)
        results["quality_audits"] = audits

        # 14. Medicine Batches (inventory batches for formulary medicines)
        print("Generating medicine batches...")
        batches = self._generate_medicine_batches(target_count=1200)
        results["medicine_batches"] = batches

        # 15. Purchase Orders (replenishment orders for formulary medicines)
        print("Generating purchase orders...")
        pos = self._generate_purchase_orders(target_count=3500)
        results["purchase_orders"] = pos

        # 16. Supply Chain Purchase Orders (enterprise procurement orders)
        print("Generating supply chain purchase orders...")
        spos = self._generate_supply_chain_purchase_orders(target_count=4000)
        results["supply_chain_purchase_orders"] = spos

        return results

    # --------------------------------------------------------------------------
    # Module C: Pharmacy & Inventory
    # --------------------------------------------------------------------------
    def _generate_prescriptions(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        eligible_apps = [a for a in self.ref.synthetic_appointments if a["status"] in ["Completed", "Scheduled"]]
        sample_apps = random.sample(eligible_apps, min(target_count, len(eligible_apps)))

        for i, app in enumerate(sample_apps, start=1):
            rx_id = f"SYN-RX-{self.run_id}-{i:05d}"
            med = random.choice(self.ref.medicines)
            records.append({
                "prescription_id": rx_id,
                "appointment_id": app["appointment_id"],
                "patient_id": app["patient_id"],
                "doctor_id": app["doctor_id"],
                "facility_id": app["facility_id"],
                "department_id": app["department_id"],
                "medicine_id": med["medicine_id"],
                "prescription_date": app["appointment_date"],
                "route": random.choice(["Oral", "Injection", "IV", "Topical"]),
                "quantity_prescribed": random.choice([10, 15, 20, 30, 60]),
                "prescription_status": random.choices(["Dispensed", "Completed", "Active"], weights=[0.75, 0.20, 0.05])[0],
            })
        return records

    def _generate_pharmacy_dispensing(self, prescriptions: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
        records = []
        dispensable_rxs = [rx for rx in prescriptions if rx["prescription_status"] in ["Dispensed", "Completed"]]
        sample_rxs = random.sample(dispensable_rxs, min(target_count, len(dispensable_rxs)))

        med_cost_map = {m["medicine_id"]: float(m.get("unit_cost", 50.0)) for m in self.ref.medicines}
        pharmacists = [s for s in self.ref.staff if "pharmacist" in s.get("role", "").lower()]
        if not pharmacists:
            pharmacists = self.ref.staff[:20]

        today = datetime.date(2026, 10, 14)

        for rx in sample_rxs:
            qty = int(rx["quantity_prescribed"])
            cost = med_cost_map.get(rx["medicine_id"], 50.0)
            disp_val = round(qty * cost, 2)
            rx_date = datetime.date.fromisoformat(rx["prescription_date"])
            
            # Dispensed either same day or next day, never exceeding today
            if rx_date < today:
                disp_date = rx_date + datetime.timedelta(days=random.choice([0, 1]))
            else:
                disp_date = rx_date
            pharm = random.choice(pharmacists)

            records.append({
                "prescription_id": rx["prescription_id"],
                "appointment_id": rx["appointment_id"],
                "patient_id": rx["patient_id"],
                "facility_id": rx["facility_id"],
                "medicine_id": rx["medicine_id"],
                "dispense_date": disp_date.strftime("%Y-%m-%d"),
                "dispensed_quantity": qty,
                "pharmacist_id": pharm["staff_id"],
                "dispense_value": disp_val,
            })
        return records

    def _generate_medicine_batches(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        facilities = [f["facility_id"] for f in self.ref.facilities]
        for i in range(1, target_count + 1):
            batch_id = f"SYN-BAT-{self.run_id}-{i:05d}"
            med = random.choice(self.ref.medicines)
            fac = random.choice(facilities)
            vendor = med.get("vendor_id") or random.choice(self.ref.vendors)["vendor_id"]
            
            # Expiry dates spanning late 2026 to 2028
            days_ahead = random.randint(30, 750)
            exp_date = datetime.date(2026, 10, 14) + datetime.timedelta(days=days_ahead)
            qty = random.randint(100, 2500)
            cost = float(med.get("unit_cost", 50.0))

            records.append({
                "batch_id": batch_id,
                "facility_id": fac,
                "medicine_id": med["medicine_id"],
                "vendor_id": vendor,
                "expiry_date": exp_date.strftime("%Y-%m-%d"),
                "batch_quantity": qty,
                "unit_cost": cost,
            })
        return records

    # --------------------------------------------------------------------------
    # Module B: Laboratory & Diagnostics
    # --------------------------------------------------------------------------
    def _generate_lab_orders_results(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        eligible_apps = [a for a in self.ref.synthetic_appointments if a["status"] in ["Completed", "Scheduled"]]
        sample_apps = random.sample(eligible_apps, min(target_count, len(eligible_apps)))
        today = datetime.date(2026, 10, 14)

        for i, app in enumerate(sample_apps, start=1):
            lo_id = f"SYN-LO-{self.run_id}-{i:05d}"
            test = random.choice(self.ref.lab_tests)
            tat = int(test.get("target_tat_hours", 24))
            app_date = datetime.date.fromisoformat(app["appointment_date"])
            col_date = app_date  # Same day collection

            res_dt = datetime.datetime.combine(col_date, datetime.time(10, 0)) + datetime.timedelta(hours=tat)
            if res_dt.date() > today:
                res_dt = datetime.datetime.combine(today, datetime.time(20, 0))

            prio = random.choices(["Routine", "Urgent", "Stat"], weights=[0.80, 0.16, 0.04])[0]
            status = random.choices(["Normal", "Abnormal", "Critical"], weights=[0.82, 0.15, 0.03])[0]

            records.append({
                "lab_order_id": lo_id,
                "appointment_id": app["appointment_id"],
                "patient_id": app["patient_id"],
                "doctor_id": app["doctor_id"],
                "department_id": app["department_id"],
                "facility_id": app["facility_id"],
                "test_id": test["test_id"],
                "test_name": test["test_name"],
                "category": test["category"],
                "order_date": app["appointment_date"],
                "collection_date": col_date.strftime("%Y-%m-%d"),
                "result_date": res_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "tat_hours": tat,
                "priority": prio,
                "result_status": status,
            })
        return records

    def _generate_lab_samples(self, lab_orders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        records = []
        sample_type_map = {
            "Biochemistry": "Blood",
            "Microbiology": "Urine",
            "Radiology": "Radiology",
            "Immunology": "Blood",
            "Cardiology Diagnostics": "Blood",
            "Hematology": "Blood",
            "Pathology": "Swab",
        }
        for i, lo in enumerate(lab_orders, start=1):
            smp_id = f"SYN-SMP-{self.run_id}-{i:05d}"
            stype = sample_type_map.get(lo["category"], "Blood")
            status = random.choices(["Collected", "Processed", "Rejected"], weights=[0.85, 0.13, 0.02])[0]

            records.append({
                "sample_id": smp_id,
                "lab_order_id": lo["lab_order_id"],
                "patient_id": lo["patient_id"],
                "facility_id": lo["facility_id"],
                "test_id": lo["test_id"],
                "sample_type": stype,
                "collection_date": lo["collection_date"],
                "sample_status": status,
            })
        return records

    # --------------------------------------------------------------------------
    # Module E: Patient Experience
    # --------------------------------------------------------------------------
    def _generate_patient_feedback(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        completed_apps = [a for a in self.ref.synthetic_appointments if a["status"] == "Completed"]
        sample_apps = random.sample(completed_apps, min(target_count, len(completed_apps)))
        today = datetime.date(2026, 10, 14)

        for i, app in enumerate(sample_apps, start=1):
            fb_id = f"SYN-FB-{self.run_id}-{i:05d}"
            app_d = datetime.date.fromisoformat(app["appointment_date"])
            fb_d = min(app_d + datetime.timedelta(days=random.randint(0, 2)), today)

            overall = random.choices([5, 4, 3, 2, 1], weights=[0.43, 0.32, 0.14, 0.07, 0.04])[0]
            sentiment = "Positive" if overall >= 4 else ("Neutral" if overall == 3 else "Negative")
            rec = "Yes" if overall >= 4 else ("No" if overall <= 2 else random.choice(["Yes", "No"]))
            
            # Ensure sufficient complaint_flag == 'Yes' (~40% of feedback, matching baseline ~50%)
            if overall <= 2:
                complaint_flag = "Yes"
            elif overall == 3:
                complaint_flag = "Yes" if random.random() < 0.70 else "No"
            else:
                complaint_flag = "Yes" if random.random() < 0.30 else "No"

            nps = random.randint(9, 10) if overall == 5 else (random.randint(7, 8) if overall == 4 else random.randint(1, 6))

            records.append({
                "feedback_id": fb_id,
                "appointment_id": app["appointment_id"],
                "patient_id": app["patient_id"],
                "facility_id": app["facility_id"],
                "department_id": app["department_id"],
                "feedback_date": fb_d.strftime("%Y-%m-%d"),
                "overall_rating": overall,
                "wait_time_rating": max(1, min(5, overall + random.choice([-1, 0, 1]))),
                "staff_rating": max(1, min(5, overall + random.choice([0, 1]))),
                "service_quality_rating": overall,
                "recommendation": rec,
                "sentiment": sentiment,
                "feedback_channel": random.choice(["Mobile App", "SMS", "Web", "Email", "Kiosk"]),
                "complaint_flag": complaint_flag,
                "nps_score": nps,
                "csat_score": overall,
            })
        return records

    def _generate_patient_complaints(self, feedback: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
        records = []
        flagged_fb = [f for f in feedback if f["complaint_flag"] == "Yes"]
        sample_fb = random.sample(flagged_fb, min(target_count, len(flagged_fb)))

        for i, fb in enumerate(sample_fb, start=1):
            cp_id = f"SYN-CP-{self.run_id}-{i:05d}"
            cat = random.choice(["Pharmacy", "Waiting Time", "Billing", "Lab Delay", "Staff Behavior"])
            prio = random.choices(["Low", "Medium", "High", "Critical"], weights=[0.30, 0.45, 0.20, 0.05])[0]
            status = random.choices(["Resolved", "In Progress", "Open"], weights=[0.65, 0.22, 0.13])[0]
            res_hours = random.choice([12, 24, 36, 48, 72]) if status == "Resolved" else 0

            records.append({
                "complaint_id": cp_id,
                "feedback_id": fb["feedback_id"],
                "patient_id": fb["patient_id"],
                "facility_id": fb["facility_id"],
                "department_id": fb["department_id"],
                "complaint_date": fb["feedback_date"],
                "complaint_category": cat,
                "priority": prio,
                "status": status,
                "resolution_hours": res_hours,
            })
        return records

    # --------------------------------------------------------------------------
    # Module A: Doctor & Staff Intelligence
    # --------------------------------------------------------------------------
    def _generate_doctor_workload(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        seen: Set[Tuple[str, str]] = set()
        attempts = 0
        max_attempts = target_count * 20

        while len(records) < target_count and attempts < max_attempts:
            attempts += 1
            doc = random.choice(self.ref.doctors)
            w_date = self._sample_date()
            d_str = w_date.strftime("%Y-%m-%d")
            key = (doc["doctor_id"], d_str)
            if key in seen:
                continue
            seen.add(key)

            i = len(records) + 1
            w_id = f"SYN-DWL-{self.run_id}-{i:05d}"

            app_handled = random.randint(4, 14)
            emerg_cases = random.choices([0, 1, 2, 3], weights=[0.30, 0.40, 0.20, 0.10])[0]
            surgeries = random.choices([0, 1, 2], weights=[0.70, 0.25, 0.05])[0]
            inp_rounds = random.randint(1, 5)

            work_hrs = round(7.0 + (app_handled * 0.25) + (surgeries * 1.5), 1)
            overtime = max(0.0, round(work_hrs - 8.0, 1))
            util = min(100.0, round((work_hrs / 8.0) * 100.0, 1))
            score = round(min(100.0, 50.0 + (util * 0.4) + (surgeries * 5)), 1)

            records.append({
                "workload_id": w_id,
                "doctor_id": doc["doctor_id"],
                "facility_id": doc["facility_id"],
                "department_id": doc["department_id"],
                "date": d_str,
                "appointments_handled": app_handled,
                "emergency_cases": emerg_cases,
                "surgeries_performed": surgeries,
                "inpatient_rounds": inp_rounds,
                "working_hours": work_hrs,
                "overtime_hours": overtime,
                "workload_score": score,
                "utilization_pct": util,
            })
        return records

    def _generate_staff_attendance(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        seen: Set[Tuple[str, str]] = set()
        attempts = 0
        max_attempts = target_count * 20

        while len(records) < target_count and attempts < max_attempts:
            attempts += 1
            stf = random.choice(self.ref.staff)
            att_date = self._sample_date()
            d_str = att_date.strftime("%Y-%m-%d")
            key = (stf["staff_id"], d_str)
            if key in seen:
                continue
            seen.add(key)

            shift = random.choice(["Morning", "Evening", "Night"])
            status = random.choices(["Present", "Leave", "Absent", "Work From Home"], weights=[0.88, 0.06, 0.03, 0.03])[0]
            hrs = 8.0 if status == "Present" else (8.0 if status == "Work From Home" else 0.0)
            ot = round(random.choice([0.0, 0.5, 1.0, 1.5, 2.0]), 1) if status == "Present" and random.random() < 0.20 else 0.0

            records.append({
                "staff_id": stf["staff_id"],
                "attendance_date": d_str,
                "shift": shift,
                "attendance_status": status,
                "hours_worked": hrs,
                "overtime_hours": ot,
            })
        return records

    def _generate_nurse_shifts(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        nurses = [s for s in self.ref.staff if "nurse" in s.get("role", "").lower()]
        if not nurses:
            nurses = self.ref.staff[50:150]

        for i in range(1, target_count + 1):
            ns_id = f"SYN-NS-{self.run_id}-{i:05d}"
            nurse = random.choice(nurses)
            s_date = self._sample_date()
            s_type = random.choice(["Morning", "Evening", "Night"])

            sched = 8.0
            ot = round(random.choice([0.0, 1.0, 1.5, 2.0]), 1) if random.random() < 0.25 else 0.0
            worked = sched + ot
            pts = random.randint(4, 8)
            ratio = round(pts / 1.0, 1)
            absent = "Yes" if random.random() < 0.04 else "No"
            score = round(random.uniform(70.0, 95.0), 1)

            records.append({
                "shift_id": ns_id,
                "staff_id": nurse["staff_id"],
                "facility_id": nurse["facility_id"],
                "department_id": nurse["department_id"],
                "shift_date": s_date.strftime("%Y-%m-%d"),
                "shift_type": s_type,
                "scheduled_hours": sched,
                "worked_hours": worked,
                "overtime_hours": ot,
                "patients_assigned": pts,
                "patient_nurse_ratio": ratio,
                "absenteeism_flag": absent,
                "workload_score": score,
            })
        return records

    def _generate_staff_workload(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        seen: Set[Tuple[str, str]] = set()
        attempts = 0
        max_attempts = target_count * 20

        while len(records) < target_count and attempts < max_attempts:
            attempts += 1
            stf = random.choice(self.ref.staff)
            w_date = self._sample_date()
            d_str = w_date.strftime("%Y-%m-%d")
            key = (stf["staff_id"], d_str)
            if key in seen:
                continue
            seen.add(key)

            i = len(records) + 1
            w_id = f"SYN-SWL-{self.run_id}-{i:05d}"

            tasks = random.randint(5, 25)
            apps = random.randint(2, 10)
            avail = 8.0
            util = min(100.0, round(random.uniform(65.0, 98.0), 1))

            records.append({
                "workload_id": w_id,
                "staff_id": stf["staff_id"],
                "facility_id": stf["facility_id"],
                "department_id": stf["department_id"],
                "work_date": d_str,
                "appointments_handled": apps,
                "tasks_completed": tasks,
                "available_hours": avail,
                "utilization_pct": util,
            })
        return records

    # --------------------------------------------------------------------------
    # Module D: Quality & Compliance
    # --------------------------------------------------------------------------
    def _generate_quality_incidents(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        facilities = [f["facility_id"] for f in self.ref.facilities]
        departments = [d["department_id"] for d in self.ref.departments]

        for i in range(1, target_count + 1):
            inc_id = f"SYN-INC-{self.run_id}-{i:05d}"
            fac = random.choice(facilities)
            dep = random.choice(departments)
            inc_d = self._sample_date()

            itype = random.choice(["Medication Error", "Infection", "Equipment Issue", "Patient Safety", "Documentation Error"])
            sev = random.choices(["Low", "Moderate", "High", "Critical"], weights=[0.42, 0.35, 0.19, 0.04])[0]
            status = random.choices(["Closed", "Reported", "Under Investigation"], weights=[0.66, 0.19, 0.15])[0]
            capa_req = "Yes" if sev in ["High", "Critical"] or random.random() < 0.25 else "No"

            records.append({
                "incident_id": inc_id,
                "facility_id": fac,
                "department_id": dep,
                "incident_date": inc_d.strftime("%Y-%m-%d"),
                "incident_type": itype,
                "severity": sev,
                "status": status,
                "corrective_action_required": capa_req,
            })
        return records

    def _generate_corrective_actions(self, incidents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        records = []
        capa_incidents = [inc for inc in incidents if inc["corrective_action_required"] == "Yes"]

        for i, inc in enumerate(capa_incidents, start=1):
            ca_id = f"SYN-CA-{self.run_id}-{i:05d}"
            atype = random.choice(["Training", "Equipment Repair", "SOP Update", "Access Control", "Process Change"])
            inc_d = datetime.date.fromisoformat(inc["incident_date"])
            due_d = inc_d + datetime.timedelta(days=random.randint(14, 60))
            astatus = random.choices(["Completed", "In Progress", "Open", "Overdue"], weights=[0.50, 0.25, 0.15, 0.10])[0]

            records.append({
                "action_id": ca_id,
                "incident_id": inc["incident_id"],
                "facility_id": inc["facility_id"],
                "action_type": atype,
                "due_date": due_d.strftime("%Y-%m-%d"),
                "action_status": astatus,
            })
        return records

    def _generate_quality_audits(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        facilities = [f["facility_id"] for f in self.ref.facilities]
        departments = [d["department_id"] for d in self.ref.departments]

        for i in range(1, target_count + 1):
            aud_id = f"SYN-AUD-{self.run_id}-{i:05d}"
            fac = random.choice(facilities)
            dep = random.choice(departments)
            aud_d = self._sample_date()

            atype = random.choice(["Data Privacy", "Medication Safety", "Clinical", "Billing Compliance", "Documentation"])
            score = round(random.uniform(70.0, 98.0), 1)
            findings = random.choices([0, 1, 2, 3, 4], weights=[0.27, 0.28, 0.26, 0.13, 0.06])[0]
            status = "Compliant" if findings == 0 else ("Minor Findings" if findings <= 2 else "Major Findings")

            records.append({
                "audit_id": aud_id,
                "facility_id": fac,
                "department_id": dep,
                "audit_date": aud_d.strftime("%Y-%m-%d"),
                "audit_type": atype,
                "compliance_score": score,
                "findings_count": findings,
                "status": status,
            })
        return records

    # --------------------------------------------------------------------------
    # Module F: Supply Chain & Vendors
    # --------------------------------------------------------------------------
    def _generate_purchase_orders(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        facilities = [f["facility_id"] for f in self.ref.facilities]

        for i in range(1, target_count + 1):
            po_id = f"SYN-PO-{self.run_id}-{i:05d}"
            med = random.choice(self.ref.medicines)
            fac = random.choice(facilities)
            vendor = med.get("vendor_id") or random.choice(self.ref.vendors)["vendor_id"]
            po_d = self._sample_date()

            qty = random.randint(50, 500)
            val = round(qty * float(med.get("unit_cost", 50.0)), 2)
            status = random.choices(["Delivered", "Pending", "Partially Delivered", "Cancelled"], weights=[0.66, 0.16, 0.13, 0.05])[0]

            records.append({
                "po_id": po_id,
                "facility_id": fac,
                "vendor_id": vendor,
                "medicine_id": med["medicine_id"],
                "order_date": po_d.strftime("%Y-%m-%d"),
                "ordered_quantity": qty,
                "order_value": val,
                "po_status": status,
            })
        return records

    def _generate_supply_chain_purchase_orders(self, target_count: int) -> List[Dict[str, Any]]:
        records = []
        facilities = [f["facility_id"] for f in self.ref.facilities]

        for i in range(1, target_count + 1):
            spo_id = f"SYN-SPO-{self.run_id}-{i:05d}"
            vendor = random.choice(self.ref.vendors)["vendor_id"]
            fac = random.choice(facilities)
            po_d = self._sample_date()

            cat = random.choice(["Lab Supplies", "Equipment", "Medical Supplies", "Medicines", "Consumables"])
            amt = round(random.uniform(15000.0, 250000.0), 2)
            status = random.choices(["Received", "Ordered", "Partially Received", "Approved", "Cancelled"], weights=[0.43, 0.20, 0.18, 0.14, 0.05])[0]

            exp_days = random.randint(3, 14)
            act_days = exp_days + random.choice([-1, 0, 1, 2, 3])
            on_time = "Yes" if act_days <= exp_days else "No"

            records.append({
                "supply_po_id": spo_id,
                "vendor_id": vendor,
                "facility_id": fac,
                "po_date": po_d.strftime("%Y-%m-%d"),
                "category": cat,
                "order_amount": amt,
                "status": status,
                "expected_delivery_days": exp_days,
                "actual_delivery_days": act_days,
                "on_time_flag": on_time,
            })
        return records


def write_csv_safely(records: List[Dict[str, Any]], columns: List[str], file_path: Path):
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if file_path.exists():
        raise FileExistsError(f"LOCAL COLLISION REFUSED: {file_path} already exists. Aborting to protect existing data.")
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(records)


def main():
    print("=" * 80)
    print("     MEDOPS EXTENDED OPERATIONAL DATASET GENERATOR: LOCAL GENERATION")
    print("=" * 80)
    
    ref = ExtendedReferenceUniverse()
    run_id = uuid.uuid4().hex[:8]
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    generator = ExtendedHospitalDataGenerator(ref, run_id=run_id, seed=20261014)

    print("Generating 16 extended operational datasets...")
    datasets = generator.generate_all()

    print("\nWriting generated datasets to generated_data/...")
    generated_files = []
    total_records = 0

    for name, records in datasets.items():
        schema = EXTENDED_DATASET_SCHEMAS[name]
        filename = f"synthetic_{name}_{timestamp}_{run_id}.csv"
        out_path = GENERATED_DIR / filename
        write_csv_safely(records, schema["columns"], out_path)
        generated_files.append((name, len(records), out_path))
        total_records += len(records)
        print(f"  [PASS] {name:<28}: {len(records):>5} records -> {out_path.name}")

    print("\n" + "=" * 80)
    print("                     GENERATION SUMMARY")
    print("=" * 80)
    print(f"Batch Run ID         : {run_id}")
    print(f"Total Datasets       : {len(generated_files)}")
    print(f"Total Records Created: {total_records:,}")
    print("=" * 80)

if __name__ == "__main__":
    main()
