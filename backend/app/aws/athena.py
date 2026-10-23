import time
import logging
from typing import Dict, Any, List, Optional
from app.aws.session import get_athena_client
from app.config import settings

logger = logging.getLogger(__name__)

def execute_athena_query(sql_query: str, max_results: int = 1000) -> Dict[str, Any]:
    """
    Executes a SQL query on Amazon Athena and returns actual results, timing, and data scanned metrics.
    """
    try:
        client = get_athena_client()
        
        output_location = settings.AWS_ATHENA_OUTPUT
        if not output_location.endswith('/'):
            output_location += '/'
            
        start_res = client.start_query_execution(
            QueryString=sql_query,
            QueryExecutionContext={
                'Database': settings.AWS_GLUE_DATABASE
            },
            ResultConfiguration={
                'OutputLocation': output_location
            },
            WorkGroup=settings.AWS_ATHENA_WORKGROUP
        )
        
        execution_id = start_res.get('QueryExecutionId')
        if not execution_id:
            raise RuntimeError("AWS Athena failed to assign Query Execution ID")

        # Poll for completion with adaptive polling interval
        attempts = 0
        state = 'RUNNING'
        execution_time_ms = 0
        data_scanned_mb = '0.00'
        sleep_interval = 0.25
        
        while attempts < 80:
            attempts += 1
            time.sleep(sleep_interval)
            if sleep_interval < 1.0:
                sleep_interval = min(1.0, sleep_interval * 1.5)
            
            check_res = client.get_query_execution(QueryExecutionId=execution_id)
            exec_info = check_res.get('QueryExecution', {})
            status_info = exec_info.get('Status', {})
            state = status_info.get('State', 'UNKNOWN')
            
            if state in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                stats = exec_info.get('Statistics', {})
                bytes_scanned = stats.get('DataScannedInBytes', 0)
                data_scanned_mb = f"{bytes_scanned / (1024 * 1024):.2f}"
                execution_time_ms = stats.get('EngineExecutionTimeInMillis', 0)
                
                if state == 'FAILED':
                    error_msg = status_info.get('StateChangeReason', 'Athena query execution failed.')
                    return {
                        'queryExecutionId': execution_id,
                        'status': 'FAILED',
                        'executionTimeMs': execution_time_ms,
                        'dataScannedMb': data_scanned_mb,
                        'columns': [],
                        'rows': [],
                        'errorMessage': error_msg
                    }
                break

        if state != 'SUCCEEDED':
            return {
                'queryExecutionId': execution_id,
                'status': state,
                'executionTimeMs': execution_time_ms,
                'dataScannedMb': data_scanned_mb,
                'columns': [],
                'rows': [],
                'errorMessage': f"Query execution timed out or ended in state: {state}"
            }

        # Fetch Query Results with pagination support
        columns = []
        column_types = []
        parsed_rows = []
        next_token = None
        is_first_page = True

        INT_TYPES = {'integer', 'int', 'tinyint', 'smallint', 'bigint'}
        FLOAT_TYPES = {'float', 'double', 'real', 'decimal', 'numeric'}
        BOOL_TYPES = {'boolean'}

        while True:
            page_size = min(1000, max_results - len(parsed_rows))
            if page_size <= 0:
                break

            fetch_kwargs: Dict[str, Any] = {
                'QueryExecutionId': execution_id,
                'MaxResults': page_size
            }
            if next_token:
                fetch_kwargs['NextToken'] = next_token

            results_res = client.get_query_results(**fetch_kwargs)
            result_set = results_res.get('ResultSet', {})

            if is_first_page:
                column_info = result_set.get('ResultSetMetadata', {}).get('ColumnInfo', [])
                columns = [col.get('Name', f'col_{i}') for i, col in enumerate(column_info)]
                column_types = [col.get('Type', '').lower() for col in column_info]
                raw_rows = result_set.get('Rows', [])
                data_rows = raw_rows[1:] if len(raw_rows) > 0 else []
                is_first_page = False
            else:
                data_rows = result_set.get('Rows', [])

            for r in data_rows:
                row_dict = {}
                datum_list = r.get('Data', [])
                for i, col_name in enumerate(columns):
                    val = datum_list[i].get('VarCharValue') if i < len(datum_list) else None
                    if val is not None:
                        col_type = column_types[i] if i < len(column_types) else ''
                        if col_type in INT_TYPES:
                            s = val.strip()
                            if s == '' or s.lower() == 'null':
                                val = None
                            else:
                                try:
                                    val = int(s)
                                except ValueError:
                                    try:
                                        val = int(float(s))
                                    except Exception:
                                        pass
                        elif col_type in FLOAT_TYPES:
                            s = val.strip()
                            if s == '' or s.lower() == 'null':
                                val = None
                            else:
                                try:
                                    val = float(s)
                                except Exception:
                                    pass
                        elif col_type in BOOL_TYPES:
                            s = val.strip().lower()
                            if s in ('true', 't', '1'):
                                val = True
                            elif s in ('false', 'f', '0'):
                                val = False
                    row_dict[col_name] = val
                parsed_rows.append(row_dict)
                if len(parsed_rows) >= max_results:
                    break

            next_token = results_res.get('NextToken')
            if not next_token or len(parsed_rows) >= max_results:
                break

        return {
            'queryExecutionId': execution_id,
            'status': 'SUCCEEDED',
            'executionTimeMs': execution_time_ms,
            'dataScannedMb': data_scanned_mb,
            'columns': columns,
            'rows': parsed_rows,
            'errorMessage': None
        }

    except Exception as e:
        logger.error(f"Athena Execution Failure: {e}")
        return {
            'queryExecutionId': 'error',
            'status': 'FAILED',
            'executionTimeMs': 0,
            'dataScannedMb': '0.00',
            'columns': [],
            'rows': [],
            'errorMessage': str(e)
        }
