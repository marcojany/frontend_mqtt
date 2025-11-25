const API_BASE = "https://backend-mqtt-1.onrender.com";

// --- AUTENTICAZIONE JWT ---
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

// Ottieni token da localStorage
function getToken() {
  return localStorage.getItem('adminToken');
}

// Salva token in localStorage
function setToken(token) {
  localStorage.setItem('adminToken', token);
}

// Rimuovi token da localStorage
function removeToken() {
  localStorage.removeItem('adminToken');
}

// Verifica se l'utente è già autenticato
async function checkAuth() {
  const token = getToken();

  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/check-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();

    if (data.isAuthenticated) {
      showAdminPanel();
    } else {
      removeToken();
      showLoginScreen();
    }
  } catch (err) {
    console.error("Errore verifica auth:", err);
    removeToken();
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
    console.log("🔐 Tentativo di login...");
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    console.log("📊 Status login:", res.status);

    const data = await res.json();
    console.log("📦 Risposta login:", data);

    if (data.success && data.token) {
      console.log("✅ Login riuscito! Token ricevuto");
      setToken(data.token);  // Salva il token in localStorage
      showAdminPanel();
      loginForm.reset();
      loginError.classList.remove("show");
    } else {
      console.log("❌ Login fallito:", data.error);
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
      method: "POST"
    });
  } catch (err) {
    console.error("Errore logout:", err);
  } finally {
    removeToken();  // Rimuove il token da localStorage
    showLoginScreen();
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
  const loginBackendStatus = document.getElementById("login-backend-status");
  const loginBackendLed = document.getElementById("login-backend-led");

  // Aggiorna entrambi gli stati (login e admin panel)
  backendStatus.textContent = "Waiting for connection...";
  backendLed.style.backgroundColor = "#ffdf2bff";
  if (loginBackendStatus) loginBackendStatus.textContent = "Waiting for connection...";
  if (loginBackendLed) loginBackendLed.style.backgroundColor = "#ffdf2bff";

  try {
    const res = await fetch(`${API_BASE}/ping`, { cache: "no-store" });
    if (res.ok) {
      backendStatus.textContent = "Online";
      backendLed.style.backgroundColor = "#22c55e";
      if (loginBackendStatus) loginBackendStatus.textContent = "Online";
      if (loginBackendLed) loginBackendLed.style.backgroundColor = "#22c55e";
    } else {
      backendStatus.textContent = "Error";
      backendLed.style.backgroundColor = "#ef4444";
      if (loginBackendStatus) loginBackendStatus.textContent = "Error";
      if (loginBackendLed) loginBackendLed.style.backgroundColor = "#ef4444";
    }
  } catch (err) {
    backendStatus.textContent = "Offline";
    backendLed.style.backgroundColor = "#ef4444";
    if (loginBackendStatus) loginBackendStatus.textContent = "Offline";
    if (loginBackendLed) loginBackendLed.style.backgroundColor = "#ef4444";
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

// Helper per ottenere headers con JWT
function getAuthHeaders() {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Helper per gestire risposte non autenticate
function handleAuthError(res) {
  if (res.status === 401) {
    alert("Sessione scaduta. Effettua nuovamente il login.");
    removeToken();
    showLoginScreen();
    return true;
  }
  return false;
}

// Inizializza il pannello admin dopo il login
function initAdminPanel() {
  pingBackend();
  fetchCodes();
  fetchLogs();

  // Sollecita immediatamente lo status allo Shelly
  requestLuceStatus();

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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

    const data = await res.json();

    if (data.success) {
      updateLuceUI(data.isOn);
    }
  } catch (err) {
    console.error("Errore fetch stato luce:", err);
  }
}

// Sollecita lo status della luce allo Shelly
async function requestLuceStatus() {
  try {
    const res = await fetch(`${API_BASE}/admin/luce/request-status`, {
      method: "POST",
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

    const data = await res.json();

    if (data.success) {
      console.log("📡 Richiesta status luce inviata");
      // Attendi 500ms prima di interrogare lo stato aggiornato
      setTimeout(fetchLuceStatus, 500);
    } else {
      console.error("Errore richiesta status:", data.error);
    }
  } catch (err) {
    console.error("Errore sollecito status luce:", err);
  }
}

// Aggiorna UI dello stato luce
function updateLuceUI(isOn) {
  if (isOn) {
    luceLed.classList.remove("off");
    luceLed.classList.add("on");
    luceStatusText.textContent = "Luci attive";
    luceStatusText.style.color = "#f59e0b";
  } else {
    luceLed.classList.remove("on");
    luceLed.classList.add("off");
    luceStatusText.textContent = "Luci disattive";
    luceStatusText.style.color = "#6b7280";
  }
}

// Accendi luce
luceOnBtn.addEventListener("click", async () => {
  try {
    luceOnBtn.disabled = true;
    const res = await fetch(`${API_BASE}/admin/luce/on`, {
      method: "POST",
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) {
      luceOnBtn.disabled = false;
      return;
    }

    const data = await res.json();

    if (data.success) {
      // Aggiorna UI immediatamente (lo stato MQTT arriverà dopo)
      updateLuceUI(true);
    } else {
      alert("Errore nell'accensione della luce: " + (data.error || "Errore sconosciuto"));
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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) {
      luceOffBtn.disabled = false;
      return;
    }

    const data = await res.json();

    if (data.success) {
      // Aggiorna UI immediatamente
      updateLuceUI(false);
    } else {
      alert("Errore nello spegnimento della luce: " + (data.error || "Errore sconosciuto"));
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

    console.log("🔍 Invio richiesta apertura cancello...");
    const res = await fetch(`${API_BASE}/admin/relay/1`, {
      method: "POST",
      headers: getAuthHeaders()
    });

    console.log("📊 Status risposta:", res.status);
    console.log("📊 Headers risposta:", [...res.headers.entries()]);

    if (handleAuthError(res)) return;

    const data = await res.json();
    console.log("📦 Dati ricevuti:", data);

    if (data.success) {
      btn.innerHTML = '<img src="assets/Cancello.png" alt="Cancello"> ✅ Cancello aperto';
      setTimeout(() => {
        btn.innerHTML = '<img src="assets/Cancello.png" alt="Cancello"> Apri cancello esterno';
      }, 2000);
    } else {
      alert("Errore nell'apertura del cancello: " + (data.error || "Errore sconosciuto"));
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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

    const data = await res.json();

    if (data.success) {
      btn.innerHTML = '<img src="assets/Portone.png" alt="Portone"> ✅ Portone aperto';
      setTimeout(() => {
        btn.innerHTML = '<img src="assets/Portone.png" alt="Portone"> Apri portone';
      }, 2000);
    } else {
      alert("Errore nell'apertura del portone: " + (data.error || "Errore sconosciuto"));
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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

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
      headers: getAuthHeaders(),
      body: JSON.stringify({ user, startDate, expiryDate })
    });

    if (handleAuthError(res)) return;

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
      headers: getAuthHeaders()
    });

    if (handleAuthError(res)) return;

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