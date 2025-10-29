let inputCode = "";
let relayTimeout = null;
const display = document.getElementById("display");
const relay1Btn = document.getElementById("relay1Btn");
const relay2Btn = document.getElementById("relay2Btn");
const status = document.getElementById("status");
const API_BASE = "https://backend-mqtt-1.onrender.com"; // indirizzo Backend service
const backendStatus = document.getElementById("backend-status");

// Sistema di limitazione tentativi
let failedAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5 minuti in millisecondi
let lockoutEndTime = null;

//ping per svegliare Backend
async function pingBackend() {
  const backendLed = document.getElementById("backend-led");
  backendStatus.textContent = "Waiting for connection...";
  if (backendLed) backendLed.style.backgroundColor = "#ffdf2bff";

  try {
    const res = await fetch(`${API_BASE}/ping`, { cache: "no-store" });
    if (res.ok) {
      backendStatus.textContent = "Online";
      if (backendLed) backendLed.style.backgroundColor = "#22c55e";
    } else {
      backendStatus.textContent = "Error";
      if (backendLed) backendLed.style.backgroundColor = "#ef4444";
    }
  } catch (err) {
    backendStatus.textContent = "Offline";
    if (backendLed) backendLed.style.backgroundColor = "#ef4444";
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
    correct: "✅ Codice corretto, Benvenuto!",
    expired: "⏱️ Tempo scaduto, reinserire il codice",
    wrong: "❌ Codice errato",
    relay1: "✅ Cancello aperto!",
    relay2: "✅ Portone aperto!",
    invalid: "❌ Codice non più valido",
    error: "⚠️ Errore connessione",
    relay1Btn: "🔓 Apri il Cancello",
    relay2Btn: "🚪 Apri il Portone",
    tooManyAttempts: "🚫 Troppi tentativi errati, riprova fra 5 minuti",
    lockedOut: "🔒 Attendi ancora"
  },
  en: {
    title: "Enter your code",
    insert5: "Enter 5 digits",
    correct: "✅ Correct code, wellcome!",
    expired: "⏱️ Timeout expired, re-enter the code",
    wrong: "❌ Wrong code",
    relay1: "✅ Gate opened!",
    relay2: "✅ Door opened!",
    invalid: "❌ Code no longer valid",
    error: "⚠️ Connection error",
    relay1Btn: "🔓 Open the Gate",
    relay2Btn: "🚪 Open the Door",
    tooManyAttempts: "🚫 Too many failed attempts, try again in 5 minutes",
    lockedOut: "🔒 Wait"
  },
  na: {
    title: "Miette 'o nummero",
    insert5: "🔢 Miette cinche nummere",
    correct: "✅ 'O nummero è bbuono, trase",
    expired: "⏱ Hê perzo tiempo, miette n'ata vota 'o nummero",
    wrong: "❌ 'O nummero nunn'è bbuono",
    relay1: "✅ 'O canciello è apierto",
    relay2: "✅ 'O purtone è apierto",
    invalid: "❌ 'O nummero nunn'è bbuono cchiù",
    error: "⚠️ Nun ce sta 'a connessione",
    relay1Btn: "🔐 Arape 'o canciello",
    relay2Btn: "🚪 Arape 'o purtone",
    tooManyAttempts: "🚫 Troppi tentativi sbagliati, torna fra 5 minuti",
    lockedOut: "🔒 Aspetta"
  }
};

let currentLang = "it";

// 🔒 Funzioni per gestire il lockout
function checkLockout() {
  if (lockoutEndTime && Date.now() < lockoutEndTime) {
    const remainingTime = Math.ceil((lockoutEndTime - Date.now()) / 1000);
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return { locked: true, remaining: `${minutes}:${seconds.toString().padStart(2, '0')}` };
  }
  if (lockoutEndTime && Date.now() >= lockoutEndTime) {
    // Reset dopo il timeout
    lockoutEndTime = null;
    failedAttempts = 0;
  }
  return { locked: false };
}

function startLockout() {
  lockoutEndTime = Date.now() + LOCKOUT_TIME;
  status.textContent = translations[currentLang].tooManyAttempts;
  display.textContent = "🚫🚫🚫";

  // Disabilita il tastierino
  document.querySelectorAll(".key").forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  });

  // Aggiorna il countdown ogni secondo
  const countdownInterval = setInterval(() => {
    const lockStatus = checkLockout();
    if (!lockStatus.locked) {
      clearInterval(countdownInterval);
      // Riabilita il tastierino
      document.querySelectorAll(".key").forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      });
      resetUI();
    } else {
      status.textContent = `${translations[currentLang].lockedOut} ${lockStatus.remaining}`;
    }
  }, 1000);
}

// 🌐 Cambia lingua
function setLanguage(lang) {
  currentLang = lang;
  document.getElementById("title").innerText = translations[lang].title;
  relay1Btn.innerText = translations[lang].relay1Btn;
  relay2Btn.innerText = translations[lang].relay2Btn;
  status.textContent = "";
  display.textContent = "_____";
}

// 🌀 Reset UI
function resetUI(msg = "") {
  inputCode = "";
  display.textContent = "_____";
  relay1Btn.classList.add("hidden");
  relay2Btn.classList.add("hidden");
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
    // Verifica lockout
    const lockStatus = checkLockout();
    if (lockStatus.locked) {
      return;
    }

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
          // Reset tentativi in caso di successo
          failedAttempts = 0;
          status.textContent = translations[currentLang].correct;
          relay1Btn.classList.remove("hidden");
          relay2Btn.classList.remove("hidden");

          // Nascondi pulsanti dopo 1 minuto
          if (relayTimeout) clearTimeout(relayTimeout);
          relayTimeout = setTimeout(() => {
            resetUI(translations[currentLang].expired);
          }, 60000);
        } else {
          // Incrementa tentativi falliti
          failedAttempts++;
          if (failedAttempts >= MAX_ATTEMPTS) {
            startLockout();
          } else {
            resetUI(translations[currentLang].wrong);
          }
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

// 🚀 Attiva relè generico
async function activateRelay(relayId) {
  try {
    const res = await fetch(`${API_BASE}/send-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCode: inputCode, relayId })
    });

    const data = await res.json();

    if (!res.ok) {
      resetUI(data.error || translations[currentLang].error);
      return;
    }

    if (data.success) {
      status.textContent =
        relayId === 1
          ? translations[currentLang].relay1
          : translations[currentLang].relay2;
      setTimeout(() => (status.textContent = ""), 2000);
    } else {
      resetUI(translations[currentLang].invalid);
    }
  } catch {
    resetUI(translations[currentLang].error);
  }
}

// Collego i pulsanti ai relè
relay1Btn.addEventListener("click", () => activateRelay(1));
relay2Btn.addEventListener("click", () => activateRelay(2));

// 🔔 Ping automatico al backend per svegliarlo
(async () => {
  try {
    await fetch(`${API_BASE}/ping`);
    console.log("✅ Backend pinged");
  } catch (err) {
    console.warn("⚠️ Backend non raggiungibile:", err);
  }
})();