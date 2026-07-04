'use strict';

const path = require('path');

module.exports = {
  agent: 'database-lifecycle-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'database-lifecycle-auditor.md'),
  testCases: [
    {
      name: 'SQL Database Lock Audit',
      input: 'Audit this PostgreSQL migration file migrations/001_add_column.sql:\n' +
             '-- Adding standard email index\n' +
             'CREATE INDEX idx_users_email ON users(email);\n' +
             '-- Adding default status column\n' +
             'ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT "active" NOT NULL;',
      rubrics: [
        'The response identifies the table-locking risk of adding a column with a default value.',
        'The response identifies the locking risk of standard CREATE INDEX and recommends CREATE INDEX CONCURRENTLY.',
        'The response suggests a three-step pattern for safe column additions or validation workflows.'
      ]
    },
    {
      name: 'Serverless RLS and Security Audit',
      input: 'Audit this Supabase configuration and setup code src/db.js:\n' +
             'import { createClient } from "@supabase/supabase-js";\n' +
             '// Client initialization using service role key to bypass all restrictions\n' +
             'const supabase = createClient("https://xyz.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);',
      rubrics: [
        'The response identifies the risk of initializing the client with the service role key in user-facing code.',
        'The response explains that the service role key bypasses Row-Level Security (RLS) policies.',
        'The response recommends using the standard anon key or limiting the service role to secure backend environments.'
      ]
    },
    {
      name: 'Redis Event Loop Blocking Audit',
      input: 'Audit this Redis cache querying code src/cache.js:\n' +
             'const Redis = require("ioredis");\n' +
             'const redis = new Redis();\n' +
             'async function clearAllUserCache() {\n' +
             '  const keys = await redis.keys("user:*");\n' +
             '  for (const key of keys) {\n' +
             '    await redis.del(key);\n' +
             '  }\n' +
             '}',
      rubrics: [
        'The response identifies that redis.keys is a blocking operation.',
        'The response explains that blocking commands degrade event loop responsiveness in Redis.',
        'The response recommends using SCAN instead of KEYS for non-blocking iteration.'
      ]
    }
  ]
};
