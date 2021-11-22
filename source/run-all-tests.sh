#!/bin/bash
#
# This script runs all unit tests for FWoA deployment package
#
# This script is called by the buildspec.yml file during pre_build phase. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

[ "$DEBUG" == 'true' ] && set -x
set -e

prepare_jest_coverage_report() {
	local component_name=$1

  if [ ! -d "coverage" ]; then
      echo "ValidationError: Missing required directory coverage after running unit tests"
      exit 129
  fi

	# prepare coverage reports
  rm -fr coverage/lcov-report
  mkdir -p $coverage_reports_top_path/jest
  coverage_report_path=$coverage_reports_top_path/jest/$component_name
  rm -fr $coverage_report_path
  mv coverage $coverage_report_path
}

run_javascript_test() {
  local component_path=$1
  local component_name=$2

  echo "------------------------------------------------------------------------------"
  echo "[Test] Run javascript unit test with coverage for $component_path $component_name"
  echo "------------------------------------------------------------------------------"
  echo "cd $component_path"
  cd $component_path

  # install and build for unit testing
  yarn install

  # run unit tests
  yarn test

  # prepare coverage reports
  prepare_jest_coverage_report $component_name
}

# Run unit tests
echo "Running unit tests"

# Get reference for source folder
source_dir="$(pwd -P)"
coverage_reports_top_path=$source_dir/test/coverage-reports

# Test the IGCompiler and auditLogMover
run_javascript_test $source_dir IGCompiler
run_javascript_test $source_dir/auditLogMover auditLogMover

# Return to the source/ level
cd $source_dir