/* ===============================
   FIREBASE INIT
================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDaC-pPGWElF25q77D1h5sUm-Jjjea0O00",
  authDomain: "gurutvakarshan-esports.firebaseapp.com",
  projectId: "gurutvakarshan-esports",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ===============================
   GLOBAL DATA
================================= */

let registrations = [];
let filteredRegs = [];
let currentGameFilter = "ALL";


/* ===============================
   HELPERS
================================= */

function safeText(v) {
  return (v === undefined || v === null) ? "" : String(v);
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast align-items-center text-bg-success border-0 position-fixed bottom-0 end-0 m-3";
  toast.style.zIndex = 9999;

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  document.body.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 1500 });
  bsToast.show();

  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

function copyToClipboard(text) {
  if (!text || text === "-") return;
  navigator.clipboard.writeText(text)
    .then(() => showToast("Copied ✅"))
    .catch(() => alert("Copy failed! Please copy manually: " + text));
}

function parseTimeToNumber(t) {
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return dt.getTime();
  return 0;
}

/* ===============================
   RENDER TABLE
================================= */

function renderTable(list) {
  const tbody = $("#registrationTableBody");
  tbody.empty();

  if (!list.length) {
    tbody.append(`
      <tr>
        <td colspan="8" class="text-center text-warning fw-bold py-4">
          No registrations found
        </td>
      </tr>
    `);
    return;
  }

  list.forEach(item => {
    const team = safeText(item.team) || "-";
    const game = safeText(item.game) || "-";
    const players = safeText(item.players) || "-";
    const contacts = safeText(item.contacts) || "-";
    const txn = safeText(item.transaction) || "-";
    const code = safeText(item.code) || "-";
    const time = safeText(item.time) || "-";

    tbody.append(`
      <tr>
        <td>${team}</td>
        <td>${game}</td>
        <td style="white-space: pre-line">${players}</td>

        <td>
          <div class="d-flex flex-column gap-1">
            <span class="text-info">${contacts}</span>
            <button class="btn btn-sm btn-outline-light copy-btn" data-copy="${contacts}">
              Copy Contact
            </button>
          </div>
        </td>

        <td>
          <div class="d-flex flex-column gap-1">
            <span class="text-warning">${txn}</span>
            <button class="btn btn-sm btn-outline-warning copy-btn" data-copy="${txn}">
              Copy TXN
            </button>
          </div>
        </td>

        <td>${code}</td>
        <td>${time}</td>

        <td>
          <button class="btn btn-sm btn-outline-success copy-btn" data-copy="${team}">
            Copy Team
          </button>
        </td>
      </tr>
    `);
  });
}

/* ===============================
   SEARCH + SORT
================================= */

function applySearchAndSort() {
  const q = ($("#searchBox").val() || "").trim().toLowerCase();
  const sortMode = $("#sortSelect").val();

  filteredRegs = registrations.filter(item => {
    // Game filter
    if (currentGameFilter !== "ALL") {
      if (!safeText(item.game).toLowerCase().includes(currentGameFilter.toLowerCase())) {
        return false;
      }
    }
  
    // Search query filter
    const blob = (
      safeText(item.team) + " " +
      safeText(item.game) + " " +
      safeText(item.players) + " " +
      safeText(item.contacts) + " " +
      safeText(item.transaction) + " " +
      safeText(item.code) + " " +
      safeText(item.time)
    ).toLowerCase();
  
    return blob.includes(q);
  });
  

  filteredRegs.sort((a, b) => {
    const ta = safeText(a.team).toLowerCase();
    const tb = safeText(b.team).toLowerCase();
    const ga = safeText(a.game).toLowerCase();
    const gb = safeText(b.game).toLowerCase();

    const da = parseTimeToNumber(a.time);
    const db = parseTimeToNumber(b.time);

    switch (sortMode) {
      case "timeAsc": return da - db;
      case "timeDesc": return db - da;
      case "teamAsc": return ta.localeCompare(tb);
      case "teamDesc": return tb.localeCompare(ta);
      case "gameAsc": return ga.localeCompare(gb);
      case "gameDesc": return gb.localeCompare(ga);
      default: return 0;
    }
  });

  renderTable(filteredRegs);
}

/* ========================
    loader
  ========================*/

function showTableLoader() {
  $("#registrationTableBody").html(`
    <tr>
      <td colspan="8" class="text-center py-4">
        <div class="d-flex justify-content-center align-items-center gap-2 loader-row">
          <div class="spinner-border text-info loader-spinner" role="status"></div>
          <span class="fw-bold text-info">Loading registrations...</span>
        </div>
      </td>
    </tr>
  `);
}

function showNoDataRow() {
  $("#registrationTableBody").html(`
    <tr>
      <td colspan="8" class="text-center text-warning fw-bold py-4">
        No registrations found
      </td>
    </tr>
  `);
}


/* ===============================
    FIRESTORE LOAD
================================= */

function loadRegistrations() {

  showTableLoader();

  db.collection("registrations")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      registrations = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        const players = d.players || {};

        let playerText = "";
        if (players.p1) playerText += `1) ${players.p1.name} (${players.p1.gameId})\n`;
        if (players.p2) playerText += `2) ${players.p2.name} (${players.p2.gameId})\n`;
        if (players.p3) playerText += `3) ${players.p3.name} (${players.p3.gameId})\n`;
        if (players.p4) playerText += `4) ${players.p4.name} (${players.p4.gameId})\n`;

        let contactText = `Captain: ${d.captainPhone || "-"} | Alt: ${d.alternatePhone || "-"}`;

        let createdAtText = "-";
        if (d.createdAt && d.createdAt.toDate) {
          createdAtText = d.createdAt.toDate().toLocaleString();
        }

        registrations.push({
          team: d.teamName || "-",
          game: d.game || "-",
          players: playerText.trim() || "-",
          contacts: contactText,
          transaction: d.transactionId || "-",
          code: d.registrationCode || "-",
          time: createdAtText
        });
      });

      applySearchAndSort();
    });
}

/* ===============================
   LOGIN LOGIC
================================= */

$(document).ready(function () {
  const ADMIN_PASSWORD = "GT2026";

  $("#loginBtn").on("click", function () {
    const pass = $("#adminPassword").val();

    if (pass === ADMIN_PASSWORD) {
      $("#loginError").addClass("d-none");

      $("#loginSection").addClass("d-none");
      $("#dashboardSection").removeClass("d-none");

      loadRegistrations();
    } else {
      $("#loginError").removeClass("d-none");
    }
  });

  $(document).on("click", ".game-filter", function () {
    $(".game-filter").removeClass("active");
    $(this).addClass("active");
  
    currentGameFilter = $(this).attr("data-game");
    applySearchAndSort();
  });
  

  // ✅ press Enter to login
  $("#adminPassword").on("keydown", function (e) {
    if (e.key === "Enter") $("#loginBtn").click();
  });

  // UI events
  $("#searchBox").on("input", function () {
    applySearchAndSort();
  });

  $("#sortSelect").on("change", function () {
    applySearchAndSort();
  });

  $("#clearFilters").on("click", function () {
    $("#searchBox").val("");
    $("#sortSelect").val("timeDesc");
    applySearchAndSort();
  });

  // Copy buttons
  $(document).on("click", ".copy-btn", function () {
    copyToClipboard($(this).attr("data-copy"));
  });

  $("#exportCSV").on("click", function () {
    downloadTSV(filteredRegs);
  });
  

});

function downloadTSV(rows, filename = "GURUTVAKARSHAN_Registrations.tsv") {
  if (!rows.length) {
    showToast("No data to export!");
    return;
  }

  const headers = Object.keys(rows[0]);

  const sanitize = (val) => {
    return safeText(val)
      .replace(/\r?\n/g, " | ")   // ✅ convert multi-line to one line
      .replace(/\t/g, " ")       // ✅ remove tabs (tabs break tsv)
      .trim();
  };

  const tsv = [
    headers.join("\t"),
    ...rows.map(r => headers.map(h => sanitize(r[h])).join("\t"))
  ].join("\n");

  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8;" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

