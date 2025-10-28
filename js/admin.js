const API_BASE = "https://backend-mqtt-1.onrender.com";

// --- AUTENTICAZIONE ---
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

// Verifica se l'utente è già autenticato
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/admin/check-auth`, {
      credentials: 'include'
    });
    const data = await res.json();

    if (data.isAuthenticated) {
      showAdminPanel();
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error("Errore verifica auth:", err);
    showLoginScreen();
  }
}

// Mostra schermata di login
function showLoginScreen() {
  loginScreen.style.display = "flex";
  adminPanel.style.display = "none";
}

// Mostra pannello admin
function showAdminPanel() {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";

  // Avvia il caricamento dei dati
  initAdminPanel();
}

// Gestione login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showAdminPanel();
      loginForm.reset();
      loginError.classList.remove("show");
    } else {
      loginError.textContent = data.error || "Credenziali non valide";
      loginError.classList.add("show");
    }
  } catch (err) {
    console.error("Errore login:", err);
    loginError.textContent = "Errore di connessione";
    loginError.classList.add("show");
  }
});

// Gestione logout
logoutBtn.addEventListener("click", async () => {
  try {
    await fetch(`${API_BASE}/admin/logout`, {
      method: "POST",
      credentials: 'include'
    });

    showLoginScreen();
  } catch (err) {
    console.error("Errore logout:", err);
  }
});

const backendStatus = document.getElementById("backend-status");
const backendLed = document.getElementById("backend-led");
const luceLed = document.getElementById("luce-led");
const luceStatusText = document.getElementById("luce-status-text");
const luceOnBtn = document.getElementById("luce-on-btn");
const luceOffBtn = document.getElementById("luce-off-btn");

// --- THEME TOGGLE ---
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

// Carica tema salvato o usa quello di default (scuro)
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeIcon.textContent = "☀️";
    themeText.textContent = "Chiaro";
  } else {
    document.body.classList.remove("light-mode");
    themeIcon.textContent = "🌙";
    themeText.textContent = "Scuro";
  }
}

// Toggle tra tema chiaro e scuro
function toggleTheme() {
  document.body.classList.toggle("light-mode");

  if (document.body.classList.contains("light-mode")) {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Chiaro";
    localStorage.setItem("theme", "light");
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Scuro";
    localStorage.setItem("theme", "dark");
  }
}

// Event listener per il toggle
themeToggle.addEventListener("click", toggleTheme);

// Carica il tema all'avvio
loadTheme();

// Ping per svegliare Backend
async function pingBackend() {
  backendStatus.textContent = "Waiting for connection...";
  backendLed.style.backgroundColor = "#ffdf2bff";

  try {
    const res = await fetch(`${API_BASE}/ping`, { cache: "no-store" });
    if (res.ok) {
      backendStatus.textContent = "Online";
      backendLed.style.backgroundColor = "#22c55e";
    } else {
      backendStatus.textContent = "Error";
      backendLed.style.backgroundColor = "#ef4444";
    }
  } catch (err) {
    backendStatus.textContent = "Offline";
    backendLed.style.backgroundColor = "#ef4444";
  }
}

// Ping immediato
pingBackend();
// Ping ogni 60 secondi
setInterval(pingBackend, 60000);

// Formatta tempo rimanente in giorni:ore:minuti
function formatTime(seconds) {
  if (seconds < 0) return "0d:0h:0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d:${h}h:${m}m`;
}

// Inizializza il pannello admin dopo il login
function initAdminPanel() {
  pingBackend();
  fetchCodes();
  fetchLogs();
  fetchLuceStatus();

  // Avvia aggiornamenti periodici
  setInterval(fetchCodes, 10000);
  setInterval(fetchLogs, 15000);
  setInterval(fetchLuceStatus, 3000);
}

// --- CONTROLLO LUCE ---

// Ottieni stato luce
async function fetchLuceStatus() {
  try {
    const res = await fetch(`${API_BASE}/admin/luce/status`, {
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      updateLuceUI(data.isOn);
    }
  } catch (err) {
    console.error("Errore fetch stato luce:", err);
  }
}

// Aggiorna UI dello stato luce
function updateLuceUI(isOn) {
  if (isOn) {
    luceLed.classList.remove("off");
    luceLed.classList.add("on");
    luceStatusText.textContent = "Luci Attive";
    luceStatusText.style.color = "#f59e0b";
  } else {
    luceLed.classList.remove("on");
    luceLed.classList.add("off");
    luceStatusText.textContent = "Luci Disattive";
    luceStatusText.style.color = "#6b7280";
  }
}

// Accendi luce
luceOnBtn.addEventListener("click", async () => {
  try {
    luceOnBtn.disabled = true;
    const res = await fetch(`${API_BASE}/admin/luce/on`, {
      method: "POST",
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      // Aggiorna UI immediatamente (lo stato MQTT arriverà dopo)
      updateLuceUI(true);
      // Ricontrolla lo stato dopo 500ms per conferma
      setTimeout(fetchLuceStatus, 500);
    } else {
      alert("Errore nell'accensione della luce");
    }
  } catch (err) {
    console.error("Errore accensione luce:", err);
    alert("Errore di connessione");
  } finally {
    luceOnBtn.disabled = false;
  }
});

// Spegni luce
luceOffBtn.addEventListener("click", async () => {
  try {
    luceOffBtn.disabled = true;
    const res = await fetch(`${API_BASE}/admin/luce/off`, {
      method: "POST",
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      // Aggiorna UI immediatamente
      updateLuceUI(false);
      // Ricontrolla lo stato dopo 500ms per conferma
      setTimeout(fetchLuceStatus, 500);
    } else {
      alert("Errore nello spegnimento della luce");
    }
  } catch (err) {
    console.error("Errore spegnimento luce:", err);
    alert("Errore di connessione");
  } finally {
    luceOffBtn.disabled = false;
  }
});

// --- CONTROLLO RELÈ ---

// Apri cancello (Relay 1)
document.getElementById("relay1-btn").addEventListener("click", async () => {
  if (!confirm("Vuoi aprire il cancello?")) return;
  
  try {
    const btn = document.getElementById("relay1-btn");
    btn.disabled = true;
    
    const res = await fetch(`${API_BASE}/admin/relay/1`, {
      method: "POST",
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      btn.textContent = "✅ Cancello aperto";
      setTimeout(() => {
        btn.textContent = "🔓 Apri Cancello";
      }, 2000);
    } else {
      alert("Errore nell'apertura del cancello");
    }
  } catch (err) {
    console.error("Errore apertura cancello:", err);
    alert("Errore di connessione");
  } finally {
    setTimeout(() => {
      document.getElementById("relay1-btn").disabled = false;
    }, 2000);
  }
});

// Apri portone (Relay 2)
document.getElementById("relay2-btn").addEventListener("click", async () => {
  if (!confirm("Vuoi aprire il portone?")) return;
  
  try {
    const btn = document.getElementById("relay2-btn");
    btn.disabled = true;
    
    const res = await fetch(`${API_BASE}/admin/relay/2`, {
      method: "POST",
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      btn.textContent = "✅ Portone aperto";
      setTimeout(() => {
        btn.textContent = "🚪 Apri Portone";
      }, 2000);
    } else {
      alert("Errore nell'apertura del portone");
    }
  } catch (err) {
    console.error("Errore apertura portone:", err);
    alert("Errore di connessione");
  } finally {
    setTimeout(() => {
      document.getElementById("relay2-btn").disabled = false;
    }, 2000);
  }
});

// --- CODICI ATTIVI ---
async function fetchCodes() {
  try {
    const res = await fetch(`${API_BASE}/admin/list-codes`, {
      credentials: 'include'
    });
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
        <td><button onclick="deleteCode('${c.code}')" class="delete-btn">Elimina</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Errore fetch codici:", err);
  }
}

// --- ELIMINA CODICE ---
async function deleteCode(code) {
  if (!confirm(`Vuoi eliminare il codice ${code}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/delete-code/${code}`, {
      method: "DELETE",
      credentials: 'include'
    });
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

// --- CREA NUOVO CODICE ---
document.getElementById("createCodeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value;
  const startDate = document.getElementById("startDate").value;
  const expiryDate = document.getElementById("expiryDate").value;

  try {
    const res = await fetch(`${API_BASE}/admin/create-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
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

// --- LOG ACCESSI ---
async function fetchLogs() {
  try {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      credentials: 'include'
    });
    const data = await res.json();
    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";

    // Ordina per timestamp decrescente (ultimi eventi in cima)
    data.logs.sort((a, b) => b.timestamp - a.timestamp);

    data.logs.forEach(l => {
      const tr = document.createElement("tr");
      tr.className = l.action;
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

// --- AVVIO: Verifica autenticazione ---
checkAuth();