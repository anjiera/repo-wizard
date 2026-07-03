'use strict';

function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r' || char === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') {
          rows.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        field += char;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseCSVToObjects(content) {
  const rows = parseCSV(content);
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  const parsedRows = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length > 0) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] !== undefined ? values[j].trim() : '';
      }
      parsedRows.push(row);
    }
  }
  return parsedRows;
}

module.exports = {
  parseCSV,
  parseCSVToObjects
};
