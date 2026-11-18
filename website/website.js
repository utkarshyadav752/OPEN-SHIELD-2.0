/**
 * OpenShield Standalone Website Simulator (website.js)
 * Powers the interactive ShadyAirlines judge sandbox & live rule explorer
 */
document.addEventListener("DOMContentLoaded", () => {
  const scanBtn = document.getElementById("simScanBtn");
  const neutralizeBtn = document.getElementById("simNeutralizeBtn");
  const resetBtn = document.getElementById("simResetBtn");
  const sandboxContainer = document.getElementById("shadySandboxRoot");

  function updateSimulatorDashboard(report) {
    const gradeEl = document.getElementById("simGrade");
    if (!gradeEl) return;
    gradeEl.textContent = report.grade;
    const colors = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
    gradeEl.style.background = colors[report.grade] || "#ef4444";

    document.getElementById("simUrgency").textContent = report.urgencyCount;
    document.getElementById("simSneaky").textContent = report.sneakyCount;
    document.getElementById("simShaming").textContent = report.shamingCount;
    document.getElementById("simTos").textContent = report.tosRisks.length;

    const logList = document.getElementById("simFindingsList");
    logList.innerHTML = "";
    const items = [...report.tosRisks.map(t => `📜 ToS Trap: ${t}`), ...report.findings];
    items.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      logList.appendChild(li);
    });
  }

  function runSandboxAudit() {
    if (!sandboxContainer) return;
    const report = {
      grade: "F",
      urgencyCount: 2,
      sneakyCount: 2,
      shamingCount: 1,
      tosRisks: [
        "Sneaky Auto-Renewal Subscription",
        "Strict No-Refund Clause",
        "Forced Arbitration & Class-Action Waiver",
        "Sells Personal Data to Third Parties",
        "Claims Permanent Ownership of Your Content"
      ],
      findings: [
        'Urgency Trap: "Hurry! Offer expires in 00:04:59 — 38 people..."',
        'Scarcity Trap: "Only 1 left in stock at this price (₹42,999)!"',
        'Sneaking: Pre-ticked "Add ₹2,499 VIP Baggage Protection"',
        'Sneaking: Pre-ticked "Auto-enroll me in ShadyClub Gold"',
        'Guilt-Trip UI: "No thanks, I prefer to pay full price..."'
      ]
    };

    sandboxContainer.querySelectorAll("[data-demo-urgency]").forEach(el => {
      el.classList.add("openshield-flagged-urgency");
    });
    sandboxContainer.querySelectorAll("[data-demo-sneaky]").forEach(el => {
      el.classList.add("openshield-flagged-sneaky");
    });
    sandboxContainer.querySelectorAll("[data-demo-shaming]").forEach(el => {
      el.classList.add("openshield-flagged-shaming");
    });
    sandboxContainer.querySelectorAll("[data-demo-tos]").forEach(el => {
      el.classList.add("openshield-flagged-tos");
    });

    updateSimulatorDashboard(report);
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", runSandboxAudit);
  }

  if (neutralizeBtn) {
    neutralizeBtn.addEventListener("click", () => {
      if (!sandboxContainer) return;
      sandboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      sandboxContainer.querySelectorAll("[data-demo-shaming]").forEach(el => {
        el.classList.add("openshield-equalized-btn");
      });
      sandboxContainer.querySelectorAll("[data-demo-urgency]").forEach(el => {
        el.style.textDecoration = "line-through";
        el.style.opacity = "0.55";
      });
      updateSimulatorDashboard({
        grade: "A",
        urgencyCount: 0,
        sneakyCount: 0,
        shamingCount: 0,
        tosRisks: [],
        findings: ["✅ All 5 UI dark patterns neutralized on page."]
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }

  runSandboxAudit();
});
