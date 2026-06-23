#!/bin/sh
# Shell setup wrapper for Linux, macOS, and Git Bash.

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but was not found."
  echo "Please install Node.js (version 18 or higher) and try again."
  exit 1
fi

node scripts/setup.js "$@"
exit $?
