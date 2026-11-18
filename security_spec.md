# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Path & Identity Synchronization**: A document in `/users/{userId}/audits/{auditId}` or `/users/{userId}/reviews/{reviewId}` can only be read, created, updated, or deleted by an authenticated user with `email_verified == true` whose `request.auth.uid == userId` and `data.ownerUid == request.auth.uid`.
2. **Strict Key & Size Enforcement**: Every string is bounded by its `firebase-blueprint.json` `minLength`/`maxLength`, every ID is validated with `isValidId()`, and no shadow fields (`hasOnly`) are permitted.
3. **Temporal & Terminal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` and `ownerUid` are immutable on update; `updatedAt` must equal `request.time` on update; once `status == 'archived'`, no further updates are allowed.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/users/user_1/audits/audit_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Cross-User Path Spoof**: `auth.uid = 'attacker_1'`, writing to `/users/victim_1/audits/audit_1` -> `PERMISSION_DENIED`.
4. **Payload Owner Mismatch**: `auth.uid = 'user_1'`, writing to `/users/user_1/audits/audit_1` with `ownerUid: 'victim_1'` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Adding `isAdmin: true` to an `AuditRecord` payload -> `PERMISSION_DENIED`.
6. **ID Poisoning Attack**: Document ID containing spaces or >128 characters -> `PERMISSION_DENIED`.
7. **Denial of Wallet String Overflow**: `summary` string of 5,000 characters (exceeds max 500) -> `PERMISSION_DENIED`.
8. **Invalid Grade Enum**: `grade: 'Z'` (not in `['A', 'B', 'C', 'D', 'F']`) -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Setting `createdAt` to a past/future timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation**: Updating `createdAt` or `ownerUid` on an existing document -> `PERMISSION_DENIED`.
11. **Terminal State Bypass**: Updating an `AuditRecord` or `UserReview` whose existing `status` is already `'archived'` -> `PERMISSION_DENIED`.
12. **Unauthorized Cross-User List Query**: Listing `/users/victim_1/audits` as `attacker_1` -> `PERMISSION_DENIED`.
