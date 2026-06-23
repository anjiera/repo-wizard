# AI Safety & Compliance Checklist

This checklist provides a high-density reference for auditing and configuring repositories containing AI/ML components or large language model (LLM) integrations, specifically covering the EU AI Act, OWASP Top 10 for LLMs, Input/Output Guardrails, and Model Bias Auditing.

---

## 1. EU AI Act Compliance

The European Union Artificial Intelligence Act classifies AI systems based on risk level and establishes obligations for providers and deployers:
* **Prohibited AI Systems:** (e.g. cognitive behavioral manipulation, untargeted scraping of facial images) - Must NOT be deployed.
* **High-Risk AI Systems:** (e.g. biometrics, critical infrastructure, employment scoring, credit scoring) - Must adhere to strict compliance gates.
* **Limited / Minimal Risk:** Subject to lightweight transparency obligations.

### 1.1 High-Risk Compliance Gates
- [ ] **Risk Management System:** Establish a documented risk management process (`docs/AI_RISK_MANAGEMENT.md`) that continuously identifies, estimates, and mitigates risks associated with the AI system.
- [ ] **Data Governance:** Audit training, validation, and testing datasets for bias, completeness, and representative quality. Document dataset origin and data processing pipelines.
- [ ] **Technical Documentation:** Maintain detailed technical specifications (system architecture, training algorithms, model performance metrics) to demonstrate compliance to regulators.
- [ ] **Automated Logging:** Ensure the system automatically records events and logs system activity (traceability of decisions, runtime logs) throughout its operational lifetime.
- [ ] **Human Oversight:** Verify that the system interface allows a human supervisor to understand the model's output, override decisions, or halt execution (kill-switch).
- [ ] **Cybersecurity & Robustness:** Implement defenses against adversarial attacks (prompt injection, evasion attacks) and measure model accuracy under stress test conditions.

---

## 2. OWASP Top 10 for LLM Applications

Use this checklist to secure applications integrating Large Language Models:

### 2.1 Prompt Injection & Input Safeguards
- [ ] **LLM-01: Prompt Injection Defenses:**
  - Implement input sanitization to strip control characters or markup boundaries from user-supplied inputs.
  - Treat user input strictly as data; do not concatenate user input directly into system prompts or instructions.
  - Apply semantic classifiers (e.g. adversarial prompt detectors) to intercept jailbreaks before sending to the model.

### 2.2 Output Validation & Agency Limits
- [ ] **LLM-02: Insecure Output Handling:**
  - Sanitize and validate all model-generated text before rendering it in UI components (preventing Cross-Site Scripting [XSS] or Markdown injection).
  - Strictly parse model responses (e.g. JSON validation) before feeding them to downstream command runners or database queries.
- [ ] **LLM-08: Excessive Agency Mitigations:**
  - Grant LLM plugins and APIs the absolute minimum privileges required (Least Privilege Principle).
  - Require explicit human-in-the-loop approval before executing irreversible actions (e.g., executing shell scripts, deleting data, sending external emails).

### 2.3 Information Security & Training
- [ ] **LLM-06: Sensitive Information Disclosure:**
  - Strip PII, credentials, or proprietary company data from prompt contexts using automated data scrubbers.
  - Apply output filters to block the model from repeating raw system prompts or configuration strings.
- [ ] **LLM-03: Training Data Poisoning:**
  - Verify the integrity and source of all external datasets used for fine-tuning or RAG (Retrieval-Augmented Generation).
  - Audit vector database ingress to ensure untrusted user content cannot corrupt the retrieval context.

---

## 3. LLM Guardrails & Input/Output Filtering

Implement automated middleware to validate model inputs and outputs:

### 3.1 Input Filtering Gates
- [ ] **Jailbreak Detection:** Set up classification models (e.g. Llama Guard, NeMo Guardrails) to scan user inputs for malicious instructions, policy violations, or prompt injections.
- [ ] **PII Redaction:** Implement regex or Named Entity Recognition (NER) filters to scrub Social Security numbers, credit card numbers, and emails from input prompts.
- [ ] **Toxicity Scanner:** Block inputs containing hate speech, harassment, or self-harm instructions.

### 3.2 Output Filtering Gates
- [ ] **Hallucination Checks:** For RAG systems, implement semantic consistency checks (comparing output assertions against the source document context) to detect and flag hallucinations.
- [ ] **Format Validation:** Force output formatting (e.g. using JSON schema engines or libraries like Instructor/Outlines) and raise exceptions on invalid structures.
- [ ] **Toxicity & Brand Safety:** Audit model responses to prevent offensive language, non-neutral political claims, or competitors' brand references based on brand policy.

---

## 4. Model Bias & Fairness Auditing

Audit ML models and dataset representations to ensure fair and unbiased outcomes:

### 4.1 Fairness Metric Evaluations
- [ ] **Disparate Impact Ratio:** Calculate the selection rate of a protected group vs. a reference group. Verify that the Disparate Impact ratio is within acceptable thresholds (e.g. the 80% rule for employment scoring).
- [ ] **Demographic Parity:** Ensure the probability of a positive outcome is equal across all demographic groups.
- [ ] **Equal Opportunity / Equalized Odds:** Verify that True Positive Rates and False Positive Rates are equalized across protected attributes.

### 4.2 Dataset & Performance Auditing
- [ ] **Class Balance Review:** Analyze the distribution of protected attributes (race, gender, age, disability status) in training datasets to detect underrepresented subgroups.
- [ ] **Subgroup Error Profiling:** Measure accuracy, precision, and recall metrics separately for each demographic subgroup, flagging any subgroups with significantly higher error rates.
- [ ] **Fairness Regression Gate:** Integrate automated fairness auditing scripts (e.g. Fairlearn, AIF360) into CI/CD pipelines to block models that introduce statistical bias.
