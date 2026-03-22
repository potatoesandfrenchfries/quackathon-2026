#!/usr/bin/env python3
"""
Run all project tests (backend pytest + frontend vitest).

Usage:
    python run_tests.py               # run both suites, exit 1 on failure
    python run_tests.py --backend     # backend only
    python run_tests.py --frontend    # frontend only
    python run_tests.py --warn-only   # always exit 0, print failures as warnings

Exit code: 0 if all selected suites pass (or --warn-only), 1 if any fail.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND  = ROOT / "backend"
FRONTEND = ROOT / "frontend"

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def run_suite(label: str, cmd: list[str], cwd: Path) -> bool:
    divider = "─" * 60
    print(f"\n{BOLD}{divider}{RESET}")
    print(f"{BOLD}  {label}{RESET}")
    print(f"{BOLD}{divider}{RESET}\n")
    result = subprocess.run(cmd, cwd=cwd)
    return result.returncode == 0


def main() -> None:
    args      = sys.argv[1:]
    warn_only = "--warn-only" in args
    run_backend  = "--frontend" not in args
    run_frontend = "--backend"  not in args

    results: dict[str, bool] = {}

    if run_backend:
        results["Backend  (pytest)"] = run_suite(
            "Backend — pytest",
            [sys.executable, "-m", "pytest", "-v", "--tb=short"],
            BACKEND,
        )

    if run_frontend:
        results["Frontend (vitest)"] = run_suite(
            "Frontend — vitest",
            ["npm", "test"],
            FRONTEND,
        )

    # ── Summary ──────────────────────────────────────────────────────────────
    divider = "═" * 60
    print(f"\n{BOLD}{divider}{RESET}")
    print(f"{BOLD}  RESULTS{RESET}")
    print(f"{BOLD}{divider}{RESET}")

    failures: list[str] = []
    for name, passed in results.items():
        if passed:
            print(f"  {GREEN}✅  {name}{RESET}")
        elif warn_only:
            print(f"  {YELLOW}⚠️   {name} — tests failed (warn-only){RESET}")
            failures.append(name)
        else:
            print(f"  {RED}❌  {name}{RESET}")
            failures.append(name)

    print(f"{BOLD}{divider}{RESET}\n")

    if failures and warn_only:
        print(f"{YELLOW}{BOLD}⚠️  Warning: failing suites: {', '.join(failures)}{RESET}\n")
        sys.exit(0)

    sys.exit(0 if not failures else 1)


if __name__ == "__main__":
    main()
