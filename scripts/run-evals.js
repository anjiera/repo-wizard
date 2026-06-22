#!/usr/bin/env node
/**
 * run-evals.js
 *
 * Runs dynamic LLM-as-a-Judge evaluations for the agents configured in the repository.
 *
 * Requirements:
 *   - GEMINI_API_KEY environment variable must be set.
 *   - Runs on Node.js 18+ (uses native fetch, zero npm dependencies).
 *
 * Usage:
 *   $env:GEMINI_API_KEY="your-api-key"
 *   node scripts/run-evals.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

const EVALS_DIR = path.join(__dirname, '..', 'evals');

function loadTestSuite() {
  if (!fs.existsSync(EVALS_DIR)) {
    console.error(`ERROR: evals directory not found at ${EVALS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(EVALS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  const suite = [];
  for (const file of files) {
    try {
      const suiteModule = require(path.join(EVALS_DIR, file));
      suite.push(suiteModule);
    } catch (err) {
      console.error(`ERROR: Failed to load evaluation suite from ${file}: ${err.message}`);
      process.exit(1);
    }
  }
  return suite;
}

const TEST_SUITE = loadTestSuite();


async function callGemini(systemInstruction, userContent, responseSchema = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  
  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      parts: [{ text: userContent }]
    }],
    generationConfig: {
      temperature: 0.0 // keep it deterministic
    }
  };

  if (responseSchema) {
    payload.generationConfig.responseMimeType = 'application/json';
    payload.generationConfig.responseSchema = responseSchema;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API call failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API returned no candidates');
  }

  return data.candidates[0].content.parts[0].text;
}

async function runJudge(inputPrompt, agentOutput, rubrics) {
  const systemInstruction = 'You are an objective AI evaluation judge. Your task is to evaluate an AI agent\'s response to a user prompt against a specific list of rubrics. You must output a JSON object indicating whether the output passed each rubric and a brief explanation why.';
  
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      passed: { type: 'BOOLEAN' },
      rubrics: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            rubric: { type: 'STRING' },
            passed: { type: 'BOOLEAN' },
            explanation: { type: 'STRING' }
          },
          required: ['rubric', 'passed', 'explanation']
        }
      }
    },
    required: ['passed', 'rubrics']
  };

  const userContent = `
[User Prompt]
${inputPrompt}

[Agent Response]
${agentOutput}

[Rubrics to Verify]
${rubrics.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Evaluate each rubric carefully. Set "passed" to true only if all rubrics pass. Return your evaluation as JSON.
`;

  const judgeResult = await callGemini(systemInstruction, userContent, responseSchema);
  return JSON.parse(judgeResult);
}

async function run() {
  if (!API_KEY) {
    console.warn('========================================================================');
    console.warn('WARNING: GEMINI_API_KEY environment variable is not set.');
    console.warn('Dynamic LLM-as-a-Judge evaluations cannot be run.');
    console.warn('To run evaluations, set the key:');
    console.warn('  $env:GEMINI_API_KEY="your-api-key"');
    console.warn('========================================================================');
    process.exit(0);
  }

  console.log(`Starting dynamic LLM-as-a-Judge evaluation using model: ${MODEL_NAME}\n`);

  let totalCases = 0;
  let passedCases = 0;

  for (const suite of TEST_SUITE) {
    console.log(`=========================================`);
    console.log(`Agent under test: ${suite.agent}`);
    console.log(`=========================================`);

    let personaContent;
    try {
      personaContent = fs.readFileSync(suite.personaFile, 'utf8');
    } catch (err) {
      console.error(`  ✗ Failed to read persona file ${suite.personaFile}: ${err.message}`);
      continue;
    }

    for (const testCase of suite.testCases) {
      totalCases++;
      console.log(`\nTest Case: ${testCase.name}`);
      console.log(`  Prompt: "${testCase.input.substring(0, 80)}${testCase.input.length > 80 ? '...' : ''}"`);
      
      try {
        process.stdout.write('  → Running Agent...');
        const agentOutput = await callGemini(personaContent, testCase.input);
        
        process.stdout.write('\r  → Running Judge...');
        const evaluation = await runJudge(testCase.input, agentOutput, testCase.rubrics);
        
        process.stdout.write('\r'); // Clear line

        if (evaluation.passed) {
          passedCases++;
          console.log(`  ✓ Passed`);
        } else {
          console.log(`  ✗ Failed`);
        }

        for (const r of evaluation.rubrics) {
          const status = r.passed ? '  ✓' : '  ✗';
          console.log(`    ${status} Rubric: "${r.rubric}"`);
          console.log(`      Reason: ${r.explanation}`);
        }
      } catch (err) {
        process.stdout.write('\r'); // Clear line
        console.error(`  ✗ Error running test: ${err.message}`);
      }
    }
    console.log();
  }

  console.log(`Evaluation complete: ${passedCases} / ${totalCases} test cases passed.`);
  if (passedCases < totalCases) {
    process.exit(1);
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error(`Unexpected runner failure: ${err.message}`);
    process.exit(1);
  });
} else {
  module.exports = { TEST_SUITE };
}
