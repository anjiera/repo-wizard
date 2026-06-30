const { archiveSession } = require('../scripts/reports-archive');
try {
  // We use the current directory but the function shouldn't crash on null options
  archiveSession(process.cwd(), null);
  console.log("TEST PASSED: archiveSession handled null options successfully");
  process.exit(0);
} catch (e) {
  console.error("TEST FAILED: archiveSession crashed with null options:", e.message);
  process.exit(1);
}
