🧾 CE SE INSTALAZĂ PE PC-UL DIN AGENȚIE (FINAL)
🎯 Scop

PC-ul din agenție:

pornește agent + case + pos

se conectează OUT la backend-ul tău din hosting

NU rulează frontend

NU rulează backend

pornește automat la boot

este controlabil din tray

1️⃣ Ce trebuie instalat o singură dată
✅ 1. Node.js (LTS)

👉 https://nodejs.org

instalezi LTS

bifezi “Add to PATH”

restart PC

Verificare:

node -v
npm -v

✅ 2. PM2 (global)
npm install -g pm2


Verificare:

pm2 -v

✅ 3. Electron (doar în agent)

Se instalează local, NU global (deja ai făcut asta, dar recap):

cd C:\agent
npm install

2️⃣ Structura FINALĂ pe PC-ul din agenție

Tu ai zis corect:

C:\
 └─ agent\
    ├─ agent\
    │  ├─ agent.js
    │  ├─ package.json
    │  ├─ .env
    │  └─ node_modules\
    │
    ├─ case\
    │  ├─ case.js
    │  ├─ package.json
    │  ├─ .env
    │  └─ node_modules\
    │
    ├─ pos\
    │  ├─ pos.js
    │  ├─ package.json
    │  ├─ .env
    │  └─ node_modules\
    │
    ├─ tray.js
    ├─ ecosystem.config.js
    └─ package.json


👉 NU copiezi node_modules din dev, le instalezi pe PC-ul agenției.

3️⃣ Ce faci DUPĂ ce copiezi folderul C:\agent
🔹 Pas 1 – instalezi dependențele
cd C:\agent\agent
npm install

cd C:\agent\case
npm install

cd C:\agent\pos
npm install

cd C:\agent
npm install

🔹 Pas 2 – editezi ENV-urile (din tray sau manual)
C:\agent\agent\.env
AGENT_BACKEND_URL=https://siteul-tau.ro
AGENT_KEY=TERMINAL_IASI_1

C:\agent\case\.env
CASE_PORT=9000
DEVICE_A=COM11
DEVICE_B=COM6

C:\agent\pos\.env
POS_PORT=9100
POS_DEVICE_A=COM12
POS_DEVICE_B=COM12

4️⃣ Pornești serviciile (o singură dată)
cd C:\agent
pm2 start ecosystem.config.js
pm2 save


Verificare:

pm2 list


Trebuie să vezi:

agent   online
case    online
pos     online

5️⃣ Tray (interfața userului)
cd C:\agent
npm run tray


👉 apare iconița:

status agent / case / pos

restart all

stop all

view logs

edit env

6️⃣ AUTOSTART (FOARTE IMPORTANT)
Creezi C:\agent\start-tray.vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\agent && npm run tray", 0

Rulezi:
shell:startup


👉 copiezi shortcut-ul la start-tray.vbs acolo

📌 Rezultat:

la boot Windows → tray pornește automat

PM2 pornește serviciile automat

7️⃣ Ce NU mai trebuie pe PC-ul agenției

❌ VS Code
❌ git
❌ frontend
❌ backend
❌ terminal deschis

Totul merge headless + tray.

8️⃣ Flux FINAL (cum funcționează în producție)

Agentul pornește la boot

Se conectează la backend din hosting

Primește job (cash / POS)

Apelează local:

case → casa de marcat

pos → POS

Trimite rezultatul înapoi la backend

🔒 Concluzie

Ai acum:

arhitectură corectă de producție

zero expunere de porturi

control total din tray

instalare în < 10 minute pe orice PC