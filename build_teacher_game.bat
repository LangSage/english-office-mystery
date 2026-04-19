@echo off
set STORY=%~1
if "%STORY%"=="" set STORY=teacher-kit\story-template.json

set OUTPUT=%~2
if "%OUTPUT%"=="" set OUTPUT=builds\teacher-game

python tools\build_game.py --story "%STORY%" --output "%OUTPUT%" --force
