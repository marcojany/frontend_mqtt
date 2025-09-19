let inputCode = "";
let relayTimeout = null;
const display = document.getElementById("display");
const relayBtn = document.getElementById("relayBtn");
const status = document.getElementById("status");
const API_BASE = "https://backend-mqtt-1.onrender.com"; // indirizzo Backend service
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

// 🔤 Traduzioni
const translations = {
  it: {
    title: "Inserisci codice",
    insert5: "Inserisci 5 cifre",
    correct: "✅ Codice corretto, puoi attivare il relè",
    expired: "⏱️ Tempo scaduto, reinserire il codice",
    wrong: "❌ Codice errato",
    relay: "✅ Relè attivato!",
    invalid: "❌ Codice non valido",
    error: "⚠️ Errore connessione",
    relayBtn: "🔓 Attiva Relè"
  },
  en: {
    title: "Enter your code",
    insert5: "Enter 5 digits",
    correct: "✅ Correct code, you can activate the relay",
    expired: "⏱️ Timeout expired, re-enter the code",
    wrong: "❌ Wrong code",
    relay: "✅ Relay activated!",
    invalid: "❌ Invalid code",
    error: "⚠️ Connection error",
    relayBtn: "🔓 Activate Relay"
  }
};

let currentLang = "it";

// 🌐 Cambia lingua
function setLanguage(lang) {
  currentLang = lang;
  document.getElementById("title").innerText = translations[lang].title;
  relayBtn.innerText = translations[lang].relayBtn;
  status.textContent = "";
  display.textContent = "_____";
}

// 🌀 Reset UI
function resetUI(msg = "") {
  inputCode = "";
  display.textContent = "_____";
  relayBtn.classList.add("hidden");
  if (relayTimeout) {
    clearTimeout(relayTimeout);
    relayTimeout = null;
  }
  status.textContent = msg;
  if (msg) setTimeout(() => (status.textContent = ""), 2000);
}

// 🎛️ Gestione tastierino
document.querySelectorAll(".key").forEach(btn => {
  btn.addEventListener("click", async () => {
    const val = btn.textContent;

    if (val === "←") {
      inputCode = inputCode.slice(0, -1);
      display.textContent = inputCode.padEnd(5, "_");
      return;
    }

    if (val === "OK") {
      if (inputCode.length !== 5) {
        status.textContent = translations[currentLang].insert5;
        setTimeout(() => (status.textContent = ""), 2000);
        return;
      }

      // 🔎 Verifica SOLO il codice
      try {
        const res = await fetch(`${API_BASE}/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userCode: inputCode })
        });
        const data = await res.json();

        if (data.success) {
          status.textContent = translations[currentLang].correct;
          relayBtn.classList.remove("hidden");

          // Nascondi pulsante dopo 1 minuto
          if (relayTimeout) clearTimeout(relayTimeout);
          relayTimeout = setTimeout(() => {
            resetUI(translations[currentLang].expired);
          }, 60000);
        } else {
          resetUI(translations[currentLang].wrong);
        }
      } catch {
        resetUI(translations[currentLang].error);
      }
      return;
    }

    // ➕ Aggiungi cifre
    if (/[0-9]/.test(val) && inputCode.length < 5) {
      inputCode += val;
      display.textContent = inputCode.padEnd(5, "_");
    }
  });
});

// 🚀 Attiva relè
relayBtn.addEventListener("click", async () => {
 const mqttCommand = {  //todo: comando MQTT da inviare
    id: 1,
    src: "webclient",
    method: "Switch.Set",
    params: {
      id: 0,
      on: true
    }
  }; 
  
  try {
    const res = await fetch(`${API_BASE}/send-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCode: inputCode, command: mqttCommand })
    });
    const data = await res.json();

    if (data.success) {
      status.textContent = translations[currentLang].relay;
      setTimeout(() => (status.textContent = ""), 2000);
    } else {
      resetUI(translations[currentLang].invalid);
    }
  } catch {
    resetUI(translations[currentLang].error);
  }
});

// 🔔 Ping automatico al backend per svegliarlo
(async () => {
  try {
    await fetch(`${API_BASE}/ping`);
    console.log("✅ Backend pinged");
  } catch (err) {
    console.warn("⚠️ Backend non raggiungibile:", err);
  }
})();
