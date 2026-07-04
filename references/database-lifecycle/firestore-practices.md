# Firestore Document Database Guidelines & Practices

These guidelines provide recommendations for auditing Google Cloud Firestore document databases, security rules, and query patterns.

---

## 1. Security & Document Access Constraints
Firestore exposes database endpoints directly to mobile and web client SDKs. Access is controlled solely by security rules.

*   **Public Access Verification:**
    *   *Issue:* Default rules allowing global read/write permissions (e.g. `allow read, write: if true;`) expose the entire database to the public.
    *   *Practice:* Enforce granular authorization rules. Validate user authentication status using `request.auth` and verify record ownership (e.g., `allow read: if request.auth != null && resource.data.userId == request.auth.uid;`).

---

## 2. Document Modeling & Query Guidelines
*   **Subcollection Nesting Limits:**
    *   *Practice:* Use subcollections to group sub-elements instead of growing arrays within single documents, avoiding the 1MB document size limit constraint.
*   **Compound Query Indexes:**
    *   *Practice:* Firestore requires indexes for all compound queries. Build and configure compound indexes when querying multiple fields with inequalities or sorting rules.
*   **Transaction Batch Rates:**
    *   *Practice:* Limit bulk transactional updates to no more than 500 operations per batch, as defined by Firestore engine execution limits.
