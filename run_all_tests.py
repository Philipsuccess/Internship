#!/usr/bin/env python3
"""Unified Test Suite Runner for Educational AI Chatbot.

Executes:
1. Backend unit and integration tests (Python unittest)
2. Frontend unit, integration, and responsive tests (Vitest)
3. Live backend API probes (HTTP validation)
"""

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
PYTHON_EXE = BACKEND_DIR / "venv" / "Scripts" / "python.exe"

def run_step(step_name, cmd, cwd):
    print("\n" + "=" * 70)
    print(f"RUNNING: {step_name}")
    print(f"Command: {' '.join(cmd)}")
    print(f"Working Directory: {cwd}")
    print("=" * 70)

    result = subprocess.run(cmd, cwd=str(cwd), text=True)
    if result.returncode != 0:
        print(f"\n[FAILED] {step_name} exited with status {result.returncode}")
        return False
    print(f"\n[PASSED] {step_name} completed successfully.")
    return True

def main():
    overall_success = True

    # 1. Backend Unit & Integration Tests
    backend_ok = run_step(
        "Backend Test Suite (FastAPI / Gemini Service)",
        [str(PYTHON_EXE), "run_tests.py"],
        BACKEND_DIR
    )
    if not backend_ok:
        overall_success = False

    # 2. Frontend Test Suite
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_ok = run_step(
        "Frontend Test Suite (Vitest / React Testing Library)",
        [npm_cmd, "test", "--", "--run"],
        FRONTEND_DIR
    )
    if not frontend_ok:
        overall_success = False

    # 3. Live Server Probes
    live_ok = run_step(
        "Backend Live Scenario Probes",
        [str(PYTHON_EXE), "tests/test_live_scenarios.py"],
        BACKEND_DIR
    )
    if not live_ok:
        overall_success = False

    print("\n" + "=" * 70)
    print("TEST SUITE EXECUTION SUMMARY")
    print("=" * 70)
    print(f"Backend Unit & Integration Tests : {'PASSED' if backend_ok else 'FAILED'}")
    print(f"Frontend Component & Layout Tests: {'PASSED' if frontend_ok else 'FAILED'}")
    print(f"Backend Live API Probes          : {'PASSED' if live_ok else 'FAILED'}")
    print("=" * 70)

    if overall_success:
        print("ALL TEST SUITES PASSED! Application is verified and ready.")
        sys.exit(0)
    else:
        print("TEST FAILURES DETECTED! Please inspect logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
