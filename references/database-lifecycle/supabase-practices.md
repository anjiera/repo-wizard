# Supabase Lifecycle Guidelines & Practices

These guidelines provide recommendations for auditing Supabase applications, Row-Level Security configuration, and connection pooling settings.

---

## 1. Security & Row-Level Access Controls
Supabase exposes the database directly via HTTP REST APIs. Proper security configuration at the database level is required to prevent unauthorized data exposure.

*   **Row-Level Security (RLS) Rules:**
    *   *Issue:* Tables created without RLS rules enabled are public, allowing anyone with the API key to read, update, or delete all records.
    *   *Practice:* Enforce RLS on every table. Write explicit authentication checks using `auth.uid()` and policies (e.g. `USING (auth.uid() = user_id)`).
*   **Bypassing Policies (Service Role Key):**
    *   *Practice:* Use the `anon` or `authenticated` clients for standard user operations. The high-privilege `service_role` client bypasses all RLS rules and should only be initialized in secure backend environments (like Edge Functions or isolated servers).

---

## 2. Serverless Connection Management
*   **API Connection Limits:**
    *   *Issue:* Serverless execution environments spawn many instances concurrently, which can quickly exhaust the database pool limits.
    *   *Practice:* Connect to the database using Supabase's transaction poolers (e.g., PgBouncer on port 6543) rather than standard direct connection configurations.
