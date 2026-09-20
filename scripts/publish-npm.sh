#!/usr/bin/env bash
set -euo pipefail

registry="${NPM_REGISTRY:-https://registry.npmjs.org/}"

npm test
npm run check

if [[ "${1:-}" == "--dry-run" ]]; then
  shift
  npm publish --dry-run --access public --registry "$registry" "$@"
  exit 0
fi

npm publish --access public --registry "$registry" "$@"
