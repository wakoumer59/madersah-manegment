# Database Schema — Medresa LMS

This document describes the Firebase Realtime Database (RTDB) schema. All
institution-owned data lives under `/{institutionId}/…`; `institutionId` is implied by
the path and not stored inside each record.

## Root

```
/                                        default deny (.read: false, .write: false)
  users/{uid}                            # app user record (role, institution, status)
  institutions/{instId}                  # institution profile (status: active|suspended|…)
  institutionRequests/{uid}              # institution registration request (id = requester uid)
  pendingAccounts/{code}                 # one-time activation/invite code
  pendingAccountsByInstitution/{instId}/{code} # tenant-scoped listing index
```

## Users (`/users/{uid}`)

| Field | Type | Notes |
|---|---|---|
| uid | string | Firebase Auth uid |
| email | string | matches auth token email |
| displayName | string | |
| role | 'platformOwner\|institutionAdmin\|teacher\|student\|pending' | |
| status | 'pending\|active\|inactive\|suspended' | |
| institutionId | string\|null | null only for platformOwner / pending |
| classId | string\|null | students only |
| createdAt | number | epoch ms |

## Institutions (`/institutions/{instId}`)

| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | |
| status | 'pending\|active\|suspended\|rejected' | |
| contactEmail | string | |
| phone | string | |
| address | string | |
| createdBy | string | uid |
| createdAt | number | server timestamp |
| updatedAt | number | |

## Institution requests (`/institutionRequests/{uid}`)

Institution registration request fields are defined by `InstitutionRequest` in
`src/types/index.ts`.

## Pending accounts (`/pendingAccounts/{code}`)

One-time activation codes. Codes are stored at `/pendingAccounts/{code}` for activation;
`/pendingAccountsByInstitution/{instId}/{code}` is the private, tenant-scoped listing index.

## Classes (`/{instId}/classes/{id}`)

| Field | Type | Notes |
|---|---|---|
| id | string | push id |
| name | string | e.g. "Grade 7A" |
| academicYear | string | e.g. "2026/2027" |
| teacherUid | string\|null | class teacher |
| studentCount | number | denormalized, transaction-maintained |
| createdAt | number | |

## Students (`/{instId}/students/{uid}`)

Same as `Student` type. `uid` == Firebase Auth uid.

## Teachers (`/{instId}/teachers/{uid}`)

| Field | Type | Notes |
|---|---|---|
| uid | string | |
| displayName | string | |
| email | string | |
| status | 'pending\|active\|inactive\|suspended' | |
| createdAt | number | |

## Subjects (`/{instId}/subjects/{id}`)

| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | |
| classId | string | |
| teacherUid | string\|null | |
| createdAt | number | |

## Attendance (`/{instId}/attendance/{classId}/{date}/{studentUid}`)

Path-keyed by (class, date, student) — naturally duplicate-proof. Date is
`YYYY-MM-DD` (institution-local).

| Field | Type | Notes |
|---|---|---|
| status | 'present\|absent\|late\|excused' | |
| note | string | |
| markedBy | string | uid |
| updatedAt | number | server timestamp |

`/{instId}/attendance/{classId}/{date}/_meta` — day rollup:
`markedBy`, `markedAt`, `counts:{present,absent,late,excused}`.

## Tests (`/{instId}/tests/{testId}`)

Staff-only metadata and sub-collections:

```
/{instId}/tests/{testId}/             staff-only test metadata and content
  _questions/{qId}/                   staff only — includes correct answer
  _studentQuestions/{qId}/            student readable — NO correct answer
  _attempts/{studentUid}/             student writes own; staff reads all
  _results/{studentUid}/              staff reads/writes; student reads own after results release
```

Student-readable metadata is mirrored at `/{instId}/testCatalog/{testId}`. The service keeps
this catalog in sync with staff-only test metadata using atomic multi-location updates.

Test metadata fields: `title`, `description`, `classId`, `subjectId`, `startTime`
(epoch ms), `endTime` (epoch ms), `durationMin`, `maxScore`, `status`
('draft\|published\|closed'), `showResults`, `questionCount`, `createdBy`, `createdAt`.

Question fields: `id`, `type` ('mcq\|truefalse'), `text`, `options`,
`correct` ('A'\|'B'\|'C'\|'D' — staff copy only).

Attempt fields: `testId`, `studentUid`, `answers`, `startedAt`, `submittedAt`,
`status` ('in_progress\|submitted').

Result fields: `score`, `total`, `gradedAt`, `method` ('client'\|'server').

## Materials (`/{instId}/materials/{materialId}`)

Metadata in RTDB; file blob in Firebase Storage at
`materials/{uploaderUid}/{instId}/{materialId}/{fileName}`. Storage Rules restrict file
operations to the uploader; authenticated institution members receive the Firebase
download URL from access-controlled RTDB metadata.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| title | string | |
| description | string | |
| classId | string\|null | null = whole institution |
| subjectId | string\|null | |
| visibility | 'class'\|'institution' | |
| fileName | string | |
| contentType | string | |
| size | number | bytes |
| storagePath | string | |
| downloadUrl | string | |
| uploadedBy | string | uid |
| createdAt | number | |
| downloadCount | number | |

## Security Rules

- `firebase/database.rules.json` — RTDB rules (default deny, explicit allowances)
- `firebase/storage.rules` — Storage rules (uploader-owned materials path)

Both are tested in `tests/rules/` and enforced at the Firebase level — the client cannot
bypass them. Existing test records must be copied to `/{instId}/testCatalog/{testId}` before
students can see tests created before the catalog was introduced.