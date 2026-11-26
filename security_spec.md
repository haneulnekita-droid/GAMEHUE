# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Immutable Participant Submissions**: Once a participant completes the 7-footprint adventure and submits to `/submissions/{submissionId}`, the record cannot be updated or deleted by any unauthenticated user or other participant.
2. **Admin-Only Read & Management**: Only the verified facilitator account (`haneulnekita@gmail.com` with `email_verified == true`) can read, list, or delete participant submissions, and read or modify `/appConfig/{configId}`.
3. **Strict Schema & Size Boundaries**: Every field on `/submissions/{submissionId}` and `/appConfig/{configId}` is strictly allowlisted (`hasAll` + `hasOnly`), type-checked, bounded in length, and requires server timestamp integrity (`request.time`).
4. **Path Variable Hardening**: Single-document operations validate document IDs against `^[a-zA-Z0-9_\-]+$` and length `<= 128`.

## 2. Dirty Dozen Adversarial Payloads
1. Unauthenticated `get` on `/submissions/sub_1` -> `PERMISSION_DENIED`
2. Unauthenticated `list` on `/submissions` -> `PERMISSION_DENIED`
3. Authenticated non-admin (`other@example.com`) `list` on `/submissions` -> `PERMISSION_DENIED`
4. Spoofed admin (`email: haneulnekita@gmail.com`, `email_verified: false`) `list` on `/submissions` -> `PERMISSION_DENIED`
5. Shadow field injection on `create` (`/submissions/sub_2` with extra `isAdmin: true`) -> `PERMISSION_DENIED`
6. Forged timestamp on `create` (`createdAt` != `request.time`) -> `PERMISSION_DENIED`
7. Oversized `participantCode` (> 50 chars) on `create` -> `PERMISSION_DENIED`
8. Invalid enum value in `huella1HabitTracker` (`"SIEMPRE"`) -> `PERMISSION_DENIED`
9. Empty `huella6Improve` array (`[]`) on `create` -> `PERMISSION_DENIED`
10. Invalid document ID (`sub$bad!`) on `create` -> `PERMISSION_DENIED`
11. Unauthenticated `update` or `delete` on `/submissions/sub_1` -> `PERMISSION_DENIED`
12. Unauthenticated or non-admin write to `/appConfig/sheets` -> `PERMISSION_DENIED`
