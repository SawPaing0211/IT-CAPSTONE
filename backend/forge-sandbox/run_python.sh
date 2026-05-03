#!/bin/sh
# Redirect input.txt into the python script if it exists
if [ -f /tmp/sandbox/input.txt ]; then
    exec python -u "$1" < /tmp/sandbox/input.txt
else
    exec python -u "$1"
fi