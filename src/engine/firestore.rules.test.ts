import test from 'node:test';
import assert from 'node:assert/strict';

interface AuthContext {
  uid: string;
  email_verified: boolean;
}

interface AuditPayload {
  ownerUid: unknown;
  domain: unknown;
  grade: unknown;
  issuesFound: unknown;
  summary: unknown;
  status: unknown;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

const NOW = 1761212000000;

function isValidId(id: unknown): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(id)
  );
}

function isValidAuditRecord(data: AuditPayload, auth: AuthContext): boolean {
  const allowedKeys = new Set([
    'ownerUid',
    'domain',
    'grade',
    'issuesFound',
    'summary',
    'status',
    'createdAt',
    'updatedAt'
  ]);
  const keys = Object.keys(data);
  if (keys.length !== allowedKeys.size || !keys.every((k) => allowedKeys.has(k))) {
    return false;
  }
  return (
    isValidId(data.ownerUid) &&
    data.ownerUid === auth.uid &&
    typeof data.domain === 'string' &&
    data.domain.length >= 1 &&
    data.domain.length <= 160 &&
    typeof data.grade === 'string' &&
    ['A', 'B', 'C', 'D', 'F'].includes(data.grade) &&
    typeof data.issuesFound === 'number' &&
    Number.isInteger(data.issuesFound) &&
    data.issuesFound >= 0 &&
    data.issuesFound <= 500 &&
    typeof data.summary === 'string' &&
    data.summary.length >= 1 &&
    data.summary.length <= 500 &&
    typeof data.status === 'string' &&
    ['active', 'archived'].includes(data.status) &&
    typeof data.createdAt === 'number' &&
    typeof data.updatedAt === 'number'
  );
}

function evaluateCreateAudit(
  auth: AuthContext | null,
  pathUserId: string,
  auditId: string,
  incoming: AuditPayload,
  requestTime: number
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(pathUserId) || !isValidId(auditId)) return 'PERMISSION_DENIED';
  if (auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!isValidAuditRecord(incoming, auth)) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.status !== 'active') return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateUpdateAudit(
  auth: AuthContext | null,
  pathUserId: string,
  auditId: string,
  existing: AuditPayload,
  incoming: AuditPayload,
  requestTime: number
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(pathUserId) || !isValidId(auditId)) return 'PERMISSION_DENIED';
  if (auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!isValidAuditRecord(incoming, auth)) return 'PERMISSION_DENIED';
  if (existing.ownerUid !== auth.uid) return 'PERMISSION_DENIED';
  if (existing.status === 'archived') return 'PERMISSION_DENIED';
  if (incoming.ownerUid !== existing.ownerUid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== existing.createdAt) return 'PERMISSION_DENIED';
  if (incoming.updatedAt !== requestTime) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

const validAuth: AuthContext = { uid: 'user_1', email_verified: true };
const validPayload: AuditPayload = {
  ownerUid: 'user_1',
  domain: 'shadyairlines.example',
  grade: 'F',
  issuesFound: 10,
  summary: '10 deceptive patterns found and neutralized.',
  status: 'active',
  createdAt: NOW,
  updatedAt: NOW
};

test('Dirty Dozen #1-12 payloads all return PERMISSION_DENIED', () => {
  // 1. Unauthenticated write
  assert.equal(
    evaluateCreateAudit(null, 'user_1', 'audit_1', validPayload, NOW),
    'PERMISSION_DENIED'
  );
  // 2. Unverified email spoof
  assert.equal(
    evaluateCreateAudit(
      { uid: 'user_1', email_verified: false },
      'user_1',
      'audit_1',
      validPayload,
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 3. Cross-user path spoof
  assert.equal(
    evaluateCreateAudit(validAuth, 'victim_1', 'audit_1', validPayload, NOW),
    'PERMISSION_DENIED'
  );
  // 4. Payload owner mismatch
  assert.equal(
    evaluateCreateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, ownerUid: 'victim_1' },
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 5. Shadow field injection
  assert.equal(
    evaluateCreateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, isAdmin: true },
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 6. ID poisoning attack
  assert.equal(
    evaluateCreateAudit(validAuth, 'user_1', 'bad id with spaces!', validPayload, NOW),
    'PERMISSION_DENIED'
  );
  // 7. Denial of Wallet string overflow
  assert.equal(
    evaluateCreateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, summary: 'x'.repeat(501) },
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 8. Invalid grade enum
  assert.equal(
    evaluateCreateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, grade: 'Z' },
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 9. Client timestamp forgery
  assert.equal(
    evaluateCreateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, createdAt: NOW - 5000 },
      NOW
    ),
    'PERMISSION_DENIED'
  );
  // 10. Immutable field mutation on update
  assert.equal(
    evaluateUpdateAudit(
      validAuth,
      'user_1',
      'audit_1',
      validPayload,
      { ...validPayload, createdAt: NOW + 100, updatedAt: NOW + 100 },
      NOW + 100
    ),
    'PERMISSION_DENIED'
  );
  // 11. Terminal state bypass (archived)
  assert.equal(
    evaluateUpdateAudit(
      validAuth,
      'user_1',
      'audit_1',
      { ...validPayload, status: 'archived' },
      { ...validPayload, summary: 'Modified after archive', updatedAt: NOW + 100 },
      NOW + 100
    ),
    'PERMISSION_DENIED'
  );
  // 12. Valid owner write succeeds
  assert.equal(
    evaluateCreateAudit(validAuth, 'user_1', 'audit_1', validPayload, NOW),
    'ALLOW'
  );
});
