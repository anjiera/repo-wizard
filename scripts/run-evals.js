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
const readline = require('readline');

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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, ans => {
      rl.close();
      resolve(ans);
    });
  });
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

  if (process.stdin.isTTY && !process.env.CI && !process.env.NON_INTERACTIVE) {
    console.warn('========================================================================');
    console.warn('WARNING: Running dynamic LLM evaluations makes live API calls to external');
    console.warn('services. This will consume tokens and may incur API usage costs.');
    console.warn('========================================================================');
    const answer = await askQuestion('Do you want to proceed? (y/N): ');
    if (answer.trim().toLowerCase() !== 'y' && answer.trim().toLowerCase() !== 'yes') {
      console.log('Skipping dynamic LLM evaluations.');
      process.exit(0);
    }
  }

  console.log(`Starting dynamic LLM-as-a-Judge evaluation using model: ${MODEL_NAME}\n`);

  let totalCases = 0;
  let passedCases = 0;
  let totalRubricsCount = 0;
  let passedRubricsCount = 0;
  
  let reportMarkdown = `# Agent Evaluation Results (Snapshot)

- **Model**: \`${MODEL_NAME}\`

`;

  for (const suite of TEST_SUITE) {
    console.log(`=========================================`);
    console.log(`Agent under test: ${suite.agent}`);
    console.log(`=========================================`);

    reportMarkdown += `## Suite: ${suite.agent}\n\n`;

    let personaContent;
    try {
      personaContent = fs.readFileSync(suite.personaFile, 'utf8');
    } catch (err) {
      console.error(`  ✗ Failed to read persona file ${suite.personaFile}: ${err.message}`);
      reportMarkdown += `*Failed to read persona file: ${err.message}*\n\n`;
      continue;
    }

    for (const testCase of suite.testCases) {
      totalCases++;
      console.log(`\nTest Case: ${testCase.name}`);
      console.log(`  Prompt: "${testCase.input.substring(0, 80)}${testCase.input.length > 80 ? '...' : ''}"`);
      
      reportMarkdown += `### Test Case: ${testCase.name}\n`;
      reportMarkdown += `- **Prompt**: \`${testCase.input}\`\n`;

      try {
        process.stdout.write('  → Running Agent...');
        const agentOutput = await callGemini(personaContent, testCase.input);
        
        process.stdout.write('\r  → Running Judge...');
        const evaluation = await runJudge(testCase.input, agentOutput, testCase.rubrics);
        
        process.stdout.write('\r'); // Clear line

        const totalRubrics = evaluation.rubrics.length;
        const passedRubrics = evaluation.rubrics.filter(r => r.passed).length;
        totalRubricsCount += totalRubrics;
        passedRubricsCount += passedRubrics;

        if (evaluation.passed) {
          passedCases++;
          console.log(`  ✓ Passed`);
          reportMarkdown += `- **Verdict**: ✓ Passed (${passedRubrics} / ${totalRubrics} rubrics)\n\n`;
        } else {
          console.log(`  ✗ Failed`);
          reportMarkdown += `- **Verdict**: ✗ Failed (${passedRubrics} / ${totalRubrics} rubrics)\n\n`;
        }

        reportMarkdown += `| Status | Rubric | Explanation |\n`;
        reportMarkdown += `| :---: | :--- | :--- |\n`;

        for (const r of evaluation.rubrics) {
          const status = r.passed ? '  ✓' : '  ✗';
          const mdStatus = r.passed ? '✓' : '✗';
          console.log(`    ${status} Rubric: "${r.rubric}"`);
          console.log(`      Reason: ${r.explanation}`);
          
          reportMarkdown += `| ${mdStatus} | ${r.rubric} | ${r.explanation} |\n`;
        }
        reportMarkdown += `\n`;
      } catch (err) {
        process.stdout.write('\r'); // Clear line
        console.error(`  ✗ Error running test: ${err.message}`);
        reportMarkdown += `- **Verdict**: ✗ Error (${err.message})\n\n`;
      }
    }
    console.log();
  }

  const consistencyScore = totalRubricsCount > 0 ? ((passedRubricsCount / totalRubricsCount) * 100).toFixed(1) : '100.0';
  
  console.log(`Evaluation complete: ${passedCases} / ${totalCases} test cases passed.`);
  console.log(`Overall Agent Consistency Score: ${consistencyScore}% (${passedRubricsCount} / ${totalRubricsCount} rubrics passed)\n`);

  // Prepend summary details to report
  const summaryHeader = `- **Overall Consistency Score**: **${consistencyScore}%** (${passedRubricsCount} / ${totalRubricsCount} rubrics passed)
- **Test Cases Passed**: ${passedCases} / ${totalCases}

---

`;
  reportMarkdown = reportMarkdown.replace('## Suite:', summaryHeader + '## Suite:');

  // Write report artifact
  try {
    const reportsDir = path.join(EVALS_DIR, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, 'latest-results.md');
    fs.writeFileSync(reportPath, reportMarkdown, 'utf8');
    console.log(`✓ Saved evaluation report snapshot to evals/reports/latest-results.md`);
  } catch (err) {
    console.error(`Warning: Failed to save report snapshot: ${err.message}`);
  }

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
