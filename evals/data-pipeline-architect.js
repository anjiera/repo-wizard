'use strict';

const path = require('path');

module.exports = {
  agent: 'data-pipeline-architect',
  personaFile: path.join(__dirname, '..', 'agents', 'data-pipeline-architect.md'),
  testCases: [
    {
      name: 'Pandera Schema Validation',
      input: 'Configure a Python Pandera schema to validate an ingested DataFrame containing user sync logs.',
      rubrics: [
        'The response explicitly asks the user for permission before creating schema code or installing packages.',
        'The response proposes a Pandera DataFrameSchema specifying column types, matches checks, and null values.',
        'The response explains how schema errors are handled to prevent silent data corruption.'
      ]
    },
    {
      name: 'Airflow DAG Orchestration',
      input: 'Create an Apache Airflow DAG in Python scheduled daily to run a user profile sync task with exponential retries.',
      rubrics: [
        'The response asks for permission before creating DAG configuration files.',
        'The response proposes configuring default_args with retry parameters (limit, delay, exponential backoff).',
        'The response details the PythonOperator setup and alerting options.'
      ]
    },
    {
      name: 'SQLAlchemy Connection Pooling',
      input: 'Configure a SQLAlchemy database engine pool with a pool size of 10, max overflow of 5, and connection pre-ping enabled.',
      rubrics: [
        'The response asks for permission before creating or modifying database connection engine setups.',
        'The response proposes engine parameters setting pool_size to 10 and max_overflow to 5.',
        'The response includes the safety disclaimer regarding local configs vs cloud backups and server SLAs.'
      ]
    }
  ]
};
