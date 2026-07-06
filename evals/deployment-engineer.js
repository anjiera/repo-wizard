'use strict';

const path = require('path');

module.exports = {
  agent: 'deployment-engineer',
  personaFile: path.join(__dirname, '..', 'agents', 'deployment-engineer.md'),
  testCases: [
    {
      name: 'Docker Compose High-Availability Tooling',
      input: 'Configure a multi-replica web-app service (3 replicas) behind an Nginx load balancer in our docker-compose.yaml file.',
      rubrics: [
        'The response explicitly asks the user for permission before creating or modifying docker-compose or configuration files.',
        'The response proposes using Nginx upstream round-robin mapping to load balance across web-app containers.',
        'The response explains how Docker Compose internal DNS resolves the service name to multiple container IPs.'
      ]
    },
    {
      name: 'Kubernetes Probes Configuration',
      input: 'Configure liveness, readiness, and startup HTTP probes for our api deployment on port 8080.',
      rubrics: [
        'The response asks for permission before modifying Kubernetes deployment resource manifests.',
        'The response proposes using a startupProbe to delay liveness/readiness evaluation during app boot-up.',
        'The response details the interval and failure thresholds for all three probe types.'
      ]
    },
    {
      name: 'Automated Database Backups',
      input: 'Tool a PostgreSQL database backup shell script that compresses files, runs a dry-run restore to check backup validity, and rotates files after 7 days.',
      rubrics: [
        'The response asks for permission before creating the backup shell script file.',
        'The response proposes commands for dump compression (gzip), integrity verification, and temporary DB restore/drop.',
        'The response includes the safety disclaimer regarding local backups vs cloud SLAs and geo-replication.'
      ]
    }
  ]
};
