#!/bin/bash
# DEMO build: the project's frontend src as-is (editor is bundled locally now), API pointed at the local demo backend.
# Only addition: expose window.monaco so the capture scripts can type code. Project files are not modified.
set -e
cd $HOME/fe-build
rsync -a --delete $HOME/mnt/forge-dev/frontend/src/ src/
rsync -a $HOME/mnt/forge-dev/frontend/public/ public/
cp $HOME/mnt/forge-dev/frontend/package.json .
echo "window.monaco = monaco" >> src/monacoSetup.js
VITE_API_URL=http://127.0.0.1:5055 npx vite build 2>&1 | grep -i "error\|built in"
