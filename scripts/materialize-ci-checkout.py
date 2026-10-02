"""Materialize every tracked file without one enormous screenshot fetch."""

from pathlib import Path
import subprocess


def git(*args, **kwargs):
    return subprocess.run(["git", *args], check=True, **kwargs)


paths = git("ls-files", "-z", capture_output=True).stdout.decode().split("\0")[:-1]
images = [path for path in paths if path.startswith("tests/e2e/") and path.endswith(".png")]
batch_size = 32
for offset in range(0, len(images), batch_size):
    batch = images[offset:offset + batch_size]
    print(f"Materializing screenshots {offset + 1}–{offset + len(batch)} of {len(images)}", flush=True)
    git("sparse-checkout", "add", "--stdin", input="".join(f"/{path}\n" for path in batch).encode())

# Restore normal checkout semantics, including both platform baselines and all
# story documents. Missing files fail setup rather than silently reducing checks.
git("sparse-checkout", "disable")
missing = [path for path in paths if not Path(path).exists()]
if missing:
    raise SystemExit(f"Incomplete checkout: {missing}")
print(f"Complete checkout: {len(paths)} tracked files", flush=True)
