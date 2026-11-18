document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  function renderRoachMotel(roach) {
    const card = document.getElementById("roachMotelCard");
    if (!roach || !card) return;
    card.style.display = "block";

    const diffEl = document.getElementById("roachDifficulty");
    diffEl.textContent = roach.difficulty.toUpperCase();

    const diffColors = {
      easy: { bg: "#065f46", text: "#6ee7b7" },
      medium: { bg: "#78350f", text: "#fcd34d" },
      hard: { bg: "#7f1d1d", text: "#fca5a5" },
      impossible: { bg: "#4c0519", text: "#fda4af" }
    };
    const palette = diffColors[roach.difficulty] || diffColors.hard;
    diffEl.style.background = palette.bg;
    diffEl.style.color = palette.text;

    document.getElementById("roachNotes").textContent = `${roach.name}: ${roach.notes}`;
    const link = document.getElementById("roachUrl");
    link.href = roach.url;
  }

  function updateUI(report) {
    if (!report) return;
    const gradeEl = document.getElementById("grade");
    gradeEl.textContent = report.grade;

    const gradeColors = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
    gradeEl.style.background = gradeColors[report.grade] || "#ef4444";

    document.getElementById("urgencyCount").textContent = report.urgencyCount;
    document.getElementById("sneakyCount").textContent = report.sneakyCount;
    document.getElementById("shamingCount").textContent = report.shamingCount;
    document.getElementById("tosCount").textContent = report.tosRisks.length;

    if (report.roachMotel) {
      renderRoachMotel(report.roachMotel);
    }

    const list = document.getElementById("findingsList");
    list.innerHTML = "";

    const allLogs = [...report.tosRisks.map(r => `ToS: ${r}`), ...report.findings];
    if (allLogs.length === 0) {
      list.innerHTML = "<li style='color:#10b981;'>✅ Clean page! Zero dark patterns detected.</li>";
    } else {
      allLogs.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
    }
  }

  let latestReport = null;

  chrome.tabs.sendMessage(tab.id, { action: "GET_REPORT" }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById("findingsList").innerHTML =
        "<li>Please refresh the page to let OpenShield scan it.</li>";
      return;
    }
    latestReport = response;
    updateUI(response);
  });

  document.getElementById("neutralizeBtn").addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { action: "NEUTRALIZE" }, (res) => {
      const btn = document.getElementById("neutralizeBtn");
      btn.textContent = `✅ Fixed ${res?.fixedCount || 0} Deceptive Elements!`;
      btn.style.background = "#3b82f6";
      btn.style.color = "#fff";
    });
  });

  const downloadBtn = document.getElementById("downloadJsonBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const payload = {
        reportVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        url: tab.url || "unknown",
        grade: latestReport?.grade || "-",
        detectedTraps: latestReport?.findings || [],
        tosAnalysis: {
          redFlags: latestReport?.tosRisks || []
        },
        roachMotel: latestReport?.roachMotel || null
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "openshield-forensic-audit.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
  }
});
