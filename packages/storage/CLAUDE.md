# Storage Package

**Quick Reference:** Artifact and log storage abstraction with pluggable backends (local file-system, InsForge, combined mode). Wave 9 implementation.

**Workspace:** `packages/storage`

---

## Overview

The storage package provides a unified interface for persisting artifacts, logs, and run artifacts. It abstracts away backend differences and supports multiple implementations:

- **Local File-System Backend** — Fast, suitable for single-machine deployments
- **InsForge Backend** — Cloud storage with built-in versioning and integrity
- **Combined Mode** — Writes to both backends for redundancy and verification

### Use Cases

1. **Run Artifacts** — Store generated code, plans, and reports
2. **Audit Logs** — Persist hash-chain audit trails
3. **Project Memory** — Cache execution context and learning models
4. **Execution Reports** — Store detailed step-by-step execution logs

---

## Architecture

### Storage Provider Pattern

The storage package uses the Repository pattern with a unified interface:

```
┌─────────────────────────────────┐
│   StorageProvider Interface     │
├─────────────────────────────────┤
│ • put(key, data, options)       │
│ • get(key)                      │
│ • delete(key)                   │
│ • getPublicUrl(key)             │
└─────────────────────────────────┘
        ▲           ▲           ▲
        │           │           │
    ┌───┴───┐   ┌───┴────┐  ┌──┴──────┐
    │ Local │   │ InsForge  │ Combined │
    └───────┘   └──────────┘  └────────┘
```

---

## StorageProvider Interface

```typescript
interface StorageProvider {
  /**
   * Write data to storage
   */
  put(
    key: string,
    data: string | Buffer,
    options?: StorageOptions
  ): Promise<ArtifactMetadata>

  /**
   * Read data from storage
   */
  get(key: string): Promise<Buffer>

  /**
   * Delete data from storage
   */
  delete(key: string): Promise<void>

  /**
   * Get public/signed URL for artifact
   */
  getPublicUrl(key: string): Promise<string>
}
```

### ArtifactMetadata

Returned after successful write operations:

```typescript
interface ArtifactMetadata {
  key: string                    // Unique storage key
  fileName: string               // Original file name
  contentType: string            // MIME type (text/plain, application/json, etc.)
  size: number                   // Size in bytes
  storagePath: string            // File path or cloud URL
  provider: string               // 'local' or 'insforge'
  createdAt: string              // ISO 8601 timestamp
  hash?: string                  // SHA-256 or MD5 hash
  version?: string               // Version ID (if backend supports versioning)
  tags?: Record<string, string>  // Custom metadata tags
}
```

### StorageOptions

Configuration for write operations:

```typescript
interface StorageOptions {
  contentType?: string           // MIME type (auto-detected if omitted)
  isPublic?: boolean             // Generate public URL (local) or share (InsForge)
  tags?: Record<string, string>  // Custom tags for filtering/searching
}
```

---

## Backend Implementations

### Local File-System Backend

**Class:** `LocalStorageProvider`

Stores artifacts on local disk. Suitable for development and single-machine deployments.

#### Configuration

```typescript
const provider = new LocalStorageProvider(baseDir: string)
```

**Parameters:**
- `baseDir` — Root directory for storage (e.g., `/tmp/codekit` or `./artifacts`)

#### Characteristics

| Property | Value |
|----------|-------|
| Latency | <1ms (local disk) |
| Throughput | 100+ MB/s (depends on disk) |
| Scalability | Limited by disk space |
| Durability | Single copy; risk of data loss |
| Cost | None (if storage provided) |
| Versioning | Not supported |

#### Key Methods

```typescript
// Write file
const metadata = await provider.put(
  'run-abc123/plan.json',
  JSON.stringify(plan),
  { contentType: 'application/json', isPublic: false }
)

// Read file
const buffer = await provider.get('run-abc123/plan.json')
const content = buffer.toString('utf-8')

// Get public file URL
const url = await provider.getPublicUrl('run-abc123/output.pdf')
// Returns: file:///tmp/codekit/run-abc123/output.pdf

// Delete file
await provider.delete('run-abc123/plan.json')
```

#### Storage Path Structure

```
baseDir/
├── run-abc123/
│   ├── plan.json
│   ├── artifacts/
│   │   ├── auth-adapter.ts
│   │   └── types.ts
│   └── logs/
│       └── execution.log
└── run-def456/
    └── ...
```

#### Best Practices

1. Use consistent key structure (e.g., `{runId}/{fileName}`)
2. Set `isPublic: false` for sensitive files
3. Clean up old runs periodically to free disk space
4. Monitor disk usage; set up alerts for >80% utilization
5. Back up storage directory regularly

---

### InsForge Backend

**Class:** `InsForgeStorage`

Cloud-based storage with versioning, integrity checking, and built-in redundancy.

#### Configuration

```typescript
const provider = new InsForgeStorage(
  bucket: string,
  apiKey: string
)
```

**Parameters:**
- `bucket` — InsForge bucket name (from environment)
- `apiKey` — API key for authentication (from environment: `INSFORGE_API_KEY`)

#### Characteristics

| Property | Value |
|----------|-------|
| Latency | 50-200ms (network dependent) |
| Throughput | Limited by API rate limits (10 req/s typical) |
| Scalability | Unlimited |
| Durability | 99.9% (multi-region replication) |
| Cost | Per-transaction (typically $0.01-0.05 per write) |
| Versioning | Supported (automatic) |

#### Key Methods

```typescript
// Write file with versioning
const metadata = await provider.put(
  'run-abc123/plan.json',
  JSON.stringify(plan),
  { contentType: 'application/json', isPublic: true }
)
// Returns: metadata.version = "v1"

// Read file
const buffer = await provider.get('run-abc123/plan.json')

// Get signed public URL
const url = await provider.getPublicUrl('run-abc123/output.pdf')
// Returns: https://insforge.io/api/v1/objects/bucket-name/run-abc123/output.pdf?signature=...

// Delete file
await provider.delete('run-abc123/plan.json')
```

#### API Rate Limits

- **Write:** 10 requests per second per API key
- **Read:** 100 requests per second
- **Batch operations:** 5 concurrent requests recommended

#### Fallback Behavior

InsForge errors don't block operations:

```typescript
// If InsForge is down, falls back gracefully
try {
  return await insforgeProvider.put(key, data)
} catch (error) {
  console.warn('[Storage] InsForge unavailable, using local fallback')
  return await localProvider.put(key, data)
}
```

---

### Combined Backend

**Mode:** `'combined'`

Writes to both local and InsForge simultaneously. Local storage provides fast access; InsForge provides durability and remote backup.

#### Configuration

```typescript
const provider = getStorageProvider({
  type: 'combined',
  localBaseDir: '/tmp/codekit',
  insforgeBucket: process.env.INSFORGE_BUCKET,
  insforgeApiKey: process.env.INSFORGE_API_KEY
})
```

#### Behavior

1. **Writes** — Sync to local; InsForge failure is non-blocking (logged as warning)
2. **Reads** — Always from local (faster)
3. **Deletes** — Both backends (local required; InsForge is best-effort)
4. **Public URLs** — From local file-system

#### Use Case

Combined mode provides:
- **Fast access** via local cache
- **Durability** via InsForge backup
- **Verification** by comparing checksums if needed
- **Graceful degradation** if either backend fails

---

## Common Usage Patterns

### 1. Store Run Artifact

```typescript
import { getStorageProvider } from '@packages/storage'

const provider = getStorageProvider({
  type: process.env.STORAGE_TYPE || 'local',
  localBaseDir: '/tmp/codekit',
  insforgeBucket: process.env.INSFORGE_BUCKET,
  insforgeApiKey: process.env.INSFORGE_API_KEY
})

// Store execution plan
const metadata = await provider.put(
  `run-${runId}/plan.json`,
  JSON.stringify(plan),
  {
    contentType: 'application/json',
    isPublic: false,
    tags: { runId, type: 'plan', version: '1.0' }
  }
)

console.log(`Plan stored: ${metadata.storagePath}`)
```

### 2. Retrieve Artifact

```typescript
// Read back the plan
const buffer = await provider.get(`run-${runId}/plan.json`)
const plan = JSON.parse(buffer.toString('utf-8'))
```

### 3. Generate Public URL

```typescript
// Share execution report
const url = await provider.getPublicUrl(`run-${runId}/report.pdf`)
console.log(`Report available at: ${url}`)
```

### 4. Archive & Cleanup

```typescript
// Delete old run artifacts
const oldRunKey = `run-old-id/artifacts`
await provider.delete(oldRunKey)
```

### 5. Batch Writes

```typescript
// Store multiple artifacts
const artifacts = [
  { key: `run-${runId}/code/auth.ts`, data: authCode },
  { key: `run-${runId}/code/types.ts`, data: typesCode },
  { key: `run-${runId}/code/index.ts`, data: indexCode }
]

const results = await Promise.all(
  artifacts.map(({ key, data }) =>
    provider.put(key, data, { contentType: 'text/plain' })
  )
)

console.log(`Stored ${results.length} files`)
```

---

## Error Handling

### Common Error Scenarios

| Error | Cause | Recovery |
|-------|-------|----------|
| File not found | Key doesn't exist | Return null or default value |
| Disk full (local) | Storage capacity exceeded | Implement cleanup; set up monitoring |
| InsForge rate limit | Too many concurrent requests | Implement exponential backoff |
| Permission denied | API key invalid | Check credentials; regenerate key |
| Network timeout | Slow network or service latency | Retry with backoff; use combined mode for fallback |

### Best Practices

1. **Check for existence** before reading
2. **Implement backoff** for transient errors
3. **Use combined mode** for critical data
4. **Monitor provider health** — track latency and error rates
5. **Handle missing files gracefully** — don't throw on missing data

---

## Configuration & Environment

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `STORAGE_TYPE` | Backend type: local, insforge, combined | `combined` |
| `STORAGE_LOCAL_DIR` | Local storage base directory | `/tmp/codekit` |
| `INSFORGE_BUCKET` | InsForge bucket name | `codekit-prod` |
| `INSFORGE_API_KEY` | InsForge API key | (secret) |

### Example `.env` Configuration

```bash
# Storage configuration
STORAGE_TYPE=combined
STORAGE_LOCAL_DIR=/var/codekit/artifacts

# InsForge configuration
INSFORGE_BUCKET=codekit-production
INSFORGE_API_KEY=sk_live_xxxxxxxxxxxxx
```

---

## Testing

### Unit Tests for Local Backend

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocalStorageProvider } from '@packages/storage'
import fs from 'node:fs'
import path from 'node:path'

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider
  let tempDir: string

  beforeEach(() => {
    tempDir = path.join('/tmp', `test-storage-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })
    provider = new LocalStorageProvider(tempDir)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('stores and retrieves files', async () => {
    const data = 'test content'
    const metadata = await provider.put('test.txt', data)
    
    expect(metadata.key).toBe('test.txt')
    expect(metadata.size).toBe(data.length)
    
    const retrieved = await provider.get('test.txt')
    expect(retrieved.toString()).toBe(data)
  })

  it('generates file:// URLs', async () => {
    await provider.put('public.txt', 'content', { isPublic: true })
    const url = await provider.getPublicUrl('public.txt')
    
    expect(url).toMatch(/^file:\/\//)
    expect(url).toContain('public.txt')
  })

  it('deletes files', async () => {
    await provider.put('temp.txt', 'data')
    await provider.delete('temp.txt')
    
    expect(async () => {
      await provider.get('temp.txt')
    }).rejects.toThrow()
  })
})
```

### Integration Tests with Combined Mode

```typescript
describe('Combined Storage', () => {
  it('writes to local and InsForge', async () => {
    const provider = getStorageProvider({
      type: 'combined',
      localBaseDir: tempDir,
      insforgeBucket: 'test-bucket',
      insforgeApiKey: 'test-key'
    })

    const metadata = await provider.put('test.json', '{}')
    
    // Verify local write
    expect(fs.existsSync(path.join(tempDir, 'test.json'))).toBe(true)
    
    // InsForge would be called but may fail in test (mocked)
    expect(metadata.provider).toBe('local')
  })
})
```

---

## Performance Considerations

### Local Backend Optimization

1. **Use SSD storage** — Disk speed is bottleneck
2. **Partition by runId** — Smaller directories per run
3. **Archive old runs** — Move completed runs to archival storage
4. **Monitor inode usage** — Too many small files can exhaust inodes

### InsForge Optimization

1. **Batch writes** — Combine small writes when possible
2. **Compress before upload** — Reduce bandwidth usage
3. **Use versioning** — Rely on built-in versioning for history
4. **Cache metadata** — Store artifact lists locally

### Combined Mode Optimization

1. **Write concurrently** — Local and InsForge in parallel
2. **Read from local** — Fast local retrieval
3. **Implement sync queue** — Retry failed InsForge writes

---

## Gotchas & Known Limitations

1. **No Transactionality**
   - Writes are not atomic across backends
   - Combined mode can result in partial writes if one backend fails
   - No built-in rollback mechanism

2. **Local Backend Constraints**
   - Single machine only; no multi-machine sharing
   - No versioning support
   - Manual cleanup required for old data
   - Disk I/O can block event loop (especially large files)

3. **InsForge Backend Constraints**
   - Requires network access
   - API rate limits (10 req/s)
   - Eventual consistency (may not immediately reflect writes)
   - Cost per transaction

4. **File Size Limits**
   - No built-in streaming for large files
   - Entire file loaded into memory for write/read
   - Not suitable for multi-GB artifacts

5. **Metadata Handling**
   - MIME type auto-detection may be inaccurate
   - Tags are metadata only; no query support
   - Version IDs not portable across backends

---

## Cross-References

**Depends on:**
- External: `axios` (for InsForge HTTP API)
- Node.js built-ins: `fs` (file-system), `path` (path operations)

**Used by:**
- `apps/control-service` — Artifact storage for runs
- `packages/audit` — Audit log persistence
- `packages/prompt-system` — Prompt cache storage
- `packages/learning` — Learning model persistence

**Related Documentation:**
- [Root CLAUDE.md](../../CLAUDE.md) — Project overview
- [Control Service CLAUDE.md](../../apps/control-service/CLAUDE.md) — Run artifact management
- [Audit Package](../audit/CLAUDE.md) — Audit logging
- [Deployment Guide](../../docs/DEPLOYMENT.md) — Storage setup and configuration
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md) — Storage issues and recovery

---

## File Structure

```
packages/storage/
├── src/
│   ├── index.ts                    # Factory function, exports
│   ├── provider.ts                 # StorageProvider interface, types
│   ├── local-storage.ts            # LocalStorageProvider implementation
│   ├── insforge-storage.ts         # InsForgeStorage implementation
│   ├── storage-test.ts             # Integration tests
│   └── [test files]
├── package.json
└── README.md
```
