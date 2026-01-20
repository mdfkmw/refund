const { app, Tray, Menu } = require("electron");
const { exec } = require("child_process");
const path = require("path");

const { execSync } = require("child_process");
const run = (cmd) => exec(`cmd /c start cmd.exe /k "${cmd}"`);
const runPS = (ps) => exec(`cmd /c start powershell -NoExit -Command "${ps}"`);
const editEnv = () => exec('cmd /c start notepad "C:\\agent\\agent\\.env"');


function getStatus(name) {
  try {
    const out = execSync('pm2 jlist', { stdio: ["ignore", "pipe", "ignore"] }).toString();
    const list = JSON.parse(out || "[]");
    const p = list.find(x => x.name === name);
    return p?.pm2_env?.status || "stopped";
  } catch (e) {
    return "unknown";
  }
}



let tray = null;

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, "icon.png"));

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: `Agent: ${getStatus("agent")}` },
      { label: `Case: ${getStatus("case")}` },
      { label: `POS: ${getStatus("pos")}` },
      { type: "separator" },
      {
        label: "Restart ALL",
        click: () => {
          exec("pm2 restart all");
          setTimeout(() => tray.setContextMenu(buildMenu()), 500);
        }
      },
      {
        label: "Stop ALL",
        click: () => {
          exec("pm2 stop all");
          setTimeout(() => tray.setContextMenu(buildMenu()), 500);
        }
      },
{ type: "separator" },
{
  label: "Edit AGENT .env",
  click: () => editEnv()
},
{
  label: "Edit CASE .env",
  click: () => {
    exec(`notepad C:\\agent\\case\\.env`);
  }
},
{
  label: "Edit POS .env",
  click: () => {
    exec(`notepad C:\\agent\\pos\\.env`);
  }
},

{ type: "separator" },

// AGENT
{
  label: "Logs Agent (100) TS",
  click: () => runPS(
    'Get-Content "C:\\etc\\.pm2\\logs\\agent-error.log" -Tail 100 | ForEach-Object { Write-Output "$(Get-Date -Format s) $_" }'
  )
},

// CASE
{
  label: "Logs Case (100) TS",
  click: () => runPS(
    'Get-Content "C:\\etc\\.pm2\\logs\\case-error.log" -Tail 100 | ForEach-Object { Write-Output "$(Get-Date -Format s) $_" }'
  )
},

// POS
{
  label: "Logs POS (100) TS",
  click: () => runPS(
    'Get-Content "C:\\etc\\.pm2\\logs\\pos-error.log" -Tail 100 | ForEach-Object { Write-Output "$(Get-Date -Format s) $_" }'
  )
},
{
  type: "separator"
},
{
  label: "Exit Tray",
  click: () => {
    app.quit();
  }
}



    ]);


  tray.setToolTip("POS si Case de marcat");
  tray.setContextMenu(buildMenu());
});
