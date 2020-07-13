#!/usr/bin/env python3

import re
import subprocess
import sys

max_iterations = 100
for i in range(0, max_iterations):
    print(f"Running test iteration {i+1} of {max_iterations}")

    try:
        stdout = None
        proc = subprocess.run(
            "node_modules/.bin/gulp test",
            shell=True,
            stdout=subprocess.PIPE,
            check=True,
        )
        stdout = proc.stdout.decode()

        tests_run_match = re.search("TOTAL: ([0-9]+) SUCCESS", stdout)

        if not tests_run_match:
            print(f"Tests failed on run {i}")
            print(stdout)

        expected_tests = 2439
        tests_run = int(tests_run_match.group(1))
        if tests_run < expected_tests:
            print(f"Only ran {tests_run} instead of {expected_tests}")
            print(stdout)

    except Exception as ex:
        print("Test process failed", ex)
        print(stdout)
        continue
