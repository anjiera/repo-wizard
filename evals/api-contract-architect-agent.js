'use strict';

const path = require('path');

module.exports = {
  agent: 'api-contract-architect-agent',
  personaFile: path.join(__dirname, '..', 'agents', 'api-contract-architect-agent.md'),
  testCases: [
    {
      name: 'OpenAPI Schema & Spectral Linter Setup',
      input: 'Configure a REST API specification openapi.yaml for a User profile route and set up a Spectral ruleset to lint it.',
      rubrics: [
        'The response explicitly asks the user for permission before creating or modifying spec or linter config files.',
        'The response proposes a Spectral ruleset config (.spectral.yaml) extending oas:recommended.',
        'The response explains how the OpenAPI schema checks parameter casing and requires operationId fields.'
      ]
    },
    {
      name: 'gRPC Protobuf & Buf Linter Integration',
      input: 'Create a gRPC service user_profile.proto using proto3 syntax and set up a buf.yaml configuration to check rules and compatibility.',
      rubrics: [
        'The response asks for permission before creating proto or buf configuration files.',
        'The response proposes using syntax = "proto3" with package namespaces and service definitions.',
        'The response details buf.yaml settings specifying lint rules and breaking compatibility groups.'
      ]
    },
    {
      name: 'GraphQL SDL and Inspector Verification',
      input: 'Set up a schema.graphql file for User profile queries and mutations, and create a script using GraphQL Inspector to catch breaking changes.',
      rubrics: [
        'The response asks for permission before creating schema or verification files.',
        'The response proposes a GraphQL SDL file defining Query, Mutation, and Input structures.',
        'The response details a validation script using @graphql-inspector/core diff function that exits with 1 on breaking changes.'
      ]
    }
  ]
};
