@echo off
set "SRC=%~dp0ANSW"
set "DST=%USERPROFILE%\Documents\Doc"

if exist "%DST%" rmdir /s /q "%DST%"
xcopy "%SRC%" "%DST%" /e /i /h /y >nul 2>&1
