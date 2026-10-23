import { GlueClient, GetTablesCommand } from '@aws-sdk/client-glue';
import type { Table as GlueTable } from '@aws-sdk/client-glue';
import { 
  AthenaClient, 
  StartQueryExecutionCommand, 
  GetQueryExecutionCommand, 
  GetQueryResultsCommand 
} from '@aws-sdk/client-athena';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  s3Bucket: string;
  glueDatabase: string;
  athenaWorkgroup: string;
  athenaOutputLocation: string;
  bedrockModelId: string;
}

const STORAGE_KEY = 'infosys_aws_config_v1';

export const defaultAWSConfig: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN || '',
  s3Bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'medical-operations-bharath-2026',
  glueDatabase: import.meta.env.VITE_AWS_GLUE_DATABASE || 'medical_operations_db',
  athenaWorkgroup: import.meta.env.VITE_AWS_ATHENA_WORKGROUP || 'primary',
  athenaOutputLocation: import.meta.env.VITE_AWS_ATHENA_OUTPUT || 's3://medical-operations-bharath-2026/athena-query-results/',
  bedrockModelId: import.meta.env.VITE_AWS_BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
};

export function getStoredAWSConfig(): AWSConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultAWSConfig, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to read AWS config from localStorage', e);
  }
  return defaultAWSConfig;
}

export function saveAWSConfig(config: AWSConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function getCredentials(config: AWSConfig) {
  if (config.accessKeyId && config.secretAccessKey) {
    return {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
      ...(config.sessionToken ? { sessionToken: config.sessionToken.trim() } : {}),
    };
  }
  return undefined;
}

export interface AWSCallerIdentity {
  accountId: string;
  arn: string;
  userId: string;
}

/**
 * Validates active AWS credentials using AWS STS GetCallerIdentity API
 */
export async function getAWSCallerIdentity(config: AWSConfig): Promise<AWSCallerIdentity> {
  const credentials = getCredentials(config);
  if (!credentials) {
    throw new Error('AWS Credentials Missing: Please provide Access Key ID and Secret Access Key in AWS Settings.');
  }

  const sts = new STSClient({
    region: config.region,
    credentials,
  });

  const response = await sts.send(new GetCallerIdentityCommand({}));
  return {
    accountId: response.Account || 'Unknown',
    arn: response.Arn || 'Unknown',
    userId: response.UserId || 'Unknown',
  };
}

export interface GlueTableSummary {
  name: string;
  records: string;
  size: string;
  s3Location: string;
  cols: { name: string; type: string }[];
  createTime?: Date;
}

/**
 * Fetches real table metadata directly from AWS Glue Data Catalog
 */
export async function fetchRealGlueTables(config: AWSConfig): Promise<GlueTableSummary[]> {
  const credentials = getCredentials(config);
  if (!credentials) {
    throw new Error('AWS Credentials Missing: Configure AWS Access Key & Secret in AWS Settings panel.');
  }

  const glue = new GlueClient({
    region: config.region,
    credentials,
  });

  const command = new GetTablesCommand({
    DatabaseName: config.glueDatabase,
  });

  const response = await glue.send(command);
  const tableList: GlueTable[] = response.TableList || [];

  if (tableList.length === 0) {
    return [];
  }

  return tableList.map((t) => {
    const numRows = t.Parameters?.numRows || t.Parameters?.['spark.sql.statistics.numRows'] || 'Unindexed';
    const totalSize = t.Parameters?.totalSize || 'Unknown';
    const cols = (t.StorageDescriptor?.Columns || []).map((c) => ({
      name: c.Name || 'unnamed',
      type: c.Type || 'string',
    }));

    return {
      name: t.Name || 'unnamed_table',
      records: numRows,
      size: formatBytes(totalSize),
      s3Location: t.StorageDescriptor?.Location || `s3://${config.s3Bucket}/${t.Name}`,
      cols,
      createTime: t.CreateTime,
    };
  });
}

function formatBytes(bytesStr: string): string {
  const bytes = parseInt(bytesStr, 10);
  if (isNaN(bytes) || bytes === 0) return 'S3 Location';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export interface AthenaExecutionResult {
  queryExecutionId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'RUNNING';
  executionTimeMs: number;
  dataScannedMb: string;
  columns: string[];
  rows: Record<string, any>[];
  errorMessage?: string;
}

/**
 * Submits and retrieves live query execution results from AWS Athena
 */
export async function executeRealAthenaQuery(
  sqlQuery: string,
  config: AWSConfig
): Promise<AthenaExecutionResult> {
  const credentials = getCredentials(config);
  if (!credentials) {
    throw new Error('AWS Credentials Missing: Enter valid Access Key ID and Secret Key to run Athena queries.');
  }

  const athena = new AthenaClient({
    region: config.region,
    credentials,
  });

  const outputLocation = config.athenaOutputLocation || `s3://${config.s3Bucket}/athena-query-results/`;

  // 1. Start Query Execution
  const startCmd = new StartQueryExecutionCommand({
    QueryString: sqlQuery,
    QueryExecutionContext: {
      Database: config.glueDatabase,
    },
    ResultConfiguration: {
      OutputLocation: outputLocation,
    },
    WorkGroup: config.athenaWorkgroup || 'primary',
  });

  const startRes = await athena.send(startCmd);
  const queryExecutionId = startRes.QueryExecutionId;

  if (!queryExecutionId) {
    throw new Error('AWS Athena failed to assign Query Execution ID');
  }

  // 2. Poll for Completion
  let isFinished = false;
  let attempts = 0;
  let state = 'RUNNING';
  let executionTimeMs = 0;
  let dataScannedMb = '0.00';
  let errorMessage: string | undefined = undefined;

  while (!isFinished && attempts < 30) {
    attempts++;
    await new Promise((res) => setTimeout(res, 1000));

    const checkCmd = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
    const checkRes = await athena.send(checkCmd);
    const exec = checkRes.QueryExecution;
    state = exec?.Status?.State || 'UNKNOWN';

    if (state === 'SUCCEEDED' || state === 'FAILED' || state === 'CANCELLED') {
      isFinished = true;
      executionTimeMs = exec?.Status?.CompletionDateTime && exec?.Status?.SubmissionDateTime
        ? exec.Status.CompletionDateTime.getTime() - exec.Status.SubmissionDateTime.getTime()
        : exec?.Statistics?.EngineExecutionTimeInMillis || 0;

      const bytesScanned = exec?.Statistics?.DataScannedInBytes || 0;
      dataScannedMb = (bytesScanned / (1024 * 1024)).toFixed(2);

      if (state === 'FAILED') {
        errorMessage = exec?.Status?.StateChangeReason || 'AWS Athena Query Failed';
        return {
          queryExecutionId,
          status: 'FAILED',
          executionTimeMs,
          dataScannedMb,
          columns: [],
          rows: [],
          errorMessage,
        };
      }
    }
  }

  if (state !== 'SUCCEEDED') {
    throw new Error(`AWS Athena query execution timed out or finished with state: ${state}`);
  }

  // 3. Get Query Results
  const resultsCmd = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId, MaxResults: 100 });
  const resultsRes = await athena.send(resultsCmd);

  const resultSet = resultsRes.ResultSet;
  const columnInfo = resultSet?.ResultSetMetadata?.ColumnInfo || [];
  const columns = columnInfo.map((c) => c.Name || 'unnamed');

  const rawRows = resultSet?.Rows || [];
  // First row in Athena result set is the header
  const dataRows = rawRows.slice(1);

  const parsedRows = dataRows.map((r) => {
    const rowObj: Record<string, any> = {};
    const datumList = r.Data || [];
    columns.forEach((colName, index) => {
      rowObj[colName] = datumList[index]?.VarCharValue ?? null;
    });
    return rowObj;
  });

  return {
    queryExecutionId,
    status: 'SUCCEEDED',
    executionTimeMs,
    dataScannedMb,
    columns,
    rows: parsedRows,
  };
}

/**
 * Invokes AWS Bedrock LLM with user prompt
 */
export async function invokeRealBedrock(
  prompt: string,
  config: AWSConfig
): Promise<string> {
  const credentials = getCredentials(config);
  if (!credentials) {
    throw new Error('AWS Credentials Missing: Enter Access Key & Secret Key to call AWS Bedrock.');
  }

  const bedrock = new BedrockRuntimeClient({
    region: config.region,
    credentials,
  });

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: config.bedrockModelId || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrock.send(command);
  const jsonString = new TextDecoder().decode(response.body);
  const result = JSON.parse(jsonString);

  return result.content?.[0]?.text || 'No response generated from AWS Bedrock';
}
