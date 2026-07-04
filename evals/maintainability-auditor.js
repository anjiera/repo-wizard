'use strict';

const path = require('path');

module.exports = {
  agent: 'maintainability-auditor',
  personaFile: path.join(__dirname, '..', 'agents', 'maintainability-auditor.md'),
  testCases: [
    {
      name: 'Personal Hobbyist Scan Profile',
      input: 'Perform a maintainability audit for a project with project_goal = "personal". Here is the target file src/helper.js (600 lines long):\n' +
             'function calculateAll(data) {\n' +
             '  if (data) {\n' +
             '    for (let i = 0; i < data.length; i++) {\n' +
             '      if (data[i].active) {\n' +
             '        for (let j = 0; j < data[i].items.length; j++) {\n' +
             '          console.log(data[i].items[j]);\n' +
             '        }\n' +
             '      }\n' +
             '    }\n' +
             '  }\n' +
             '}',
      rubrics: [
        'The response flags the file length exceeding 500 lines as File Bloat.',
        'The response notices the 4-level deep nesting / branching complexity in calculateAll.',
        'The response does NOT suggest complex Fowler smells like Primitive Obsession, Feature Envy, or Shotgun Surgery.',
        'The response suggests simple improvements like Guard Clauses or extracting a helper function.'
      ]
    },
    {
      name: 'Enterprise Grade Scan Profile',
      input: 'Perform a maintainability audit for a project with project_goal = "enterprise". Here is a module customer.js:\n' +
             'function printDetails(name, age, email, address, phone, zip, country) {\n' +
             '  console.log(name, age, email, address, phone, zip, country);\n' +
             '}\n' +
             'class Customer {\n' +
             '  constructor(data) { this.data = data; }\n' +
             '  process() {\n' +
             '    return this.data.profile.history.transactions.filter(t => t.active).map(t => t.amount);\n' +
             '  }\n' +
             '}',
      rubrics: [
        'The response identifies Fowler code smells such as Long Parameter List or Primitive Obsession.',
        'The response identifies Feature Envy or message chains in the Customer.process access pattern.',
        'The response recommends specific Fowler refactorings like Introduce Parameter Object or Move Method.'
      ]
    }
  ]
};
