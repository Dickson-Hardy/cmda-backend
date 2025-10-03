#!/bin/bash
# Run the script and save output to a log file

echo "Running fix-conference-dates.js script..."
node scripts/fix-conference-dates.js > conference-fix.log 2>&1

echo "Script completed. Output saved to conference-fix.log"
echo "Opening log file..."

# Open the log file with the default text editor (on Windows)
start conference-fix.log
