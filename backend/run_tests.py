import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def run_backend_tests():
    """Run all backend unittest suites and return success status and metrics."""
    print("=" * 70)
    print("RUNNING BACKEND TEST SUITE (FastAPI / Google Gemini Service)")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(backend_dir / "tests"), pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    passed = total - failures - errors

    print("-" * 70)
    print(f"Backend Test Summary: {passed}/{total} Passed | {failures} Failures | {errors} Errors")
    print("-" * 70)

    return result.wasSuccessful(), passed, total, failures, errors

if __name__ == "__main__":
    success, passed, total, failures, errors = run_backend_tests()
    sys.exit(0 if success else 1)
