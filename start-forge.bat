@echo off
REM Double-click this file to start Forge.Dev (backend + frontend + both tunnels).
REM It just runs the real script (start-forge.ps1) with the execution-policy
REM restriction bypassed for this one run only -- it does not change any
REM system-wide PowerShell settings.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-forge.ps1"
pause
