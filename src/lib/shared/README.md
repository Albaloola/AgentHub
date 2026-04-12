Code that both sides of the app can import.

Files here **must not** have runtime side effects and **must not** import from
`frontend/` or `backend/`. Pure types, constants, and small pure functions
only. This keeps the frontend bundle clean (no `better-sqlite3` leakage) and
keeps the backend free of `"use client"` restrictions.

## Files

| File      | Responsibility                                                 |
|-----------|----------------------------------------------------------------|
| `types/`  | Domain model types + a few enum-like constant arrays.         |
