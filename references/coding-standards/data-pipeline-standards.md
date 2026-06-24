# Data Pipeline & Quality Standards

This document serves as the repository's source of truth for database connection pooling, schema validations, and workflow orchestrations, helping prevent silent data corruptions and pipeline failures.

---

## 1. Data Schema Validation

To prevent silent data corruption, ingest pipelines must validate datasets at system boundaries using runtime schema validation libraries (such as `Pandera` for Python dataframes or `Great Expectations` for SQL databases).

### 1.1 Python Pandera Schema Validation
Use `pandera` to validate Pandas/Polars DataFrames before loading them into databases.

```python
import pandas as pd
import pandera as pa
from pandera import Column, Check, DataFrameSchema

# Define the user ingestion schema
user_ingest_schema = DataFrameSchema({
    "user_id": Column(
        pa.String,
        checks=Check.str_matches(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"),
        nullable=False,
        description="Unique user UUID string"
    ),
    "email": Column(
        pa.String,
        checks=Check.str_matches(r"^[^@]+@[^@]+\.[^@]+$"),
        nullable=False
    ),
    "age": Column(
        pa.Int,
        checks=Check.in_range(0, 120),
        nullable=True
    ),
    "role": Column(
        pa.String,
        checks=Check.isin(["admin", "member", "guest"]),
        nullable=False
    )
})

def process_and_validate_users(csv_path: str) -> pd.DataFrame:
    raw_df = pd.read_csv(csv_path)
    # Validates DataFrame and raises SchemaErrors on failure
    validated_df = user_ingest_schema.validate(raw_df)
    return validated_df
```

---

## 2. ETL Workflow Orchestrations

Automated data pipelines must be scheduled using workflow orchestrators. Task definitions must include failure alerting, maximum retries, and exponential retry intervals.

### 2.1 Apache Airflow DAG Specification (`dags/user_sync_dag.py`)
```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

def run_user_sync():
    print("Syncing users data...")
    # Business logic execution...

# Default args enforce retries and exponential delays
default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2026, 1, 1),
    'email': ['data-alerts@mycompany.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True, # Wait longer between retries
    'max_retry_delay': timedelta(minutes=30),
}

with DAG(
    'user_profile_sync_pipeline',
    default_args=default_args,
    description='Automated nightly user sync with retry parameters',
    schedule_interval='@daily',
    catchup=False,
) as dag:

    sync_task = PythonOperator(
        task_id='sync_profiles',
        python_callable=run_user_sync,
    )
```

---

## 3. Database Connection Pooling

Data-intensive scripts and pipelines must use connection pools to prevent database socket exhaustion. Connections must configure timeouts, recycling periods, and retry backoff.

### 3.1 SQLAlchemy Connection Pool Config (Python)
```python
from sqlalchemy import create_engine

# Database Connection String
DATABASE_URL = "postgresql://db_user:db_pass@localhost:5432/main_db"

engine = create_engine(
    DATABASE_URL,
    # Configure connection pool sizes
    pool_size=10,             # Keep up to 10 connections open
    max_overflow=5,           # Allow up to 5 temporary connections beyond pool_size
    pool_timeout=30,          # Seconds to wait before raising TimeoutError if pool is empty
    pool_recycle=1800,        # Recycle connections older than 30 minutes to prevent stale sockets
    pool_pre_ping=True        # Ping database before executing query to verify connection health
)
```

### 3.2 Node-Postgres connection pool config (JavaScript)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'db_user',
  password: 'db_pass',
  database: 'main_db',
  port: 5432,
  max: 20,                   // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,  // Close connections idle for more than 30 seconds
  connectionTimeoutMillis: 2000, // Return an error if a connection takes longer than 2 seconds
});
```
