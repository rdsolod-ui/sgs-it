#!/usr/bin/env bash
# Run locally after a successful GitHub Actions workflow. No secrets in arguments.
set -euo pipefail
repo=rdsolod-ui/sgs-it
sha="${1:?Usage: deploy/from-github.sh COMMIT_SHA SSH_TARGET}"
target="${2:?SSH alias is required}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected full commit SHA'; exit 1; }
run=$(gh run list --repo "$repo" --workflow verify.yml --commit "$sha" --status success --json databaseId --jq '.[0].databaseId')
test -n "$run" && test "$run" != null
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
gh run download "$run" --repo "$repo" --name "sgsit-$sha" --dir "$work"
# Reject archive traversal before sending the trusted CI artifact.
python3 - "$work/release.tar.gz" "$sha" <<'PY'
import tarfile,json,sys,pathlib
with tarfile.open(sys.argv[1]) as t:
 for m in t.getmembers():
  p=pathlib.PurePosixPath(m.name)
  assert not p.is_absolute() and '..' not in p.parts and m.isfile(),m.name
 assert json.load(t.extractfile('RELEASE.json'))['commit']==sys.argv[2]
PY
release="/srv/sgsit/releases/git-$sha"
ssh "$target" "mkdir -p '$release'"
scp "$work/release.tar.gz" "$target:$release/release.tar.gz"
ssh "$target" "tar -xzf '$release/release.tar.gz' -C '$release' && bash '$release/deploy/bootstrap.sh' '$release'"
echo "Deployed $repo@$sha from successful Actions run $run"
