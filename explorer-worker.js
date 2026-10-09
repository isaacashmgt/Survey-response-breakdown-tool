'use strict';
importScripts('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');

self.onmessage = event => {
  try {
    const workbook = XLSX.read(event.data.buffer, { type: 'array', cellDates: false });
    const names = ['Educator Clean', 'Family - Family Level', 'Family - Child Level', 'Student Clean', 'Site Level', 'Grantee Level', 'Data Dictionary', 'Refresh Status'];
    const tables = {};
    for (const name of names) {
      if (!workbook.Sheets[name]) continue;
      self.postMessage({ type: 'progress', message: `Reading ${name}…` });
      tables[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false });
    }
    self.postMessage({ type: 'success', tables });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'The workbook could not be read.' });
  }
};
