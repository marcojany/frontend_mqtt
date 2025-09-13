const API_BASE = "https://backend-mqtt-87yr.onrender.com";
const led = document.getElementById("backend-led");
const backendStatus = document.getElementById("backend-status");

//ping per svegliare Backend
async function pingBackend() {
  led.className = "w-3 h-3 rounded-full bg-gray-400"; // grigio
  backendStatus.textContent = "Waiting for connection...";

  try {
    const res = await fetch(`${API_BASE}/ping`, { cache: "no-store" });
    if (res.ok) {
      led.className = "w-3 h-3 rounded-full bg-green-500"; // verde
      backendStatus.textContent = "Online";
    } else {
      led.className = "w-3 h-3 rounded-full bg-red-500"; // rosso
      backendStatus.textContent = "Error";
    }
  } catch (err) {
    led.className = "w-3 h-3 rounded-full bg-red-500"; // rosso
    backendStatus.textContent = "Offline";
  }
}

// ping immediato
pingBackend();

// ping ogni 60 secondi
setInterval(pingBackend, 60000);

// Formatta tempo rimanente in giorni:ore:minuti
function formatTime(seconds) {
  if (seconds < 0) return "0d:0h:0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d:${h}h:${m}m`;
}

// --- Codici attivi ---
async function fetchCodes() {
  try {
    const res = await fetch(`${API_BASE}/admin/list-codes`);
    const data = await res.json();
    const tbody = document.getElementById("codesTableBody");
    tbody.innerHTML = "";

    // Ordina per scadenza decrescente (più recenti in cima)
data.activeCodes.sort((a, b) => b.expiry - a.expiry);

data.activeCodes.forEach(c => {
  const startDate = new Date(c.start).toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  const expiryDate = new Date(c.expiry).toLocaleString("it-IT", { timeZone: "Europe/Rome" });

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${c.code}</td>
    <td>${c.user}</td>
    <td>${startDate}</td>
    <td>${expiryDate}</td>
    <td>${formatTime(c.expiresInSeconds)}</td>
    <td><button onclick="deleteCode('${c.code}')" class="bg-red-500 text-white px-3 py-1 rounded">Elimina</button></td>
  `;
  tbody.appendChild(row);
});

  } catch (err) {
    console.error("Errore fetch codici:", err);
  }
}

// --- Elimina codice ---
async function deleteCode(code) {
  if (!confirm(`Vuoi eliminare il codice ${code}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/delete-code/${code}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      fetchCodes();
      fetchLogs();
    } else {
      alert(`❌ Errore: ${data.error}`);
    }
  } catch (err) {
    console.error("Errore eliminazione:", err);
  }
}

// --- Crea nuovo codice ---
document.getElementById("createCodeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value;
  const startDate = document.getElementById("startDate").value;
  const expiryDate = document.getElementById("expiryDate").value;

  try {
    const res = await fetch(`${API_BASE}/admin/create-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, startDate, expiryDate })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Codice ${data.code} creato per ${data.user} valido dal ${new Date(data.start).toLocaleString("it-IT", { timeZone: "Europe/Rome", hour12: false })} fino al ${new Date(data.expiry).toLocaleString("it-IT", { timeZone: "Europe/Rome", hour12: false })}`);
      fetchCodes();
      fetchLogs();
    } else {
      alert("Errore creazione codice: " + data.error);
    }
  } catch (err) {
    console.error("Errore creazione codice:", err);
  }
});


// --- Log accessi ---
async function fetchLogs() {
  try {
    const res = await fetch(`${API_BASE}/admin/logs`);
    const data = await res.json();
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";

    // Ordina per timestamp decrescente (ultimi eventi in cima)
    data.logs.sort((a, b) => b.timestamp - a.timestamp);

    data.logs.forEach(l => {
      const tr = document.createElement("tr");
      tr.className = l.action; // assegna la classe per il colore
      tr.innerHTML = `
        <td>${l.user}</td>
        <td>${l.code}</td>
        <td>${l.action}</td>
        <td>${new Date(l.timestamp).toLocaleString("it-IT", { timeZone: "Europe/Rome", hour12: false })}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Errore fetch logs:", err);
  }
}

// 🔔 Ping automatico al backend per svegliarlo
(async () => {
  try {
    await fetch(`${API_BASE}/ping`);
    console.log("✅ Backend pinged");
  } catch (err) {
    console.warn("⚠️ Backend non raggiungibile:", err);
  }
})();

// --- Avvio automatico ---
fetchCodes();
fetchLogs();
setInterval(fetchCodes, 10000);
setInterval(fetchLogs, 15000);
