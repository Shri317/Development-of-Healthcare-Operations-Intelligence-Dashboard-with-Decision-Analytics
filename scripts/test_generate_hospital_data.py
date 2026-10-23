#!/usr/bin/env python3
"""
Unit and Integration Tests for MedOps Synthetic Hospital Data Generator
========================================================================

Verifies:
  1. Multi-region AWS configuration:
     - Amazon S3 bucket storage region defaults to ap-south-1
     - AWS Glue Data Catalog & Amazon Athena analytics region defaults to ap-south-2
     - Explicit CLI region arguments (--s3-region, --glue-region, --region alias)
  2. AWS Glue table location verification before upload:
     - Verifies StorageDescriptor.Location in medical_operations_db (ap-south-2)
     - Stops safely if a table is missing
     - Stops safely if table S3 bucket or prefix differs from target
     - Stops safely if Glue verification encounters an API/network error (no silent fallback)
  3. Batch-size bounds and validation (1 to 10,000)
  4. Schema column order, types, and constraints across all supported datasets
  5. Synthetic identifier formatting and isolation (SYN-* markers)
  6. Duplicate prevention (within batch and across execution runs)
  7. Relational consistency (appointments -> billing -> claims)
  8. Local-only mode (file output, no AWS dependencies or calls)
  9. Validate mode (detecting valid files and flagging corrupted rows)
  10. Upload confirmation handling (cancellation on 'no', proceeding on 'yes')
  11. Existing S3 object collision protection (refusing overwrite via head_object)
  12. Error handling for missing AWS credentials

IMPORTANT: These tests mock all AWS calls and never make network calls
to real AWS services or perform any cloud writes.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add scripts directory to sys.path
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from generate_hospital_data import (
    SUPPORTED_DATASETS,
    MIN_BATCH_SIZE,
    MAX_BATCH_SIZE,
    ReferenceUniverse,
    HospitalDataGenerator,
    DatasetValidator,
    SafeS3Uploader,
    GlueTableVerifier,
    write_dataset_csv,
    read_dataset_csv,
    run_local_mode,
    run_validate_mode,
    run_upload_mode,
    build_arg_parser,
    parse_requested_datasets,
)


class TestRegionConfiguration(unittest.TestCase):
    """Verifies multi-region AWS separation between S3 (ap-south-1) and Glue (ap-south-2)."""

    def test_default_region_resolution(self):
        parser = build_arg_parser()
        args = parser.parse_args(["--mode", "local"])

        # When no env vars or CLI args are passed:
        with patch.dict(os.environ, {}, clear=True):
            s3_reg = args.s3_region or args.region or os.getenv("AWS_S3_REGION", "ap-south-1")
            glue_reg = args.glue_region or os.getenv("AWS_DATA_REGION", "ap-south-2")
            glue_db = args.glue_database or os.getenv("AWS_GLUE_DATABASE", "medical_operations_db")

            self.assertEqual(s3_reg, "ap-south-1")
            self.assertEqual(glue_reg, "ap-south-2")
            self.assertEqual(glue_db, "medical_operations_db")

    def test_explicit_region_arguments(self):
        parser = build_arg_parser()
        args = parser.parse_args([
            "--mode", "upload",
            "--s3-region", "us-west-2",
            "--glue-region", "eu-central-1",
            "--glue-database", "custom_db",
        ])

        s3_reg = args.s3_region or args.region or os.getenv("AWS_S3_REGION", "ap-south-1")
        glue_reg = args.glue_region or os.getenv("AWS_DATA_REGION", "ap-south-2")
        glue_db = args.glue_database or os.getenv("AWS_GLUE_DATABASE", "medical_operations_db")

        self.assertEqual(s3_reg, "us-west-2")
        self.assertEqual(glue_reg, "eu-central-1")
        self.assertEqual(glue_db, "custom_db")

    def test_deprecated_region_alias_configures_s3(self):
        parser = build_arg_parser()
        args = parser.parse_args([
            "--mode", "upload",
            "--region", "ap-southeast-1",
        ])

        s3_reg = args.s3_region or args.region or os.getenv("AWS_S3_REGION", "ap-south-1")
        glue_reg = args.glue_region or os.getenv("AWS_DATA_REGION", "ap-south-2")

        # --region sets s3_region, while glue_region remains ap-south-2
        self.assertEqual(s3_reg, "ap-southeast-1")
        self.assertEqual(glue_reg, "ap-south-2")


class TestGlueTableLocationVerification(unittest.TestCase):
    """Verifies that upload mode inspects AWS Glue table locations and prevents invalid writes."""

    def test_glue_verification_success_matching_location(self):
        mock_glue = MagicMock()
        mock_glue.get_table.return_value = {
            "Table": {
                "StorageDescriptor": {
                    "Location": "s3://medical-operations-bharath-2026/raw/admissions/"
                }
            }
        }

        verifier = GlueTableVerifier(
            database="medical_operations_db",
            region="ap-south-2",
            glue_client=mock_glue,
        )

        verified = verifier.verify_table_location("admissions", "medical-operations-bharath-2026", "raw/admissions/")
        self.assertEqual(verified, "raw/admissions/")
        mock_glue.get_table.assert_called_once_with(DatabaseName="medical_operations_db", Name="admissions")

    def test_glue_verification_bucket_mismatch_raises(self):
        mock_glue = MagicMock()
        mock_glue.get_table.return_value = {
            "Table": {
                "StorageDescriptor": {
                    "Location": "s3://different-bucket/raw/admissions/"
                }
            }
        }

        verifier = GlueTableVerifier(
            database="medical_operations_db",
            region="ap-south-2",
            glue_client=mock_glue,
        )

        with self.assertRaises(ValueError) as ctx:
            verifier.verify_table_location("admissions", "medical-operations-bharath-2026", "raw/admissions/")
        self.assertIn("bucket mismatch", str(ctx.exception).lower())

    def test_glue_verification_prefix_mismatch_raises(self):
        mock_glue = MagicMock()
        mock_glue.get_table.return_value = {
            "Table": {
                "StorageDescriptor": {
                    "Location": "s3://medical-operations-bharath-2026/wrong_prefix/admissions/"
                }
            }
        }

        verifier = GlueTableVerifier(
            database="medical_operations_db",
            region="ap-south-2",
            glue_client=mock_glue,
        )

        with self.assertRaises(ValueError) as ctx:
            verifier.verify_table_location("admissions", "medical-operations-bharath-2026", "raw/admissions/")
        self.assertIn("prefix mismatch", str(ctx.exception).lower())

    def test_glue_missing_table_raises_runtime_error(self):
        import botocore.exceptions
        mock_glue = MagicMock()
        mock_glue.get_table.side_effect = botocore.exceptions.ClientError(
            {"Error": {"Code": "EntityNotFoundException", "Message": "Table not found"}},
            "GetTable",
        )

        verifier = GlueTableVerifier(
            database="medical_operations_db",
            region="ap-south-2",
            glue_client=mock_glue,
        )

        with self.assertRaises(RuntimeError) as ctx:
            verifier.verify_table_location("nonexistent_table", "medical-operations-bharath-2026", "raw/nonexistent/")
        self.assertIn("does not exist", str(ctx.exception).lower())

    def test_glue_api_error_prevents_upload_without_fallback(self):
        import botocore.exceptions
        mock_glue = MagicMock()
        mock_glue.get_table.side_effect = botocore.exceptions.ClientError(
            {"Error": {"Code": "AccessDeniedException", "Message": "Not authorized"}},
            "GetTable",
        )

        verifier = GlueTableVerifier(
            database="medical_operations_db",
            region="ap-south-2",
            glue_client=mock_glue,
        )

        with self.assertRaises(RuntimeError) as ctx:
            verifier.verify_table_location("admissions", "medical-operations-bharath-2026", "raw/admissions/")
        self.assertIn("accessdeniedexception", str(ctx.exception).lower())


class TestBatchSizeValidation(unittest.TestCase):
    """Verifies batch-size parameter enforcement."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="test0001", seed=42)

    def test_batch_size_below_minimum_raises(self):
        with self.assertRaises(ValueError):
            self.gen.generate_batch(0, ["admissions"])

        with self.assertRaises(ValueError):
            self.gen.generate_batch(-10, ["admissions"])

    def test_batch_size_above_maximum_raises(self):
        with self.assertRaises(ValueError):
            self.gen.generate_batch(MAX_BATCH_SIZE + 1, ["admissions"])

    def test_valid_batch_sizes(self):
        res_min = self.gen.generate_batch(MIN_BATCH_SIZE, ["admissions"])
        self.assertEqual(len(res_min["admissions"]), MIN_BATCH_SIZE)

        res_standard = self.gen.generate_batch(10, ["admissions"])
        self.assertEqual(len(res_standard["admissions"]), 10)


class TestSchemaValidation(unittest.TestCase):
    """Verifies that generated datasets strictly adhere to Glue/Athena schemas."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="test0002", seed=123)
        self.batch = self.gen.generate_batch(20, list(SUPPORTED_DATASETS.keys()))

    def test_all_supported_datasets_present(self):
        for name in SUPPORTED_DATASETS:
            self.assertIn(name, self.batch)
            self.assertGreater(len(self.batch[name]), 0)

    def test_column_names_and_order_match_schema(self):
        for name, records in self.batch.items():
            expected = SUPPORTED_DATASETS[name]["columns"]
            for idx, rec in enumerate(records):
                self.assertEqual(
                    list(rec.keys()),
                    expected,
                    f"Column mismatch in dataset '{name}' at row {idx}",
                )

    def test_validator_passes_all_generated_records(self):
        for name, records in self.batch.items():
            res = DatasetValidator.validate_dataset(name, records)
            self.assertTrue(
                res.is_valid,
                f"Dataset '{name}' failed validation: {res.errors}",
            )


class TestSyntheticIdentifiers(unittest.TestCase):
    """Verifies synthetic prefixing and distinct markers."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="test0003", seed=999)
        self.batch = self.gen.generate_batch(15, list(SUPPORTED_DATASETS.keys()))

    def test_identifier_prefixes(self):
        expected_prefixes = {
            "admissions": "SYN-ADM",
            "appointments": "SYN-APP",
            "billing": "SYN-BIL",
            "claims": "SYN-CLM",
            "emergency_visits": "SYN-EV",
            "inventory_transactions": "SYN-TXN",
        }
        for name, prefix in expected_prefixes.items():
            id_col = SUPPORTED_DATASETS[name]["id_column"]
            for rec in self.batch[name]:
                val = rec[id_col]
                self.assertTrue(
                    val.startswith(prefix),
                    f"Record ID '{val}' in '{name}' does not start with '{prefix}'",
                )

    def test_synthetic_patient_identifiers(self):
        for name in ["admissions", "appointments", "emergency_visits"]:
            for rec in self.batch[name]:
                self.assertTrue(rec["patient_id"].startswith("SYN-PAT"))


class TestDuplicatePrevention(unittest.TestCase):
    """Verifies uniqueness of generated primary keys within batches and across runs."""

    def setUp(self):
        self.ref = ReferenceUniverse()

    def test_uniqueness_within_single_batch(self):
        gen = HospitalDataGenerator(self.ref, run_id="run_alpha", seed=10)
        batch = gen.generate_batch(50, list(SUPPORTED_DATASETS.keys()))

        for name, records in batch.items():
            id_col = SUPPORTED_DATASETS[name]["id_column"]
            ids = [r[id_col] for r in records]
            self.assertEqual(
                len(ids),
                len(set(ids)),
                f"Duplicate IDs detected within dataset '{name}'",
            )

    def test_uniqueness_across_different_runs(self):
        gen1 = HospitalDataGenerator(self.ref, run_id="run_0001", seed=10)
        gen2 = HospitalDataGenerator(self.ref, run_id="run_0002", seed=10)

        batch1 = gen1.generate_batch(20, ["admissions"])
        batch2 = gen2.generate_batch(20, ["admissions"])

        ids1 = set(r["admission_id"] for r in batch1["admissions"])
        ids2 = set(r["admission_id"] for r in batch2["admissions"])

        self.assertEqual(len(ids1.intersection(ids2)), 0)


class TestRelationalIntegrity(unittest.TestCase):
    """Verifies that related records maintain strict foreign key and financial consistency."""

    def setUp(self):
        self.ref = ReferenceUniverse()
        self.gen = HospitalDataGenerator(self.ref, run_id="run_rel", seed=555)
        self.batch = self.gen.generate_batch(30, ["appointments", "billing", "claims", "admissions", "emergency_visits"])

    def test_billing_references_valid_appointment(self):
        app_ids = {a["appointment_id"] for a in self.batch["appointments"]}
        for bill in self.batch["billing"]:
            self.assertIn(bill["appointment_id"], app_ids)

    def test_billing_financial_equation(self):
        for bill in self.batch["billing"]:
            gross = bill["gross_amount"]
            disc = bill["discount_amount"]
            net = bill["net_amount"]
            ins = bill["insurance_amount"]
            pat = bill["patient_amount"]
            paid = bill["paid_amount"]
            out = bill["outstanding_amount"]

            self.assertAlmostEqual(gross - disc, net, places=2)
            self.assertAlmostEqual(ins + pat, net, places=2)
            self.assertAlmostEqual(paid + out, net, places=2)

    def test_claims_reference_insured_bills(self):
        bills_map = {b["bill_id"]: b for b in self.batch["billing"]}
        for claim in self.batch["claims"]:
            self.assertIn(claim["bill_id"], bills_map)
            matching_bill = bills_map[claim["bill_id"]]
            self.assertAlmostEqual(claim["claimed_amount"], matching_bill["insurance_amount"], places=2)

    def test_admission_dates_chronology(self):
        for adm in self.batch["admissions"]:
            self.assertGreaterEqual(adm["discharge_date"], adm["admission_date"])

    def test_emergency_visit_datetimes_chronology(self):
        for ev in self.batch["emergency_visits"]:
            self.assertGreaterEqual(ev["discharge_datetime"], ev["arrival_datetime"])


class TestLocalOnlyMode(unittest.TestCase):
    """Verifies execution of local mode without network or cloud calls."""

    def test_local_mode_writes_files_and_preserves_datasets(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            args = parser.parse_args([
                "--mode", "local",
                "--batch-size", "5",
                "--output-dir", tmp_dir,
                "--datasets", "admissions,billing",
            ])

            exit_code = run_local_mode(args)
            self.assertEqual(exit_code, 0)

            created_files = list(Path(tmp_dir).glob("synthetic_*.csv"))
            self.assertEqual(len(created_files), 2)

            for f in created_files:
                rows = read_dataset_csv(f)
                self.assertEqual(len(rows), 5)

    def test_local_mode_makes_no_aws_calls(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            args = parser.parse_args([
                "--mode", "local",
                "--batch-size", "5",
                "--output-dir", tmp_dir,
                "--datasets", "admissions",
            ])
            with patch("boto3.Session") as mock_session, \
                 patch("boto3.client") as mock_client:
                exit_code = run_local_mode(args)
                self.assertEqual(exit_code, 0)
                mock_session.assert_not_called()
                mock_client.assert_not_called()


class TestValidateMode(unittest.TestCase):
    """Verifies validate mode against clean and corrupted files."""

    def test_validate_clean_files(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            gen_args = parser.parse_args([
                "--mode", "local",
                "--batch-size", "5",
                "--output-dir", tmp_dir,
                "--datasets", "admissions",
            ])
            run_local_mode(gen_args)

            val_args = parser.parse_args([
                "--mode", "validate",
                "--input-dir", tmp_dir,
            ])
            exit_code = run_validate_mode(val_args)
            self.assertEqual(exit_code, 0)

    def test_validator_catches_corrupted_rows(self):
        corrupted_record = {
            "admission_id": "SYN-ADM-001",
            "patient_id": "SYN-PAT-001",
            "facility_id": "FAC001",
            "department_id": "DEP001",
            "bed_id": "BED001",
            "admission_date": "2026-05-10",
            "discharge_date": "2026-05-01",  # Chronological violation
            "admission_type": "InvalidType",  # Invalid categorical
            "length_of_stay_days": "not_a_float",  # Invalid type
            "discharge_status": "Discharged",
        }
        res = DatasetValidator.validate_dataset("admissions", [corrupted_record])
        self.assertFalse(res.is_valid)
        self.assertGreater(len(res.errors), 0)

    def test_write_dataset_csv_refuses_to_overwrite_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            file_path = Path(tmp_dir) / "test.csv"
            # Write initial file
            write_dataset_csv([{"col": "val1"}], ["col"], file_path)
            self.assertTrue(file_path.exists())

            # Attempting to overwrite must raise FileExistsError
            with self.assertRaises(FileExistsError) as ctx:
                write_dataset_csv([{"col": "val2"}], ["col"], file_path)
            self.assertIn("LOCAL FILE COLLISION REFUSED", str(ctx.exception))


class TestUploadSafetyAndConfirmation(unittest.TestCase):
    """Verifies confirmation prompts, collision detection, and upload mocking with Glue verification."""

    @patch("generate_hospital_data.SafeS3Uploader.verify_connection", return_value=True)
    @patch("generate_hospital_data.GlueTableVerifier.verify_table_location", return_value="raw/admissions/")
    def test_upload_mode_cancels_when_user_declines(self, mock_glue, mock_verify):
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            args = parser.parse_args([
                "--mode", "upload",
                "--batch-size", "3",
                "--output-dir", tmp_dir,
                "--datasets", "admissions",
            ])

            with patch("builtins.input", return_value="no"):
                with patch("generate_hospital_data.SafeS3Uploader.upload_file") as mock_upload:
                    exit_code = run_upload_mode(args)
                    self.assertEqual(exit_code, 0)
                    mock_upload.assert_not_called()
                    mock_glue.assert_called_once()

    @patch("generate_hospital_data.SafeS3Uploader.verify_connection", return_value=True)
    @patch("generate_hospital_data.GlueTableVerifier.verify_table_location", return_value="raw/admissions/")
    @patch("generate_hospital_data.SafeS3Uploader.upload_file")
    def test_upload_mode_proceeds_with_yes_flag(self, mock_upload, mock_glue, mock_verify):
        mock_upload.return_value = {
            "bucket": "medical-operations-bharath-2026",
            "key": "raw/admissions/test.csv",
            "size_bytes": 100,
            "etag": "fake-etag",
            "status": "SUCCESS",
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            args = parser.parse_args([
                "--mode", "upload",
                "--batch-size", "3",
                "--output-dir", tmp_dir,
                "--datasets", "admissions",
                "--yes",
            ])

            exit_code = run_upload_mode(args)
            self.assertEqual(exit_code, 0)
            mock_upload.assert_called_once()
            mock_glue.assert_called_once()

    @patch("generate_hospital_data.SafeS3Uploader.verify_connection", return_value=True)
    @patch("generate_hospital_data.GlueTableVerifier.verify_table_location")
    def test_upload_mode_aborts_on_glue_verification_failure(self, mock_glue, mock_verify):
        mock_glue.side_effect = RuntimeError("Glue verification failed: table not found")
        with tempfile.TemporaryDirectory() as tmp_dir:
            parser = build_arg_parser()
            args = parser.parse_args([
                "--mode", "upload",
                "--batch-size", "3",
                "--output-dir", tmp_dir,
                "--datasets", "admissions",
                "--yes",
            ])

            with patch("generate_hospital_data.SafeS3Uploader.upload_file") as mock_upload:
                exit_code = run_upload_mode(args)
                self.assertEqual(exit_code, 1)
                mock_upload.assert_not_called()

    def test_uploader_prevents_overwriting_existing_s3_object(self):
        """Verifies preflight head_object check refuses upload before calling put_object."""
        mock_s3 = MagicMock()
        uploader = SafeS3Uploader("medical-operations-bharath-2026", "ap-south-1", s3_client=mock_s3)

        mock_s3.head_object.return_value = {"ContentLength": 500}

        with tempfile.NamedTemporaryFile(suffix=".csv") as tmp:
            with self.assertRaises(FileExistsError) as ctx:
                uploader.upload_file(Path(tmp.name), "raw/admissions/existing.csv")
            self.assertIn("DESTINATION COLLISION REFUSED", str(ctx.exception))

        mock_s3.put_object.assert_not_called()

    def test_conditional_write_if_none_match_passed_to_put_object(self):
        """Verifies that atomic IfNoneMatch='*' is passed to put_object when supported."""
        mock_s3 = MagicMock()
        import botocore.exceptions
        mock_s3.head_object.side_effect = botocore.exceptions.ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
        )
        mock_s3.put_object.return_value = {"ETag": "\"test-etag-123\""}

        uploader = SafeS3Uploader("medical-operations-bharath-2026", "ap-south-1", s3_client=mock_s3)

        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
            tmp.write(b"header1,header2\nval1,val2\n")
            tmp_path = Path(tmp.name)

        try:
            res = uploader.upload_file(tmp_path, "raw/admissions/test.csv")
            self.assertEqual(res["status"], "SUCCESS")
            mock_s3.put_object.assert_called_once()
            call_kwargs = mock_s3.put_object.call_args[1]
            self.assertEqual(call_kwargs.get("Bucket"), "medical-operations-bharath-2026")
            self.assertEqual(call_kwargs.get("Key"), "raw/admissions/test.csv")
            self.assertEqual(call_kwargs.get("IfNoneMatch"), "*")
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    def test_conditional_write_conflict_handled_safely_without_retry(self):
        """
        Verifies that when a conditional write conflict occurs (S3 returns PreconditionFailed / 412),
        the upload is refused safely, a FileExistsError is raised, and NO unconditional retry is attempted.
        """
        mock_s3 = MagicMock()
        import botocore.exceptions
        # Preflight passes (object didn't exist when checked)
        mock_s3.head_object.side_effect = botocore.exceptions.ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
        )
        # S3 put_object fails with PreconditionFailed (another writer created object before put)
        mock_s3.put_object.side_effect = botocore.exceptions.ClientError(
            {
                "Error": {"Code": "PreconditionFailed", "Message": "At least one precondition failed."},
                "ResponseMetadata": {"HTTPStatusCode": 412},
            },
            "PutObject",
        )

        uploader = SafeS3Uploader("medical-operations-bharath-2026", "ap-south-1", s3_client=mock_s3)

        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
            tmp.write(b"header1,header2\nval1,val2\n")
            tmp_path = Path(tmp.name)

        try:
            with self.assertRaises(FileExistsError) as ctx:
                uploader.upload_file(tmp_path, "raw/admissions/test.csv")

            error_msg = str(ctx.exception)
            self.assertIn("CONDITIONAL WRITE COLLISION REFUSED", error_msg)
            self.assertIn("IfNoneMatch='*'", error_msg)

            # Crucial requirement: Exactly 1 call, NEVER retried unconditionally
            self.assertEqual(mock_s3.put_object.call_count, 1)
            self.assertEqual(mock_s3.put_object.call_args[1].get("IfNoneMatch"), "*")
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    def test_conditional_write_disabled_or_unsupported_omits_parameter(self):
        """Verifies that if conditional writes are disabled/unsupported, IfNoneMatch is omitted."""
        mock_s3 = MagicMock()
        import botocore.exceptions
        mock_s3.head_object.side_effect = botocore.exceptions.ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
        )
        mock_s3.put_object.return_value = {"ETag": "\"test-etag-456\""}

        uploader = SafeS3Uploader(
            "medical-operations-bharath-2026",
            "ap-south-1",
            s3_client=mock_s3,
            enable_conditional_write=False,
        )

        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
            tmp.write(b"header1,header2\nval1,val2\n")
            tmp_path = Path(tmp.name)

        try:
            res = uploader.upload_file(tmp_path, "raw/admissions/test.csv")
            self.assertEqual(res["status"], "SUCCESS")
            mock_s3.put_object.assert_called_once()
            call_kwargs = mock_s3.put_object.call_args[1]
            self.assertNotIn("IfNoneMatch", call_kwargs)
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    def test_missing_credentials_raises_clean_error(self):
        uploader = SafeS3Uploader("medical-operations-bharath-2026", "ap-south-1")
        with patch("boto3.Session.get_credentials", return_value=None):
            with self.assertRaises(RuntimeError) as ctx:
                uploader._get_client()
            self.assertIn("credentials not found", str(ctx.exception).lower())


class TestDatasetExclusionRationale(unittest.TestCase):
    """Verifies that static snapshot tables like 'inventory' are intentionally skipped with explanation."""

    def test_inventory_dataset_excluded_with_message(self):
        with patch("builtins.print") as mock_print:
            with self.assertRaises(ValueError):
                parse_requested_datasets("inventory")

            printed_text = " ".join(call.args[0] for call in mock_print.call_args_list if call.args)
            self.assertIn("inventory", printed_text.lower())
            self.assertIn("snapshot", printed_text.lower())


if __name__ == "__main__":
    unittest.main()
