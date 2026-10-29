import type { ErrorObject, ValidateFunction } from 'ajv';
import type { ErrorObject as AjvError } from 'ajv';
import schemaDocument from '../schema/muse-ician.schema.json';
import type { ExportType, WorkspacePayload } from './types';
import { EXPORT_TYPES, SCHEMA_VERSION } from './types';

export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 5000;

export const RECORD_COLLECTIONS = [
  'presets',
  'songs',
  'content_ideas',
  'metadata_packages',
  'campaigns',
  'planned_posts',
  'trends',
  'performance_records',
] as const;

export type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

export const COLLECTION_DEFS: Record<RecordCollection, string> = {
  presets: 'preset',
  songs: 'song',
  content_ideas: 'content_idea',
  metadata_packages: 'metadata_package',
  campaigns: 'campaign',
  planned_posts: 'planned_post',
  trends: 'trend_record',
  performance_records: 'performance_record',
};

export const COLLECTION_LABELS: Record<RecordCollection, string> = {
  presets: 'Preset',
  songs: 'Song',
  content_ideas: 'Content idea',
  metadata_packages: 'Metadata package',
  campaigns: 'Campaign',
  planned_posts: 'Planned post',
  trends: 'Trend record',
  performance_records: 'Performance record',
};

export interface ValidationIssue {
  path: string;
  message: string;
  keyword?: string;
}

export interface RecordError {
  collection: RecordCollection;
  index: number;
  id?: string;
  issues: ValidationIssue[];
}

export interface ValidationResult {
  ok: boolean;
  fatal: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  recordErrors: RecordError[];
  payload: WorkspacePayload | null;
  counts: Partial<Record<RecordCollection, number>>;
  rejected: Partial<Record<RecordCollection, number>>;
  schemaVersion?: string;
  exportType?: ExportType;
}

type Ajv2020Like = {
  compile: (schema: unknown) => ValidateFunction;
  addFormat?: (name: string, format: unknown) => unknown;
  errors?: ErrorObject[] | null;
};

type AjvModule = {
  default: new (opts?: Record<string, unknown>) => Ajv2020Like;
};

type FormatsModule = { default: unknown };

let validatorsPromise: Promise<{
  strict: ValidateFunction;
  lenient: ValidateFunction;
  records: Record<string, { strict: ValidateFunction; lenient: ValidateFunction }>;
}> | null = null;

async function buildValidators() {
  const [{ default: Ajv2020 }, formatsModule] = await Promise.all([
    import('ajv/dist/2020') as Promise<AjvModule>,
    import('ajv-formats') as Promise<FormatsModule>,
  ]);
  const addFormats = formatsModule.default as (ajv: unknown) => unknown;

  const make = (opts: Record<string, unknown>) => {
    const ajv = new Ajv2020({ allErrors: true, strict: false, ...opts });
    addFormats(ajv);
    return ajv;
  };

  const lenientAjv = make({ removeAdditional: 'all', useDefaults: false });
  const strictAjv = make({});

  const strict = strictAjv.compile(schemaDocument);
  const lenient = lenientAjv.compile(schemaDocument);

  const defs = (schemaDocument as { $defs: Record<string, unknown> }).$defs;
  const records: Record<string, { strict: ValidateFunction; lenient: ValidateFunction }> = {};
  for (const [collection, defName] of Object.entries(COLLECTION_DEFS)) {
    const doc = {
      $schema: (schemaDocument as { $schema: string }).$schema,
      $defs: defs,
      $ref: `#/$defs/${defName}`,
    };
    records[collection] = {
      strict: strictAjv.compile(doc as object),
      lenient: lenientAjv.compile(doc as object),
    };
  }
  return { strict, lenient, records };
}

function getValidators() {
  if (!validatorsPromise) validatorsPromise = buildValidators();
  return validatorsPromise;
}

function formatAjvError(error: AjvError, prefix = ''): ValidationIssue {
  const path = `${prefix}${error.instancePath ?? ''}`.replace(/^\//, '').replace(/\//g, '.') || '(root)';
  let message = error.message ?? 'is invalid';
  if (error.keyword === 'additionalProperties' && typeof error.params?.additionalProperty === 'string') {
    message = `unknown field "${error.params.additionalProperty}" is not part of the schema and will be ignored`;
  }
  if (error.keyword === 'enum' && Array.isArray(error.params?.allowedValues)) {
    message = `must be one of: ${error.params.allowedValues.join(', ')}`;
  }
  return { path, message, keyword: error.keyword };
}

function isUnknownFieldError(error: AjvError): boolean {
  return error.keyword === 'additionalProperties' || error.keyword === 'unevaluatedProperties';
}

/** Read and size-check raw text before parsing. */
export function checkPayloadSize(text: string): ValidationIssue | null {
  const bytes = new Blob([text]).size;
  if (bytes > MAX_IMPORT_BYTES) {
    return {
      path: '(file)',
      message: `This file is ${(bytes / 1024 / 1024).toFixed(1)} MB. The import limit is ${(MAX_IMPORT_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      keyword: 'maxBytes',
    };
  }
  return null;
}

/** Validate an unknown value against the muse-ician schema. Never throws on bad input. */
export async function validatePayload(raw: unknown): Promise<ValidationResult> {
  const result: ValidationResult = {
    ok: false,
    fatal: [],
    errors: [],
    warnings: [],
    recordErrors: [],
    payload: null,
    counts: {},
    rejected: {},
  };

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    result.fatal.push({
      path: '(root)',
      message: 'The file must contain a JSON object with schema_version, export_type and manifest.',
    });
    return result;
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.schema_version !== 'string') {
    result.fatal.push({ path: 'schema_version', message: 'schema_version is required (for example "1.0.0").' });
  } else {
    result.schemaVersion = candidate.schema_version;
    const major = candidate.schema_version.split('.')[0];
    if (major !== SCHEMA_VERSION.split('.')[0]) {
      result.fatal.push({
        path: 'schema_version',
        message: `This file uses schema ${candidate.schema_version}. This version of muse-ician supports 1.x exports. Export a fresh template to update it.`,
      });
    } else if (candidate.schema_version !== SCHEMA_VERSION) {
      result.warnings.push({
        path: 'schema_version',
        message: `File schema is ${candidate.schema_version}; this app writes ${SCHEMA_VERSION}. Supported fields will be imported.`,
      });
    }
  }

  if (typeof candidate.export_type !== 'string' || !EXPORT_TYPES.includes(candidate.export_type as ExportType)) {
    result.fatal.push({
      path: 'export_type',
      message: `export_type must be one of: ${EXPORT_TYPES.join(', ')}.`,
    });
  } else {
    result.exportType = candidate.export_type as ExportType;
  }

  if (candidate.manifest === null || typeof candidate.manifest !== 'object') {
    result.fatal.push({ path: 'manifest', message: 'manifest is required and must be an object.' });
  }

  const collectionsPresent = RECORD_COLLECTIONS.filter(
    (collection) => candidate[collection] !== undefined && candidate[collection] !== null,
  );
  if (collectionsPresent.length === 0) {
    result.fatal.push({
      path: '(root)',
      message: 'The file contains no records. Expected at least one of: presets, songs, content_ideas, campaigns, planned_posts, metadata_packages, trends, performance_records.',
    });
  }

  for (const collection of RECORD_COLLECTIONS) {
    const value = candidate[collection];
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value)) {
      result.fatal.push({ path: collection, message: `${collection} must be an array.` });
      continue;
    }
    result.counts[collection] = value.length;
    if (value.length > MAX_IMPORT_RECORDS) {
      result.fatal.push({
        path: collection,
        message: `${collection} contains ${value.length} records; the import limit is ${MAX_IMPORT_RECORDS}.`,
      });
    }
  }

  if (result.fatal.length > 0) return result;

  let validators: Awaited<ReturnType<typeof buildValidators>>;
  try {
    validators = await getValidators();
  } catch (error) {
    result.fatal.push({
      path: '(schema)',
      message: `The validation engine could not start: ${(error as Error).message}`,
    });
    return result;
  }

  // 1. Strict envelope pass on a shallow copy so unknown top-level keys are reported.
  const envelopeCopy = JSON.parse(JSON.stringify(candidate)) as Record<string, unknown>;
  validators.strict(envelopeCopy);
  for (const error of validators.strict.errors ?? []) {
    if (isUnknownFieldError(error) && error.instancePath === '') {
      result.warnings.push(formatAjvError(error, ''));
    }
  }
  for (const error of validators.strict.errors ?? []) {
    // Envelope-level problems only; record problems are reported per record below.
    if (error.instancePath === '') result.errors.push(formatAjvError(error, ''));
  }

  // 2. Remove unknown fields from a working copy.
  const working = JSON.parse(JSON.stringify(candidate)) as Record<string, unknown>;
  validators.lenient(working);

  const accepted: Record<string, unknown[]> = {};
  let sawAnyValidRecord = false;

  for (const collection of RECORD_COLLECTIONS) {
    const list = working[collection];
    if (!Array.isArray(list)) continue;
    const defValidators = validators.records[collection];
    const kept: unknown[] = [];
    let rejected = 0;

    list.forEach((record, index) => {
      if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        result.recordErrors.push({
          collection,
          index,
          issues: [{ path: `${collection}[${index}]`, message: 'must be a JSON object' }],
        });
        rejected += 1;
        return;
      }
      const recordId = typeof (record as { id?: unknown }).id === 'string' ? (record as { id: string }).id : undefined;

      // Report unknown fields as warnings, then validate the cleaned record.
      const strictCopy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
      defValidators.strict(strictCopy);
      const strictErrors = defValidators.strict.errors ?? [];
      const unknownFieldErrors = strictErrors.filter(isUnknownFieldError);
      for (const error of unknownFieldErrors) {
        const field =
          typeof error.params?.additionalProperty === 'string'
            ? `${collection}[${index}].${error.params.additionalProperty}`
            : `${collection}[${index}]`;
        result.warnings.push({
          path: field,
          message: `Unknown field "${String(error.params?.additionalProperty ?? '')}" was ignored.`,
          keyword: error.keyword,
        });
      }
      const meaningful = strictErrors.filter((error) => !isUnknownFieldError(error));
      if (meaningful.length > 0) {
        result.recordErrors.push({
          collection,
          index,
          id: recordId,
          issues: meaningful.map((error) => formatAjvError(error, `${collection}[${index}]`)),
        });
        rejected += 1;
        return;
      }

      // The lenient pass has already stripped unknown fields from `record`.
      const cleanCopy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
      defValidators.lenient(cleanCopy);
      kept.push(cleanCopy);
    });

    if (rejected > 0) result.rejected[collection] = rejected;
    if (kept.length > 0) {
      accepted[collection] = kept;
      sawAnyValidRecord = true;
    }
  }

  if (!sawAnyValidRecord) {
    result.errors.push({
      path: '(root)',
      message: 'No valid records were found in this file. Fix the issues listed below and try again.',
    });
  }

  const manifest = working.manifest as Record<string, unknown>;
  const seenIds = new Map<string, string>();
  for (const collection of RECORD_COLLECTIONS) {
    for (const record of accepted[collection] ?? []) {
      const id = (record as { id?: unknown }).id;
      if (typeof id !== 'string') continue;
      const key = `${collection}:${id}`;
      if (seenIds.has(key)) {
        result.warnings.push({
          path: `${collection}.${id}`,
          message: `The id "${id}" appears more than once in this file. Only the last duplicate will be imported unless you choose "import as new".`,
        });
      }
      seenIds.set(key, collection);
    }
  }

  result.errors.push(...result.recordErrors.flatMap((entry) => entry.issues));
  result.ok = result.errors.length === 0;

  result.payload = {
    schema_version: (working.schema_version as string) ?? SCHEMA_VERSION,
    export_type: working.export_type as ExportType,
    manifest: {
      name: String(manifest?.name ?? 'Imported pack'),
      description: (manifest?.description as string | null | undefined) ?? null,
      created_at: String(manifest?.created_at ?? new Date().toISOString()),
      author: (manifest?.author as string | null | undefined) ?? null,
      schema_version: (manifest?.schema_version as string | undefined) ?? (working.schema_version as string),
      exported_by: (manifest?.exported_by as string | null | undefined) ?? null,
      notes: (manifest?.notes as string | null | undefined) ?? null,
    },
    ...(accepted.presets ? { presets: accepted.presets } : {}),
    ...(accepted.songs ? { songs: accepted.songs } : {}),
    ...(accepted.content_ideas ? { content_ideas: accepted.content_ideas } : {}),
    ...(accepted.metadata_packages ? { metadata_packages: accepted.metadata_packages } : {}),
    ...(accepted.campaigns ? { campaigns: accepted.campaigns } : {}),
    ...(accepted.planned_posts ? { planned_posts: accepted.planned_posts } : {}),
    ...(accepted.trends ? { trends: accepted.trends } : {}),
    ...(accepted.performance_records ? { performance_records: accepted.performance_records } : {}),
    ...(working.preferences && typeof working.preferences === 'object'
      ? { preferences: working.preferences as WorkspacePayload['preferences'] }
      : {}),
  } as WorkspacePayload;

  return result;
}

/** Parse JSON text safely, returning a friendly error instead of throwing. */
export function parseJsonSafely(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const message = (error as Error).message;
    return {
      ok: false,
      message: `This file is not valid JSON (${message}). Ask the AI tool to return only JSON, with no Markdown fences or commentary.`,
    };
  }
}
