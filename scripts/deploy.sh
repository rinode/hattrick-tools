#!/usr/bin/env bash
# Push to origin/main (or a given branch), which triggers the CD auto-deploy.
#
# Why a script: the push runs over HTTPS and needs a GitHub token. The token is
# read at run time from a file kept OUTSIDE the repo, so it is never committed
# and never appears in git history or the command line.
#
# One-time setup:
#   1. Create a fine-grained GitHub Personal Access Token with
#      "Contents: Read and write" on rinode/hattrick-tools.
#   2. Save the token string (nothing else) to one of these, first match wins:
#        $HT_DEPLOY_TOKEN_FILE
#        ~/mnt/Git/.hattrick-deploy-token      # from the Cowork Linux VM
#        <repo>/../.hattrick-deploy-token      # i.e. /Users/x59573/Git/.hattrick-deploy-token
#        ~/.hattrick-deploy-token
#      or export the token as $HT_DEPLOY_TOKEN.
#   3. chmod 600 that file. It is git-ignored defensively; keeping it outside the
#      repo is what guarantees it is never committed.
#
# Usage: scripts/deploy.sh [branch]   (branch defaults to main)
set -euo pipefail

BRANCH="${1:-main}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

token=""
if [ -n "${HT_DEPLOY_TOKEN:-}" ]; then
  token="$HT_DEPLOY_TOKEN"
else
  for f in "${HT_DEPLOY_TOKEN_FILE:-}" \
           "$HOME/mnt/Git/.hattrick-deploy-token" \
           "$REPO_DIR/../.hattrick-deploy-token" \
           "$HOME/.hattrick-deploy-token"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      token="$(tr -d '[:space:]' < "$f")"
      break
    fi
  done
fi

if [ -z "$token" ]; then
  echo "deploy: no GitHub token found." >&2
  echo "Save a fine-grained PAT (Contents: read/write) to one of the paths in" >&2
  echo "this script's header, or set HT_DEPLOY_TOKEN. See the comment block." >&2
  exit 1
fi

ahead="$(git rev-list --count "origin/$BRANCH..$BRANCH" 2>/dev/null || echo "?")"
echo "deploy: pushing $BRANCH to origin ($ahead commit(s) ahead of origin/$BRANCH):"
git log --oneline "origin/$BRANCH..$BRANCH" 2>/dev/null || true

# The token is passed only through the credential helper's environment, so it
# never lands in the remote URL, git config, or the process argument list.
GIT_DEPLOY_TOKEN="$token" git \
  -c credential."https://github.com".helper='!f() { echo username=x-access-token; echo "password=$GIT_DEPLOY_TOKEN"; }; f' \
  push origin "$BRANCH"

echo "deploy: done."
