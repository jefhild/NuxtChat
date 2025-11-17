#!/bin/bash
set -euo pipefail

# Run from repo root to ensure consistent paths
cd "$(dirname "$0")"

# Ensure both branches are clean and up to date before merging
git fetch origin
git fetch public

git checkout main
git reset --hard origin/main

git checkout public
git reset --hard public/main

git checkout main
git merge --ff-only public || git merge --no-edit public
git push origin main
