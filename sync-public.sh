#!/bin/bash
set -euo pipefail

# Run from repo root to ensure consistent paths
cd "$(dirname "$0")"

# Ensure remotes exist (origin = private repo, public = public mirror)
if ! git remote | grep -q '^origin$'; then
  echo "Missing 'origin' remote (private repo)." >&2
  exit 1
fi
if ! git remote | grep -q '^public$'; then
  echo "Adding missing 'public' remote (public repo)..." >&2
  git remote add public git@github.com:jefhild/NuxtChat.git
fi

# Fetch latest from both remotes
git fetch origin
git fetch public || { echo "Fetch failed for 'public' remote" >&2; exit 1; }

# Ensure local public branch exists and tracks public/main
if git show-ref --quiet --verify refs/heads/public; then
  git checkout public
  git reset --hard public/main
else
  git fetch public public:public
  git checkout public
fi

# Sync main with private remote and merge in public
git checkout main
git reset --hard origin/main
git merge --ff-only public || git merge --no-edit public
git push origin main
