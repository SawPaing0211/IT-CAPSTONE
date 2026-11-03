#!/bin/bash
source $HOME/sbxvenv/bin/activate; cd $HOME/demo-run
rm -rf uploads
FORGE_DEMO=1 FORGE_DEMO_RUNNER=1 DATABASE_URL=sqlite:///$HOME/demo-run/forge_demo.db HEAD_ADMIN_EMAIL=demo.admin@forge-demo.example python $HOME/mnt/forge-dev/backend/seed_demo.py 2>&1 | grep "DEMO SEED\|seed failed\|Traceback\|Error"
