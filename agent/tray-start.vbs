Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\agent && npm run tray", 0
