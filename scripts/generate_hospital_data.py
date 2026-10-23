#!/usr/bin/env python3
"""
Medical Operations Intelligence & Automation System (MedOps)
Standalone Synthetic Hospital Data Generator
============================================================

A safe, manually executed CLI utility for generating validated synthetic hospital
data conforming strictly to the AWS Glue Data Catalog and Amazon Athena schemas.

Execution Modes:
  1. local    : Generates synthetic records, validates schema & integrity,
                and writes CSV files to a local directory without touching AWS.
  2. validate : Reads existing generated CSV files and runs schema, type,
                and relational integrity validation.
  3. upload   : Generates and validates synthetic records, displays target S3
                destinations, prompts for explicit confirmation, checks for
                existing S3 objects to prevent overwrites, and uploads new files.

SAFETY GUARANTEES:
  - NEVER executes automatically (no crons, no Lambdas, no EventBridge, no app startup hooks).
  - NEVER modifies existing project datasets in dataset/.
  - NEVER overwrites existing S3 objects (enforces head_object preflight and atomic IfNoneMatch='*' conditional writes).
  - NEVER automatically executes Athena queries or Glue crawlers.
  - Generates clearly marked synthetic identifiers (e.g., SYN-ADM-*, SYN-PAT-*).
  - Enforces mathematical, temporal, and relational constraints across datasets.
"""

import os
import sys
import csv
import json
import uuid
import random
import argparse
import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Set

# Optional boto3 import with graceful fallback
try:
    import boto3
    import botocore.exceptions
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False


# ==============================================================================
# 1. SCHEMA DEFINITIONS (Verified against AWS Glue Data Catalog & dataset/*.csv)
# ==============================================================================

SUPPORTED_DATASETS: Dict[str, Dict[str, Any]] = {
    "admissions": {
        "s3_prefix": "raw/admissions/",
        "id_column": "admission_id",
        "id_prefix": "SYN-ADM",
        "columns": [
            "admission_id",
            "patient_id",
            "facility_id",
            "department_id",
            "bed_id",
            "admission_date",
            "discharge_date",
            "admission_type",
            "length_of_stay_days",
            "discharge_status",
        ],
        "types": {
            "admission_id": "string",
            "patient_id": "string",
            "facility_id": "string",
            "department_id": "string",
            "bed_id": "string",
            "admission_date": "date",
            "discharge_date": "date",
            "admission_type": "string",
            "length_of_stay_days": "float",
            "discharge_status": "string",
        },
        "valid_values": {
            "admission_type": ["Transfer", "Elective", "Day Care", "Emergency"],
            "discharge_status": ["Against Medical Advice", "Transferred", "Discharged", "Referred"],
        },
    },
    "appointments": {
        "s3_prefix": "raw/appointments/",
        "id_column": "appointment_id",
        "id_prefix": "SYN-APP",
        "columns": [
            "appointment_id",
            "patient_id",
            "doctor_id",
            "department_id",
            "facility_id",
            "appointment_date",
            "appointment_time",
            "status",
            "booking_type",
            "wait_time_minutes",
            "consultation_duration_minutes",
        ],
        "types": {
            "appointment_id": "string",
            "patient_id": "string",
            "doctor_id": "string",
            "department_id": "string",
            "facility_id": "string",
            "appointment_date": "date",
            "appointment_time": "time",
            "status": "string",
            "booking_type": "string",
            "wait_time_minutes": "int",
            "consultation_duration_minutes": "int",
        },
        "valid_values": {
            "status": ["Completed", "Scheduled", "No Show", "Cancelled"],
            "booking_type": ["Online", "Walk-in", "Referral", "Phone"],
        },
    },
    "billing": {
        "s3_prefix": "raw/billing/",
        "id_column": "bill_id",
        "id_prefix": "SYN-BIL",
        "columns": [
            "bill_id",
            "appointment_id",
            "patient_id",
            "doctor_id",
            "department_id",
            "facility_id",
            "bill_date",
            "service_type",
            "gross_amount",
            "discount_amount",
            "net_amount",
            "insurance_amount",
            "patient_amount",
            "paid_amount",
            "outstanding_amount",
            "payment_status",
            "payment_method",
        ],
        "types": {
            "bill_id": "string",
            "appointment_id": "string",
            "patient_id": "string",
            "doctor_id": "string",
            "department_id": "string",
            "facility_id": "string",
            "bill_date": "date",
            "service_type": "string",
            "gross_amount": "float",
            "discount_amount": "float",
            "net_amount": "float",
            "insurance_amount": "float",
            "patient_amount": "float",
            "paid_amount": "float",
            "outstanding_amount": "float",
            "payment_status": "string",
            "payment_method": "string",
        },
        "valid_values": {
            "payment_status": ["Partially Paid", "Paid", "Outstanding"],
            "payment_method": ["Bank Transfer", "Card", "UPI", "Insurance", "Cash"],
            "service_type": [
                "Pediatric Consultation",
                "Preventive Consultation",
                "Cardiac Diagnostic Review",
                "Orthopedic Consultation",
                "Orthopedic Follow-up",
                "Emergency Observation",
                "General Medicine Consultation",
                "Neurology Consultation",
            ],
        },
    },
    "claims": {
        "s3_prefix": "raw/claims/",
        "id_column": "claim_id",
        "id_prefix": "SYN-CLM",
        "columns": [
            "claim_id",
            "bill_id",
            "patient_id",
            "facility_id",
            "department_id",
            "payer",
            "submission_date",
            "claimed_amount",
            "claim_status",
            "denial_reason",
            "last_update_date",
            "paid_amount",
            "outstanding_claim_amount",
        ],
        "types": {
            "claim_id": "string",
            "bill_id": "string",
            "patient_id": "string",
            "facility_id": "string",
            "department_id": "string",
            "payer": "string",
            "submission_date": "date",
            "claimed_amount": "float",
            "claim_status": "string",
            "denial_reason": "string",
            "last_update_date": "date",
            "paid_amount": "float",
            "outstanding_claim_amount": "float",
        },
        "valid_values": {
            "claim_status": ["Denied", "Approved", "Paid", "Pending", "Under Review"],
            "denial_reason": [
                "Authorization Missing",
                "Not Applicable",
                "Coding Error",
                "Policy Exclusion",
                "Duplicate Claim",
                "Missing Documentation",
            ],
            "payer": ["ICICI Lombard", "Star Health", "HDFC ERGO", "Niva Bupa", "Care Health"],
        },
    },
    "emergency_visits": {
        "s3_prefix": "raw/emergency_visits/",
        "id_column": "emergency_visit_id",
        "id_prefix": "SYN-EV",
        "columns": [
            "emergency_visit_id",
            "patient_id",
            "facility_id",
            "department_id",
            "arrival_datetime",
            "arrival_mode",
            "triage_level",
            "chief_complaint",
            "waiting_time_minutes",
            "treatment_duration_minutes",
            "disposition",
            "admission_required",
            "discharge_datetime",
        ],
        "types": {
            "emergency_visit_id": "string",
            "patient_id": "string",
            "facility_id": "string",
            "department_id": "string",
            "arrival_datetime": "datetime",
            "arrival_mode": "string",
            "triage_level": "int",
            "chief_complaint": "string",
            "waiting_time_minutes": "int",
            "treatment_duration_minutes": "int",
            "disposition": "string",
            "admission_required": "string",
            "discharge_datetime": "datetime",
        },
        "valid_values": {
            "arrival_mode": ["Walk-in", "Referral", "Ambulance", "Police/Public"],
            "disposition": ["Admitted", "Discharged", "LWBS", "Transferred", "Deceased"],
            "admission_required": ["Yes", "No"],
            "triage_level": [1, 2, 3, 4, 5],
            "chief_complaint": [
                "Chest Pain",
                "Fracture",
                "Laceration",
                "Fever",
                "Breathing Difficulty",
                "Abdominal Pain",
                "Seizure",
                "Allergic Reaction",
            ],
        },
    },
    "inventory_transactions": {
        "s3_prefix": "raw/inventory_transactions/",
        "id_column": "transaction_id",
        "id_prefix": "SYN-TXN",
        "columns": [
            "transaction_id",
            "facility_id",
            "medicine_id",
            "transaction_type",
            "transaction_date",
            "quantity",
            "transaction_value",
            "vendor_id",
        ],
        "types": {
            "transaction_id": "string",
            "facility_id": "string",
            "medicine_id": "string",
            "transaction_type": "string",
            "transaction_date": "date",
            "quantity": "int",
            "transaction_value": "float",
            "vendor_id": "string",
        },
        "valid_values": {
            "transaction_type": ["Dispense", "Purchase", "Adjustment", "Return"],
        },
    },
}

# Reason why the static 'inventory' table is omitted from direct append generation:
EXCLUDED_DATASETS_RATIONALE = {
    "inventory": (
        "The 'inventory' table is a 1,000-row static snapshot table keyed by (facility_id, medicine_id) "
        "(5 facilities x 200 medicines). In Amazon Athena's S3-backed CSV query model, appending additional rows "
        "to 'raw/inventory/' causes duplicate primary keys and distorts aggregate stock calculations. "
        "Use 'inventory_transactions' instead for safe append generation of stock movements."
    )
}

# Batch size constraints
MIN_BATCH_SIZE = 1
MAX_BATCH_SIZE = 100000
DEFAULT_BATCH_SIZE = 50


# ==============================================================================
# 2. REFERENCE UNIVERSE LOADER (Facilities, Doctors, Departments, Beds, Medicines)
# ==============================================================================

class ReferenceUniverse:
    """
    Loads dimensional data from existing CSV files if available,
    or falls back to verified built-in seeds so generation is self-contained.
    """

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.dataset_dir = dataset_dir
        self.facilities: List[str] = ["FAC001", "FAC002", "FAC003", "FAC004", "FAC005"]
        self.departments: List[Dict[str, str]] = []
        self.doctors: List[Dict[str, str]] = []
        self.beds: List[Dict[str, str]] = []
        self.medicines: List[Dict[str, str]] = []
        self.vendors: List[str] = [f"VND{i:03d}" for i in range(1, 41)]
        self._load()

    def _load(self):
        # Look for local dataset directory
        candidates = []
        if self.dataset_dir:
            candidates.append(self.dataset_dir)
        candidates.extend([
            Path(__file__).resolve().parent.parent / "dataset" / "medical_operations_core_v9_100k" / "medical_operations_core_v9_100k",
            Path(__file__).resolve().parent.parent / "dataset" / "medical_operations_core_v9_100k",
            Path(__file__).resolve().parent.parent / "dataset",
        ])

        found_path: Optional[Path] = None
        for c in candidates:
            if c.exists() and (c / "facilities.csv").exists():
                found_path = c
                break

        if found_path:
            self._load_from_csv(found_path)
        else:
            self._load_fallback_seeds()

    def _load_from_csv(self, path: Path):
        # Facilities
        fac_file = path / "facilities.csv"
        if fac_file.exists():
            with open(fac_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.facilities = [r["facility_id"] for r in reader if "facility_id" in r]

        # Departments
        dep_file = path / "departments.csv"
        if dep_file.exists():
            with open(dep_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.departments = [
                    {"facility_id": r["facility_id"], "department_id": r["department_id"]}
                    for r in reader if "facility_id" in r and "department_id" in r
                ]

        # Doctors
        doc_file = path / "doctors.csv"
        if doc_file.exists():
            with open(doc_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.doctors = [
                    {
                        "doctor_id": r["doctor_id"],
                        "facility_id": r["facility_id"],
                        "department_id": r["department_id"],
                    }
                    for r in reader if "doctor_id" in r and "facility_id" in r and "department_id" in r
                ]

        # Beds
        bed_file = path / "beds.csv"
        if bed_file.exists():
            with open(bed_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.beds = [
                    {"bed_id": r["bed_id"], "facility_id": r["facility_id"]}
                    for r in reader if "bed_id" in r and "facility_id" in r
                ]

        # Medicines
        med_file = path / "medicines.csv"
        if med_file.exists():
            with open(med_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.medicines = [
                    {
                        "medicine_id": r["medicine_id"],
                        "vendor_id": r.get("vendor_id", "VND001"),
                        "unit_cost": float(r.get("unit_cost", 100.0)),
                    }
                    for r in reader if "medicine_id" in r
                ]

        # Vendors
        vnd_file = path / "vendors.csv"
        if vnd_file.exists():
            with open(vnd_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.vendors = [r["vendor_id"] for r in reader if "vendor_id" in r]

    def _load_fallback_seeds(self):
        # Fallback seeds ensuring valid execution even without dataset on disk
        self.facilities = ["FAC001", "FAC002", "FAC003", "FAC004", "FAC005"]
        for fac in self.facilities:
            for dep in ["DEP001", "DEP002", "DEP003", "DEP004", "DEP005", "DEP008"]:
                self.departments.append({"facility_id": fac, "department_id": dep})
        for i in range(1, 61):
            fac = self.facilities[i % len(self.facilities)]
            dep = f"DEP00{1 + (i % 5)}"
            self.doctors.append({"doctor_id": f"DOC{i:03d}", "facility_id": fac, "department_id": dep})
        for i in range(1, 101):
            fac = self.facilities[i % len(self.facilities)]
            self.beds.append({"bed_id": f"BED{i:04d}", "facility_id": fac})
        for i in range(1, 51):
            vnd = self.vendors[i % len(self.vendors)]
            self.medicines.append({"medicine_id": f"MED{i:04d}", "vendor_id": vnd, "unit_cost": 50.0 + (i * 5.0)})


# ==============================================================================
# 3. SYNTHETIC DATA GENERATOR CORE
# ==============================================================================

class HospitalDataGenerator:
    """
    Core generator implementing strict relational constraints, identifier formatting,
    and business rule formulations across hospital operational domains.
    """

    def __init__(self, ref_universe: ReferenceUniverse, run_id: Optional[str] = None, seed: Optional[int] = None):
        self.ref = ref_universe
        self.run_id = run_id or uuid.uuid4().hex[:8]
        if seed is not None:
            random.seed(seed)

    def generate_batch(self, batch_size: int, datasets: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Coordinates generation across requested datasets ensuring related records
        (appointments -> billing -> claims) maintain strict foreign key consistency.
        """
        if not (MIN_BATCH_SIZE <= batch_size <= MAX_BATCH_SIZE):
            raise ValueError(f"Batch size must be between {MIN_BATCH_SIZE} and {MAX_BATCH_SIZE}. Got: {batch_size}")

        results: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Admissions
        if "admissions" in datasets:
            results["admissions"] = self._generate_admissions(batch_size)

        # 2. Appointments
        appointments_list: List[Dict[str, Any]] = []
        if "appointments" in datasets or "billing" in datasets or "claims" in datasets:
            appointments_list = self._generate_appointments(batch_size)
            if "appointments" in datasets:
                results["appointments"] = appointments_list

        # 3. Billing (requires appointments)
        billing_list: List[Dict[str, Any]] = []
        if "billing" in datasets or "claims" in datasets:
            billing_list = self._generate_billing(appointments_list)
            if "billing" in datasets:
                results["billing"] = billing_list

        # 4. Claims (requires billing with insurance)
        if "claims" in datasets:
            results["claims"] = self._generate_claims(billing_list)

        # 5. Emergency Visits
        if "emergency_visits" in datasets:
            results["emergency_visits"] = self._generate_emergency_visits(batch_size)

        # 6. Inventory Transactions
        if "inventory_transactions" in datasets:
            results["inventory_transactions"] = self._generate_inventory_transactions(batch_size)

        return results

    def _sample_date(self) -> datetime.date:
        """
        Stratified temporal distribution across 2026 reporting periods through current date (2026-10-14):
          - ~3%  : Today (2026-10-14)
          - ~10% : This Week (2026-10-07 to 2026-10-13)
          - ~15% : October MTD (2026-10-01 to 2026-10-06)
          - ~25% : September 2026 ("This Month" in UI / closed month: 2026-09-01 to 2026-09-30)
          - ~22% : Q3 Remainder (July - August 2026: 2026-07-01 to 2026-08-31)
          - ~25% : YTD Prior Quarters (January - June 2026: 2026-01-01 to 2026-06-30)
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

    def _generate_admissions(self, count: int) -> List[Dict[str, Any]]:
        records = []

        for i in range(1, count + 1):
            adm_id = f"SYN-ADM-{self.run_id}-{i:05d}"
            pat_id = f"SYN-PAT-{self.run_id}-{(i % 500) + 1:04d}"
            fac_id = random.choice(self.ref.facilities)

            # Department in that facility
            fac_deps = [d["department_id"] for d in self.ref.departments if d["facility_id"] == fac_id]
            dep_id = random.choice(fac_deps) if fac_deps else "DEP001"

            # Bed in that facility
            fac_beds = [b["bed_id"] for b in self.ref.beds if b["facility_id"] == fac_id]
            bed_id = random.choice(fac_beds) if fac_beds else f"BED{random.randint(1, 900):04d}"

            # Dates & Length of Stay
            adm_date = self._sample_date()
            los_days = round(random.uniform(0.5, 14.0), 1)
            dis_date = adm_date + datetime.timedelta(days=max(1, int(los_days)))

            records.append({
                "admission_id": adm_id,
                "patient_id": pat_id,
                "facility_id": fac_id,
                "department_id": dep_id,
                "bed_id": bed_id,
                "admission_date": adm_date.strftime("%Y-%m-%d"),
                "discharge_date": dis_date.strftime("%Y-%m-%d"),
                "admission_type": random.choice(SUPPORTED_DATASETS["admissions"]["valid_values"]["admission_type"]),
                "length_of_stay_days": los_days,
                "discharge_status": random.choice(SUPPORTED_DATASETS["admissions"]["valid_values"]["discharge_status"]),
            })
        return records

    def _generate_appointments(self, count: int) -> List[Dict[str, Any]]:
        records = []

        for i in range(1, count + 1):
            app_id = f"SYN-APP-{self.run_id}-{i:05d}"
            pat_id = f"SYN-PAT-{self.run_id}-{(i % 500) + 1:04d}"

            doc = random.choice(self.ref.doctors)
            doc_id = doc["doctor_id"]
            fac_id = doc["facility_id"]
            dep_id = doc["department_id"]

            app_date = self._sample_date()
            hour = random.randint(8, 17)
            minute = random.choice([0, 15, 30, 45])
            app_time = f"{hour:02d}:{minute:02d}"

            records.append({
                "appointment_id": app_id,
                "patient_id": pat_id,
                "doctor_id": doc_id,
                "department_id": dep_id,
                "facility_id": fac_id,
                "appointment_date": app_date.strftime("%Y-%m-%d"),
                "appointment_time": app_time,
                "status": random.choice(SUPPORTED_DATASETS["appointments"]["valid_values"]["status"]),
                "booking_type": random.choice(SUPPORTED_DATASETS["appointments"]["valid_values"]["booking_type"]),
                "wait_time_minutes": random.randint(5, 60),
                "consultation_duration_minutes": random.randint(10, 45),
            })
        return records

    def _generate_billing(self, appointments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        records = []
        for i, app in enumerate(appointments, start=1):
            bill_id = f"SYN-BIL-{self.run_id}-{i:05d}"

            # Financial calculations with exact balances
            gross = round(random.uniform(500.0, 5000.0), 2)
            discount = round(gross * random.choice([0.0, 0.05, 0.10, 0.15]), 2)
            net = round(gross - discount, 2)

            has_insurance = random.random() < 0.70
            if has_insurance:
                ins = round(net * random.uniform(0.60, 0.90), 2)
                pat = round(net - ins, 2)
            else:
                ins = 0.0
                pat = net

            # Payment breakdown
            payment_status = random.choice(SUPPORTED_DATASETS["billing"]["valid_values"]["payment_status"])
            if payment_status == "Paid":
                paid = net
                outstanding = 0.0
            elif payment_status == "Partially Paid":
                paid = round(net * random.uniform(0.30, 0.70), 2)
                outstanding = round(net - paid, 2)
            else:  # Outstanding
                paid = 0.0
                outstanding = net

            records.append({
                "bill_id": bill_id,
                "appointment_id": app["appointment_id"],
                "patient_id": app["patient_id"],
                "doctor_id": app["doctor_id"],
                "department_id": app["department_id"],
                "facility_id": app["facility_id"],
                "bill_date": app["appointment_date"],
                "service_type": random.choice(SUPPORTED_DATASETS["billing"]["valid_values"]["service_type"]),
                "gross_amount": gross,
                "discount_amount": discount,
                "net_amount": net,
                "insurance_amount": ins,
                "patient_amount": pat,
                "paid_amount": paid,
                "outstanding_amount": outstanding,
                "payment_status": payment_status,
                "payment_method": random.choice(SUPPORTED_DATASETS["billing"]["valid_values"]["payment_method"]),
            })
        return records

    def _generate_claims(self, billing_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        records = []
        insured_bills = [b for b in billing_records if b["insurance_amount"] > 0]
        claim_idx = 1

        for bill in insured_bills:
            claim_id = f"SYN-CLM-{self.run_id}-{claim_idx:05d}"
            claim_idx += 1

            claimed = bill["insurance_amount"]
            status = random.choice(SUPPORTED_DATASETS["claims"]["valid_values"]["claim_status"])

            bill_date = datetime.datetime.strptime(bill["bill_date"], "%Y-%m-%d").date()
            sub_date = bill_date + datetime.timedelta(days=random.randint(1, 4))
            update_date = sub_date + datetime.timedelta(days=random.randint(5, 20))

            if status == "Denied":
                reason = random.choice([
                    r for r in SUPPORTED_DATASETS["claims"]["valid_values"]["denial_reason"] if r != "Not Applicable"
                ])
                paid = 0.0
                out_claim = claimed
            elif status in ["Approved", "Paid"]:
                reason = "Not Applicable"
                paid = round(claimed * random.uniform(0.92, 1.0), 2)
                out_claim = round(claimed - paid, 2)
            else:  # Pending, Under Review
                reason = "Not Applicable"
                paid = 0.0
                out_claim = claimed

            records.append({
                "claim_id": claim_id,
                "bill_id": bill["bill_id"],
                "patient_id": bill["patient_id"],
                "facility_id": bill["facility_id"],
                "department_id": bill["department_id"],
                "payer": random.choice(SUPPORTED_DATASETS["claims"]["valid_values"]["payer"]),
                "submission_date": sub_date.strftime("%Y-%m-%d"),
                "claimed_amount": claimed,
                "claim_status": status,
                "denial_reason": reason,
                "last_update_date": update_date.strftime("%Y-%m-%d"),
                "paid_amount": paid,
                "outstanding_claim_amount": out_claim,
            })
        return records

    def _generate_emergency_visits(self, count: int) -> List[Dict[str, Any]]:
        records = []

        for i in range(1, count + 1):
            ev_id = f"SYN-EV-{self.run_id}-{i:05d}"
            pat_id = f"SYN-PAT-{self.run_id}-{(i % 500) + 1:04d}"
            fac_id = random.choice(self.ref.facilities)

            # Look for emergency department DEP008, else fallback to first available
            fac_deps = [d["department_id"] for d in self.ref.departments if d["facility_id"] == fac_id]
            dep_id = "DEP008" if "DEP008" in fac_deps else (fac_deps[0] if fac_deps else "DEP008")

            d = self._sample_date()
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            arrival = datetime.datetime(d.year, d.month, d.day, hour, minute, second)
            wait_min = random.randint(5, 90)
            treat_min = random.randint(20, 180)
            discharge = arrival + datetime.timedelta(minutes=(wait_min + treat_min))

            disp = random.choice(SUPPORTED_DATASETS["emergency_visits"]["valid_values"]["disposition"])
            adm_req = "Yes" if disp == "Admitted" else ("No" if disp == "Discharged" else random.choice(["Yes", "No"]))

            records.append({
                "emergency_visit_id": ev_id,
                "patient_id": pat_id,
                "facility_id": fac_id,
                "department_id": dep_id,
                "arrival_datetime": arrival.strftime("%Y-%m-%d %H:%M:%S"),
                "arrival_mode": random.choice(SUPPORTED_DATASETS["emergency_visits"]["valid_values"]["arrival_mode"]),
                "triage_level": random.choice(SUPPORTED_DATASETS["emergency_visits"]["valid_values"]["triage_level"]),
                "chief_complaint": random.choice(SUPPORTED_DATASETS["emergency_visits"]["valid_values"]["chief_complaint"]),
                "waiting_time_minutes": wait_min,
                "treatment_duration_minutes": treat_min,
                "disposition": disp,
                "admission_required": adm_req,
                "discharge_datetime": discharge.strftime("%Y-%m-%d %H:%M:%S"),
            })
        return records

    def _generate_inventory_transactions(self, count: int) -> List[Dict[str, Any]]:
        records = []

        for i in range(1, count + 1):
            txn_id = f"SYN-TXN-{self.run_id}-{i:05d}"
            fac_id = random.choice(self.ref.facilities)
            med = random.choice(self.ref.medicines)
            med_id = med["medicine_id"]
            vnd_id = med.get("vendor_id") or random.choice(self.ref.vendors)
            unit_cost = med.get("unit_cost", 100.0)

            txn_date = self._sample_date()
            qty = random.randint(10, 150)
            val = round(qty * unit_cost, 2)

            records.append({
                "transaction_id": txn_id,
                "facility_id": fac_id,
                "medicine_id": med_id,
                "transaction_type": random.choice(SUPPORTED_DATASETS["inventory_transactions"]["valid_values"]["transaction_type"]),
                "transaction_date": txn_date.strftime("%Y-%m-%d"),
                "quantity": qty,
                "transaction_value": val,
                "vendor_id": vnd_id,
            })
        return records


# ==============================================================================
# 4. DATASET VALIDATOR ENGINE
# ==============================================================================

class ValidationResult:
    def __init__(self, dataset_name: str):
        self.dataset_name = dataset_name
        self.total_records: int = 0
        self.errors: List[str] = []
        self.warnings: List[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0


class DatasetValidator:
    """
    Validates synthetic dataset records against Glue schemas, data types,
    relational foreign keys, and arithmetic balances.
    """

    @classmethod
    def validate_dataset(cls, dataset_name: str, records: List[Dict[str, Any]]) -> ValidationResult:
        result = ValidationResult(dataset_name)
        result.total_records = len(records)

        if dataset_name not in SUPPORTED_DATASETS:
            result.errors.append(f"Unknown dataset '{dataset_name}'. Supported: {list(SUPPORTED_DATASETS.keys())}")
            return result

        schema = SUPPORTED_DATASETS[dataset_name]
        expected_cols = schema["columns"]
        col_types = schema["types"]
        valid_values = schema.get("valid_values", {})
        id_col = schema["id_column"]
        id_prefix = schema["id_prefix"]

        seen_ids: Set[str] = set()

        for idx, rec in enumerate(records, start=1):
            # 1. Header/Columns Check
            actual_cols = list(rec.keys())
            if actual_cols != expected_cols:
                result.errors.append(f"Row {idx}: Columns mismatch. Expected {expected_cols}, got {actual_cols}")
                break

            # 2. Required non-null check
            for col in expected_cols:
                val = rec.get(col)
                if val is None or str(val).strip() == "":
                    result.errors.append(f"Row {idx}: Required field '{col}' is null or empty.")

            # 3. ID format & uniqueness
            record_id = str(rec.get(id_col, ""))
            if not record_id.startswith(id_prefix):
                result.errors.append(f"Row {idx}: ID '{record_id}' does not start with synthetic marker '{id_prefix}'.")
            if record_id in seen_ids:
                result.errors.append(f"Row {idx}: Duplicate ID '{record_id}' found in dataset.")
            seen_ids.add(record_id)

            # 4. Type & Value Checks
            for col, expected_type in col_types.items():
                val = rec.get(col)
                if val is None:
                    continue

                if expected_type == "int":
                    try:
                        int(val)
                    except (ValueError, TypeError):
                        result.errors.append(f"Row {idx}: '{col}' value '{val}' is not a valid integer.")
                elif expected_type == "float":
                    try:
                        float(val)
                    except (ValueError, TypeError):
                        result.errors.append(f"Row {idx}: '{col}' value '{val}' is not a valid float.")
                elif expected_type == "date":
                    try:
                        datetime.datetime.strptime(str(val), "%Y-%m-%d")
                    except ValueError:
                        result.errors.append(f"Row {idx}: '{col}' date '{val}' not in YYYY-MM-DD format.")
                elif expected_type == "datetime":
                    try:
                        datetime.datetime.strptime(str(val), "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        result.errors.append(f"Row {idx}: '{col}' datetime '{val}' not in YYYY-MM-DD HH:MM:SS format.")

            # 5. Allowed categorical values
            for col, allowed in valid_values.items():
                val = rec.get(col)
                if val is not None:
                    allowed_str = [str(x) for x in allowed]
                    if str(val) not in allowed_str:
                        result.errors.append(f"Row {idx}: Invalid value '{val}' for column '{col}'. Allowed: {allowed}")

            # 6. Domain-specific arithmetic formulations
            if dataset_name == "billing":
                try:
                    gross = float(rec["gross_amount"])
                    discount = float(rec["discount_amount"])
                    net = float(rec["net_amount"])
                    ins = float(rec["insurance_amount"])
                    pat = float(rec["patient_amount"])
                    paid = float(rec["paid_amount"])
                    out = float(rec["outstanding_amount"])

                    if abs(gross - discount - net) > 0.02:
                        result.errors.append(f"Row {idx}: Billing arithmetic failed: gross ({gross}) - discount ({discount}) != net ({net})")
                    if abs(ins + pat - net) > 0.02:
                        result.errors.append(f"Row {idx}: Insurance breakdown failed: ins ({ins}) + pat ({pat}) != net ({net})")
                    if abs(net - paid - out) > 0.02:
                        result.errors.append(f"Row {idx}: Payment breakdown failed: net ({net}) - paid ({paid}) != out ({out})")
                except Exception as e:
                    result.errors.append(f"Row {idx}: Billing numeric evaluation error: {e}")

            elif dataset_name == "claims":
                try:
                    claimed = float(rec["claimed_amount"])
                    paid = float(rec["paid_amount"])
                    out = float(rec["outstanding_claim_amount"])
                    if abs(claimed - paid - out) > 0.02:
                        result.errors.append(f"Row {idx}: Claim arithmetic failed: claimed ({claimed}) - paid ({paid}) != out ({out})")
                except Exception as e:
                    result.errors.append(f"Row {idx}: Claim numeric evaluation error: {e}")

            elif dataset_name == "admissions":
                try:
                    adm_d = datetime.datetime.strptime(rec["admission_date"], "%Y-%m-%d")
                    dis_d = datetime.datetime.strptime(rec["discharge_date"], "%Y-%m-%d")
                    if dis_d < adm_d:
                        result.errors.append(f"Row {idx}: Discharge date ({rec['discharge_date']}) precedes admission date ({rec['admission_date']}).")
                except Exception as e:
                    result.errors.append(f"Row {idx}: Admission date error: {e}")

            elif dataset_name == "emergency_visits":
                try:
                    arr_d = datetime.datetime.strptime(rec["arrival_datetime"], "%Y-%m-%d %H:%M:%S")
                    dis_d = datetime.datetime.strptime(rec["discharge_datetime"], "%Y-%m-%d %H:%M:%S")
                    if dis_d < arr_d:
                        result.errors.append(f"Row {idx}: Emergency discharge ({rec['discharge_datetime']}) precedes arrival ({rec['arrival_datetime']}).")
                except Exception as e:
                    result.errors.append(f"Row {idx}: Emergency datetime error: {e}")

            # Stop checking after 20 errors to avoid spamming
            if len(result.errors) >= 20:
                result.errors.append("... Validation stopped: reached error limit (20).")
                break

        return result


# ==============================================================================
# 5. S3 UPLOADER WITH SAFETY & COLLISION CHECKS
# ==============================================================================

class SafeS3Uploader:
    """
    Manages explicit uploads to Amazon S3:
      - Operates in the target S3 bucket region (ap-south-1).
      - Validates credentials without printing secrets.
      - Displays upload plan and requires explicit human confirmation.
      - Calls head_object to ensure destination key does not already exist.
      - Uploads via put_object only if collision check passes.
      - NEVER deletes, overwrites, or executes Athena queries.
    """

    def __init__(
        self,
        bucket: str,
        region: str = "ap-south-1",
        s3_client=None,
        enable_conditional_write: Optional[bool] = None,
    ):
        self.bucket = bucket
        self.region = region
        self._s3 = s3_client
        self._enable_conditional_write = enable_conditional_write

    def _get_client(self):
        if self._s3 is not None:
            return self._s3
        if not BOTO3_AVAILABLE:
            raise RuntimeError("boto3 is not installed. Please install boto3 to use S3 upload mode.")

        try:
            session = boto3.Session(region_name=self.region)
            creds = session.get_credentials()
            if not creds:
                raise RuntimeError(
                    "AWS credentials not found. Please configure them via 'aws configure', "
                    "environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), or IAM role."
                )
            self._s3 = session.client("s3")
            return self._s3
        except Exception as e:
            raise RuntimeError(f"Failed to initialize AWS S3 client in region '{self.region}': {e}")

    def is_conditional_write_supported(self) -> bool:
        """
        Determines whether the installed boto3/botocore environment supports
        atomic conditional writes (IfNoneMatch='*') on S3 PutObject operations.
        """
        if self._enable_conditional_write is not None:
            return self._enable_conditional_write

        # 1. Check client service model if available and real
        client = self._s3
        if client is not None:
            try:
                if hasattr(client, "meta") and hasattr(client.meta, "service_model"):
                    members = client.meta.service_model.operation_model("PutObject").input_shape.members
                    if isinstance(members, dict):
                        return "IfNoneMatch" in members
            except Exception:
                pass

        # 2. Check botocore service definition directly
        if BOTO3_AVAILABLE:
            try:
                import botocore.loaders
                loader = botocore.loaders.Loader()
                model = loader.load_service_model("s3", "service-2")
                put_shape = model.get("operations", {}).get("PutObject", {}).get("input", {}).get("shape")
                members = model.get("shapes", {}).get(put_shape, {}).get("members", {})
                return "IfNoneMatch" in members
            except Exception:
                pass

        return False

    def verify_connection(self) -> bool:
        """Verifies AWS S3 connection and bucket accessibility."""
        client = self._get_client()
        try:
            client.head_bucket(Bucket=self.bucket)
            return True
        except botocore.exceptions.ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            raise RuntimeError(f"Cannot access S3 bucket '{self.bucket}' in region '{self.region}': {error_code} ({e})")
        except Exception as e:
            raise RuntimeError(f"Connection check failed: {e}")

    def object_exists(self, key: str) -> bool:
        """Checks if an S3 object already exists using head_object."""
        client = self._get_client()
        try:
            client.head_object(Bucket=self.bucket, Key=key)
            return True
        except botocore.exceptions.ClientError as e:
            if e.response.get("Error", {}).get("Code") in ["404", "NoSuchKey"]:
                return False
            raise
        except Exception:
            return False

    def upload_file(self, local_path: Path, s3_key: str) -> Dict[str, Any]:
        """
        Safely uploads local_path to s3_key.
        Enforces a two-tier overwrite defense:
          1. Preflight head_object check refusing upload if object already exists.
          2. Atomic conditional write (IfNoneMatch='*') on put_object if supported by botocore.
        Refuses upload and halts without retrying if a collision or precondition conflict occurs.
        """
        client = self._get_client()

        # Step 1: Preflight existence check
        if self.object_exists(s3_key):
            raise FileExistsError(f"DESTINATION COLLISION REFUSED: S3 object s3://{self.bucket}/{s3_key} already exists.")

        with open(local_path, "rb") as f:
            data = f.read()

        put_kwargs: Dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": s3_key,
            "Body": data,
            "ContentType": "text/csv",
        }

        # Step 2: Atomic protection against TOCTOU race conditions
        if self.is_conditional_write_supported():
            put_kwargs["IfNoneMatch"] = "*"

        try:
            response = client.put_object(**put_kwargs)
        except Exception as e:
            # Check for conditional write precondition failures (HTTP 412 / PreconditionFailed)
            is_precondition_failed = False
            if BOTO3_AVAILABLE and isinstance(e, botocore.exceptions.ClientError):
                error_code = e.response.get("Error", {}).get("Code", "")
                status_code = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
                if error_code in ["PreconditionFailed", "AtLeastOneConditionFailed"] or status_code == 412:
                    is_precondition_failed = True

            if is_precondition_failed:
                raise FileExistsError(
                    f"CONDITIONAL WRITE COLLISION REFUSED: S3 object s3://{self.bucket}/{s3_key} "
                    f"already exists (rejected atomically by S3 via IfNoneMatch='*'). "
                    f"Upload refused to prevent overwriting existing data. Never retrying unconditionally."
                )

            # Re-raise any other unexpected exception without retrying
            raise

        return {
            "bucket": self.bucket,
            "key": s3_key,
            "size_bytes": len(data),
            "etag": response.get("ETag", "").strip('"'),
            "status": "SUCCESS",
        }


class GlueTableVerifier:
    """
    Verifies that target datasets correspond to existing tables in the AWS Glue Data Catalog
    and that their S3 StorageDescriptor.Location precisely matches the planned destination.
    Always operates in the analytics region (ap-south-2).
    """

    def __init__(self, database: str = "medical_operations_db", region: str = "ap-south-2", glue_client=None):
        self.database = database
        self.region = region
        self._glue = glue_client

    def _get_client(self):
        if self._glue is not None:
            return self._glue
        if not BOTO3_AVAILABLE:
            raise RuntimeError("boto3 is not installed. Please install boto3 to perform Glue verification.")
        try:
            session = boto3.Session(region_name=self.region)
            creds = session.get_credentials()
            if not creds:
                raise RuntimeError(
                    "AWS credentials not found. Please configure credentials via 'aws configure' "
                    "or environment variables to verify AWS Glue tables."
                )
            self._glue = session.client("glue")
            return self._glue
        except Exception as e:
            raise RuntimeError(f"Failed to initialize AWS Glue client in region '{self.region}': {e}")

    def verify_table_location(self, table_name: str, expected_bucket: str, expected_prefix: str) -> str:
        """
        Retrieves table metadata from AWS Glue in self.region, inspects StorageDescriptor.Location,
        and verifies it matches s3://{expected_bucket}/{expected_prefix}.
        Returns the verified S3 prefix (e.g. 'raw/admissions/').
        Raises RuntimeError or ValueError if table missing, location differs, or Glue query fails.
        """
        client = self._get_client()
        try:
            response = client.get_table(DatabaseName=self.database, Name=table_name)
        except botocore.exceptions.ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            if error_code in ["EntityNotFoundException", "ResourceNotFoundException"]:
                raise RuntimeError(
                    f"Glue table '{table_name}' does not exist in database '{self.database}' "
                    f"(region: {self.region}). Cannot upload unverified dataset."
                )
            raise RuntimeError(
                f"AWS Glue error verifying table '{table_name}' in database '{self.database}' "
                f"(region: {self.region}): {error_code} - {error_msg}"
            )
        except Exception as e:
            raise RuntimeError(
                f"Failed to query AWS Glue for table '{table_name}' in database '{self.database}': {e}"
            )

        table_info = response.get("Table", {})
        sd = table_info.get("StorageDescriptor", {})
        actual_location = sd.get("Location")

        if not actual_location:
            raise RuntimeError(
                f"Glue table '{table_name}' in database '{self.database}' has no StorageDescriptor.Location defined."
            )

        norm_actual = actual_location.strip()
        if not norm_actual.endswith("/"):
            norm_actual += "/"

        if not norm_actual.startswith("s3://"):
            raise ValueError(
                f"Glue table '{table_name}' location '{actual_location}' is not a valid S3 URI (must start with 's3://')."
            )

        path_without_scheme = norm_actual[5:]
        parts = path_without_scheme.split("/", 1)
        actual_bucket = parts[0]
        actual_prefix = parts[1] if len(parts) > 1 else ""

        norm_expected_prefix = expected_prefix.strip().lstrip("/")
        if not norm_expected_prefix.endswith("/"):
            norm_expected_prefix += "/"

        expected_full_uri = f"s3://{expected_bucket.strip()}/{norm_expected_prefix}"

        if actual_bucket != expected_bucket.strip():
            raise ValueError(
                f"Glue table '{table_name}' bucket mismatch!\n"
                f"  Glue registered bucket : '{actual_bucket}'\n"
                f"  Target upload bucket   : '{expected_bucket}'\n"
                f"Upload stopped: Target bucket does not match Glue Data Catalog."
            )

        if actual_prefix != norm_expected_prefix:
            raise ValueError(
                f"Glue table '{table_name}' prefix mismatch!\n"
                f"  Glue registered location: '{norm_actual}'\n"
                f"  Expected location       : '{expected_full_uri}'\n"
                f"Upload stopped: Destination prefix does not match Glue Data Catalog."
            )

        return norm_expected_prefix


# ==============================================================================
# 6. LOCAL FILE WRITER & CSV SERIALIZER
# ==============================================================================

def write_dataset_csv(records: List[Dict[str, Any]], columns: List[str], file_path: Path) -> int:
    """Writes dataset records to a CSV file with an explicit column header."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if file_path.exists():
        raise FileExistsError(
            f"LOCAL FILE COLLISION REFUSED: Target file '{file_path}' already exists. "
            f"Generation aborted to prevent overwriting existing data."
        )
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(records)
    return len(records)


def read_dataset_csv(file_path: Path) -> List[Dict[str, Any]]:
    """Reads dataset records from an existing CSV file."""
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


# ==============================================================================
# 7. CLI COMMAND IMPLEMENTATION & WORKFLOW
# ==============================================================================

# Ensure standard output doesn't crash on Windows terminals with legacy encodings
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def run_local_mode(args) -> int:
    """Handles MODE A: Local Generation."""
    print("=" * 70)
    print("      MEDOPS SYNTHETIC HOSPITAL DATA GENERATOR: LOCAL MODE")
    print("=" * 70)

    datasets_to_generate = parse_requested_datasets(args.datasets)
    print(f"Target Datasets : {', '.join(datasets_to_generate)}")
    print(f"Batch Size      : {args.batch_size} records per dataset")
    print(f"Output Directory: {args.output_dir}")
    print(f"Execution Mode  : LOCAL ONLY (Zero AWS interaction)\n")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    ref = ReferenceUniverse()
    run_id = uuid.uuid4().hex[:8]
    generator = HospitalDataGenerator(ref, run_id=run_id, seed=args.seed)

    print("Generating synthetic records...")
    batches = generator.generate_batch(args.batch_size, datasets_to_generate)

    # Validate all generated datasets
    print("Validating generated records...")
    validation_failures = 0
    generated_files = []

    for name, records in batches.items():
        val_res = DatasetValidator.validate_dataset(name, records)
        if not val_res.is_valid:
            validation_failures += 1
            print(f"  [FAIL] [{name}] Validation FAILED with {len(val_res.errors)} errors:")
            for err in val_res.errors[:5]:
                print(f"         - {err}")
        else:
            print(f"  [PASS] [{name}] Validation PASSED ({len(records)} records)")

            # Save file
            filename = f"synthetic_{name}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{run_id}.csv"
            out_file = output_dir / filename
            write_dataset_csv(records, SUPPORTED_DATASETS[name]["columns"], out_file)
            generated_files.append((name, len(records), out_file))

    print("\n" + "=" * 70)
    print("                      GENERATION SUMMARY")
    print("=" * 70)
    for name, count, path in generated_files:
        print(f"  * {name:<24}: {count:>5} records -> {path}")

    if validation_failures > 0:
        print(f"\n[WARNING] {validation_failures} dataset(s) failed validation. Please inspect errors.")
        return 1

    print("\n[SUCCESS] Local data generation completed successfully. No AWS calls were made.")
    return 0


def run_validate_mode(args) -> int:
    """Handles MODE: Validate existing generated files."""
    print("=" * 70)
    print("     MEDOPS SYNTHETIC HOSPITAL DATA GENERATOR: VALIDATE MODE")
    print("=" * 70)

    input_dir = Path(args.input_dir or args.output_dir)
    if not input_dir.exists():
        print(f"[ERROR] Directory not found: {input_dir}")
        return 1

    csv_files = list(input_dir.glob("synthetic_*.csv"))
    if not csv_files:
        print(f"[INFO] No 'synthetic_*.csv' files found in {input_dir}")
        return 0

    print(f"Found {len(csv_files)} synthetic file(s) in {input_dir}\n")
    failed_count = 0

    for file_path in csv_files:
        # Detect dataset name from filename: synthetic_{dataset}_{timestamp}_{run_id}.csv
        parts = file_path.stem.split("_")
        if len(parts) >= 2 and parts[0] == "synthetic":
            # Match against supported datasets
            matched_dataset = None
            for d in SUPPORTED_DATASETS:
                if file_path.stem.startswith(f"synthetic_{d}_"):
                    matched_dataset = d
                    break

            if not matched_dataset:
                print(f"[WARN] Skipping unrecognized file: {file_path.name}")
                continue

            records = read_dataset_csv(file_path)
            res = DatasetValidator.validate_dataset(matched_dataset, records)
            if res.is_valid:
                print(f"  [PASS] [{matched_dataset}] {file_path.name}: {res.total_records} records VALID")
            else:
                failed_count += 1
                print(f"  [FAIL] [{matched_dataset}] {file_path.name}: FAILED with {len(res.errors)} errors:")
                for err in res.errors[:5]:
                    print(f"         - {err}")

    print("\n" + "=" * 70)
    if failed_count == 0:
        print("[SUCCESS] All inspected files passed schema and integrity validation.")
        return 0
    else:
        print(f"[FAILED] {failed_count} file(s) failed validation.")
        return 1


def run_upload_mode(args) -> int:
    """Handles MODE B: Explicit S3 Upload with Glue verification, confirmation, and collision checks."""
    print("=" * 70)
    print("     MEDOPS SYNTHETIC HOSPITAL DATA GENERATOR: EXPLICIT S3 UPLOAD")
    print("=" * 70)

    bucket = args.bucket or os.getenv("AWS_S3_BUCKET", "medical-operations-bharath-2026")

    # S3 storage region resolution: --s3-region takes highest precedence, then --region, then AWS_S3_REGION env, defaulting to ap-south-1
    s3_region = args.s3_region or args.region or os.getenv("AWS_S3_REGION", "ap-south-1")

    # Glue Data Catalog & Athena analytics region resolution: --glue-region takes precedence, then AWS_DATA_REGION env, defaulting to ap-south-2
    glue_region = args.glue_region or os.getenv("AWS_DATA_REGION", "ap-south-2")
    glue_db = args.glue_database or os.getenv("AWS_GLUE_DATABASE", "medical_operations_db")

    print(f"Target S3 Bucket    : {bucket}")
    print(f"Target S3 Region    : {s3_region} (Amazon S3 Data Lake)")
    print(f"Glue Catalog Region : {glue_region} (AWS Glue & Amazon Athena)")
    print(f"Glue Database       : {glue_db}\n")

    uploader = SafeS3Uploader(bucket, s3_region)
    verifier = GlueTableVerifier(glue_db, glue_region)

    # 1. Check credentials & bucket connectivity in S3 region (ap-south-1)
    print("Checking AWS S3 connectivity...")
    try:
        uploader.verify_connection()
        print(f"[OK] S3 connection to bucket '{bucket}' in '{s3_region}' verified successfully.\n")
    except Exception as e:
        print(f"\n[ERROR] AWS S3 authentication or connectivity failed:")
        print(f"  {e}")
        print("\nTo resolve this, please ensure:")
        print("  1. Active AWS CLI credentials ('aws configure' or 'aws sso login').")
        print(f"  2. Valid IAM permissions for s3:HeadBucket, s3:HeadObject, and s3:PutObject on '{bucket}' in '{s3_region}'.")
        print("  3. Correct S3 bucket name and region are specified.\n")
        return 1

    datasets_to_generate = parse_requested_datasets(args.datasets)

    # 2. Verify Glue Table Locations in Analytics region (ap-south-2) before staging or generating data
    print(f"Verifying AWS Glue table locations in database '{glue_db}' ({glue_region})...")
    verified_prefixes: Dict[str, str] = {}
    for name in datasets_to_generate:
        expected_prefix = SUPPORTED_DATASETS[name]["s3_prefix"]
        try:
            verified_prefix = verifier.verify_table_location(name, bucket, expected_prefix)
            verified_prefixes[name] = verified_prefix
            print(f"  [PASS] Glue table '{name}': verified location s3://{bucket}/{verified_prefix}")
        except Exception as e:
            print(f"  [FAIL] Glue verification failed for table '{name}':")
            print(f"         {e}")
            print(f"\n[ABORT] Upload stopped. Destination location could not be verified against AWS Glue Data Catalog.")
            print("        Per safety requirements, unverified uploads are strictly prohibited.")
            return 1

    print("\nAll target table locations verified against AWS Glue Data Catalog.\n")

    staging_dir = Path(args.output_dir) / "staging"
    staging_dir.mkdir(parents=True, exist_ok=True)

    ref = ReferenceUniverse()
    run_id = uuid.uuid4().hex[:8]
    generator = HospitalDataGenerator(ref, run_id=run_id, seed=args.seed)

    print(f"Generating {args.batch_size} records per dataset...")
    batches = generator.generate_batch(args.batch_size, datasets_to_generate)

    # 3. Validate before presenting upload plan
    print("Validating generated records...")
    prepared_uploads: List[Tuple[str, int, Path, str]] = []
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    for name, records in batches.items():
        val_res = DatasetValidator.validate_dataset(name, records)
        if not val_res.is_valid:
            print(f"[FAIL] [{name}] Validation failed. Upload cannot proceed.")
            for err in val_res.errors[:5]:
                print(f"       - {err}")
            return 1

        filename = f"synthetic_{name}_{timestamp}_{run_id}.csv"
        local_path = staging_dir / filename
        write_dataset_csv(records, SUPPORTED_DATASETS[name]["columns"], local_path)

        s3_key = f"{verified_prefixes[name]}{filename}"
        prepared_uploads.append((name, len(records), local_path, s3_key))

    # 4. Present Explicit Multi-Region Upload Plan
    print("\n" + "=" * 70)
    print("                    S3 UPLOAD CONFIRMATION PLAN")
    print("=" * 70)
    print(f"Target S3 Bucket    : {bucket}")
    print(f"Target S3 Region    : {s3_region} (Storage)")
    print(f"Glue Catalog Region : {glue_region} (Analytics)")
    print(f"Glue Database       : {glue_db}")
    print("Datasets to Upload (Verified against Glue Catalog):")
    for name, count, local_path, s3_key in prepared_uploads:
        print(f"  * {name:<22}: {count:>5} records")
        print(f"      Local File: {local_path}")
        print(f"      S3 Destination: s3://{bucket}/{s3_key}")

    print("\nSAFETY NOTICE:")
    print("  - Files will be uploaded to verified table prefixes scanned by Amazon Athena.")
    print("  - Existing objects in S3 will NEVER be overwritten (checked via head_object and atomic IfNoneMatch='*').")
    print("  - No Athena query or Glue crawler will be executed automatically.")
    print("=" * 70)

    # 5. Prompt for confirmation
    if not args.yes:
        try:
            confirm = input("\nType 'yes' or 'y' to confirm upload to AWS S3: ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            confirm = "no"

        if confirm not in ["yes", "y"]:
            print("\n[CANCELED] S3 upload canceled by developer. No files were uploaded to AWS.")
            return 0
    else:
        print("\n[INFO] Confirmation bypassed via explicit --yes flag.")

    # 6. Execute Uploads with collision protection
    print("\nExecuting S3 uploads...")
    upload_results = []
    failures = 0

    for name, count, local_path, s3_key in prepared_uploads:
        try:
            res = uploader.upload_file(local_path, s3_key)
            upload_results.append(res)
            print(f"  [PASS] Uploaded: s3://{bucket}/{s3_key} ({res['size_bytes']} bytes, ETag: {res['etag']})")
        except Exception as e:
            failures += 1
            print(f"  [FAIL] FAILED to upload s3://{bucket}/{s3_key}: {e}")

    print("\n" + "=" * 70)
    print("                      UPLOAD SUMMARY")
    print("=" * 70)
    print(f"Total datasets planned: {len(prepared_uploads)}")
    print(f"Successful uploads    : {len(upload_results)}")
    print(f"Failed uploads        : {failures}")

    if failures > 0:
        print(f"\n[WARNING] {failures} file(s) failed during upload.")
        return 1

    print("\n[SUCCESS] S3 upload completed successfully. All new files are live in S3.")
    return 0


def parse_requested_datasets(datasets_arg: str) -> List[str]:
    """Parses and validates requested dataset names."""
    if not datasets_arg or datasets_arg.strip().lower() in ["all", "*"]:
        return list(SUPPORTED_DATASETS.keys())

    requested = [d.strip().lower() for d in datasets_arg.split(",") if d.strip()]
    valid = []
    for d in requested:
        if d in SUPPORTED_DATASETS:
            valid.append(d)
        elif d in EXCLUDED_DATASETS_RATIONALE:
            print(f"\n[NOTE] Skipping dataset '{d}':\n  {EXCLUDED_DATASETS_RATIONALE[d]}\n")
        else:
            print(f"[WARNING] Skipping unknown dataset '{d}'. Supported: {list(SUPPORTED_DATASETS.keys())}")

    if not valid:
        raise ValueError(f"No valid datasets specified in '{datasets_arg}'. Supported: {list(SUPPORTED_DATASETS.keys())}")
    return valid


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="MedOps Intelligence: Safe Standalone Synthetic Hospital Data Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  1. Generate 100 records locally for all datasets:
       python scripts/generate_hospital_data.py --mode local --batch-size 100

  2. Generate 50 records for admissions and billing only:
       python scripts/generate_hospital_data.py --mode local --batch-size 50 --datasets admissions,billing

  3. Validate all generated CSV files in output directory:
       python scripts/generate_hospital_data.py --mode validate --input-dir generated_data

  4. Upload 100 validated records per dataset to Amazon S3 (prompts for confirmation):
       python scripts/generate_hospital_data.py --mode upload --batch-size 100
        """,
    )
    parser.add_argument(
        "--mode",
        choices=["local", "upload", "validate"],
        default="local",
        help="Execution mode: 'local' (offline generation), 'validate' (schema check), 'upload' (explicit S3 upload).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Number of synthetic records to generate per dataset ({MIN_BATCH_SIZE} to {MAX_BATCH_SIZE}, default: {DEFAULT_BATCH_SIZE}).",
    )
    parser.add_argument(
        "--datasets",
        type=str,
        default="all",
        help="Comma-separated list of datasets to generate (e.g. admissions,billing) or 'all' (default).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="generated_data",
        help="Local directory to store generated CSV files (default: 'generated_data').",
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        default=None,
        help="Directory containing CSV files to validate in 'validate' mode (defaults to --output-dir).",
    )
    parser.add_argument(
        "--bucket",
        type=str,
        default=None,
        help="Target Amazon S3 bucket name (defaults to AWS_S3_BUCKET env or 'medical-operations-bharath-2026').",
    )
    parser.add_argument(
        "--s3-region",
        type=str,
        default=None,
        help="Target Amazon S3 bucket region (defaults to AWS_S3_REGION env or 'ap-south-1').",
    )
    parser.add_argument(
        "--glue-region",
        type=str,
        default=None,
        help="AWS Glue Data Catalog & Amazon Athena region (defaults to AWS_DATA_REGION env or 'ap-south-2').",
    )
    parser.add_argument(
        "--glue-database",
        type=str,
        default=None,
        help="AWS Glue database name (defaults to AWS_GLUE_DATABASE env or 'medical_operations_db').",
    )
    parser.add_argument(
        "--region",
        type=str,
        default=None,
        help="Deprecated alias for --s3-region. If specified, sets the Amazon S3 bucket region.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible generation (optional).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Auto-confirm the S3 upload confirmation prompt (use in scripted/automated testing).",
    )
    return parser


def main():
    parser = build_arg_parser()
    args = parser.parse_args()

    # Validate batch size upfront
    if args.mode in ["local", "upload"]:
        if not (MIN_BATCH_SIZE <= args.batch_size <= MAX_BATCH_SIZE):
            print(f"[ERROR] Invalid --batch-size: {args.batch_size}. Must be between {MIN_BATCH_SIZE} and {MAX_BATCH_SIZE}.")
            sys.exit(1)

    try:
        if args.mode == "local":
            sys.exit(run_local_mode(args))
        elif args.mode == "validate":
            sys.exit(run_validate_mode(args))
        elif args.mode == "upload":
            sys.exit(run_upload_mode(args))
        else:
            parser.print_help()
            sys.exit(1)
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
