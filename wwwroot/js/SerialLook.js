/* ============================================================
   COLLAPSIBLE SECTIONS
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {


    document.querySelectorAll(".collapsible").forEach(btn => {
        const content = btn.nextElementSibling;
        if (!content) return;

        content.style.display = "none";

        btn.addEventListener("click", () => {
            const isOpen = btn.classList.toggle("active");
            content.style.display = isOpen ? "block" : "none";
        });
    });

    // ✅ Add this
    document.getElementById("serialInput").addEventListener("keydown", e => {
        if (e.key === "Enter") loadData();
    });
});

/* ============================================================
   DATE UTILITIES
   ============================================================ */
const today = new Date();
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

function formatDate(dt) {
    const d = dt.getDate().toString().padStart(2, "0");
    const m = (dt.getMonth() + 1).toString().padStart(2, "0");
    const y = dt.getFullYear();
    const h = dt.getHours().toString().padStart(2, "0");
    const min = dt.getMinutes().toString().padStart(2, "0");
    const s = dt.getSeconds().toString().padStart(2, "0");
    return `${d}/${m}/${y} : ${h}:${min}:${s}`;
}

function formatDateYYYYMMDD(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}


/* ============================================================
   LOAD DATA
   ============================================================ */
async function loadData() {
    const serial = document.getElementById("serialInput").value.trim();
    if (!serial) { alert("Please enter a serial number."); return; }

    const overlay = document.getElementById("loading");
    overlay.style.display = "flex";

    try {
        const response = await fetch(`./api/Product/${serial}`);
        overlay.style.display = "none";
        if (!response.ok) { alert("Product not found."); return; }

        const data = await response.json();

        // ---- Product Details ----
        const pd = data.productDetails || {};
        document.getElementById("serialFPA").textContent = pd.serialFPA || "-";

        // Serial GEA
        const geaRow = document.getElementById("serialGEA");
        geaRow.textContent = pd.serialGEA || "-";
        geaRow.closest("tr").style.display = (!pd.serialGEA || pd.serialGEA === "-") ? "none" : "";

        // Serial HAIER
        const haierRow = document.getElementById("serialHAIER");
        haierRow.textContent = pd.serialHAIER || "-";
        haierRow.closest("tr").style.display = (!pd.serialHAIER || pd.serialHAIER === "-") ? "none" : "";

        document.getElementById("part").textContent = pd.part || "-";
        document.getElementById("partIssue").textContent = pd.partIssue || "-";
        document.getElementById("serialIssueDate").textContent = pd.serialIssueDate
            ? formatDate(new Date(pd.serialIssueDate))
            : "-";

        // VAI Foam Code
        const foamRow = document.getElementById("vaI_FoamCode");
        foamRow.textContent = pd.vaI_FoamCode || "-";
        foamRow.closest("tr").style.display = (!pd.vaI_FoamCode || pd.vaI_FoamCode === "-") ? "none" : "";

        const statusEl = document.getElementById("status");
        statusEl.textContent = pd.status || "-";
        statusEl.className = "";
        if (pd.status) statusEl.classList.add(`status-${pd.status}`);

        /* ---- Check if DISHDRAWER product ---- */
        const partText = document.getElementById("part").textContent || "";
        const isDishDrawer = partText.toUpperCase().includes("DISHDRAWER");

        /* ---- Show/Hide Production Flow section ---- */
        document.querySelectorAll("button.collapsible").forEach(btn => {
            if (!btn.textContent.includes("Production Flow")) return;
            const content = btn.nextElementSibling;
            if (isDishDrawer) {
                btn.style.display = "";       // show the button
                if (content) content.style.display = "none"; // reset collapsed
            } else {
                btn.style.display = "none";   // hide entire section
                if (content) content.style.display = "none";
            }
        });

        /* ---- Auto-expand Sections ---- */
        function expandSectionByText(text) {
            document.querySelectorAll("button.collapsible").forEach(btn => {
                if (!btn.textContent.includes(text)) return;
                if (btn.style.display === "none") return; // skip hidden sections
                const content = btn.nextElementSibling;
                btn.classList.add("active");
                if (content) content.style.display = "block";
            });
        }

        expandSectionByText("Tracking Information");
        expandSectionByText("Testing Information");
        if (isDishDrawer) expandSectionByText("Production Flow");

        /* ---- Clear Old Tables ---- */
        ["#tracking-table tbody", "#rework-table tbody"].forEach(sel => {
            document.querySelector(sel).innerHTML = "";
        });

        /* ---- Tracking ---- */
        const trackingBody = document.querySelector("#tracking-table tbody");
        if (data.tracking?.length > 0) {
            data.tracking.forEach(t => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
          <td>${t.workcell}</td>
          <td>${t.task}</td>
          <td>${t.store_location}</td>
          <td class="status-${t.status}">${t.status}</td>
          <td>${t.store}</td>
          <td>${t.last_maint ? formatDate(new Date(t.last_maint)) : "-"}</td>
          <td>${t.last_maint_logon || "-"}</td>
          <td>${t.update_reference || "-"}</td>
          <td>${t.order_no || "-"}</td>
          <td>${t.reject_reason || "-"}</td>
        `;
                trackingBody.appendChild(tr);
            });
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="10" style="text-align:center;">No tracking data found</td>`;
            trackingBody.appendChild(tr);
        }

        /* ---- Testing ---- */
        window.testingData = data.testing || [];
        const testingContainer = document.getElementById("testing-container");
        testingContainer.innerHTML = "";

        if (data.testing?.length > 0) {
            // Group by task → run
            const grouped = {};
            data.testing.forEach(t => {
                if (!grouped[t.task]) grouped[t.task] = {};
                if (!grouped[t.task][t.run]) grouped[t.task][t.run] = [];
                grouped[t.task][t.run].push(t);
            });

            Object.keys(grouped).forEach(taskId => {
                const taskDiv = document.createElement("div");
                taskDiv.className = "task";

                const runs = Object.keys(grouped[taskId]).sort((a, b) => a - b);
                const latestRunItems = grouped[taskId][runs[runs.length - 1]];
                const latestPass = latestRunItems.every(i => i.testStatus !== "F");
                const latestClass = latestPass ? "pass" : "fail";

                // Task header
                const taskDescription = latestRunItems[0].taskDescription || "";
                const taskHeader = document.createElement("div");
                taskHeader.className = "task-header";

                const taskUrl = `http://tiger/QA_LISSummary/ResultPartTest`
                    + `?startDate=${formatDateYYYYMMDD(yesterday)}`
                    + `&endDate=${formatDateYYYYMMDD(tomorrow)}`
                    + `&TaskNo=${taskId}`;

                taskHeader.innerHTML = `<a href="${taskUrl}" target="_blank" class="task-link">TASK ${taskId} ${taskDescription}</a> • <span class="${latestClass}">&nbsp;${latestPass ? "PASS" : "FAIL"}</span>`;
                taskDiv.appendChild(taskHeader);

                // Runs container
                const runsContainer = document.createElement("div");
                runsContainer.className = "runs-container";
                runsContainer.style.display = "none";

                runs.forEach(runNum => {
                    const runItems = grouped[taskId][runNum];
                    const runFail = runItems.some(i => i.testStatus === "F");
                    const runResultClass = runFail ? "fail" : "pass";

                    const lastDateTested = runItems
                        .map(r => r.dateTested)
                        .filter(Boolean)
                        .map(d => new Date(d))
                        .sort((a, b) => b - a)[0];

                    const runDiv = document.createElement("div");
                    runDiv.className = "run";

                    const runHeader = document.createElement("div");
                    runHeader.className = "run-header";
                    if (runFail) runHeader.style.backgroundColor = "#ffe5e5";
                    runHeader.innerHTML = `
            Task ${taskId} • Run: ${runNum}
            • ${lastDateTested ? "🕒 " + formatDate(lastDateTested) : ""}
            <span class="${runResultClass}">${runFail ? "❌" : "✅"}</span>
          `;

                    const itemsDiv = document.createElement("div");
                    itemsDiv.className = "test-items";
                    itemsDiv.style.display = "none";

                    runItems.forEach(item => {
                        const isFail = item.testStatus === "F";
                        const row = document.createElement("div");
                        row.innerHTML = `
              <div class="test-row ${isFail ? "row-fail" : ""}">
                <div class="col part">
                  <a href="http://tiger/LIS_ITEM/ItemCheck/GETPTBYCATASK?Part=&taskChk=&partNo=${item.testPart}" target="_blank">
                    ${item.testPart}
                  </a>
                </div>
                <div class="col description">${item.description || "-"}</div>
                <div class="col result">
                  <span class="test-result">${item.testResult || "-"}</span>
                </div>
                <div class="col testFault">${item.testFault || "-"}</div>
                <div class="col status">
                  <span class="${isFail ? "fail" : "pass"}">${isFail ? "❌" : "✅"}</span>
                </div>
              </div>
            `;
                        itemsDiv.appendChild(row);
                    });

                    runHeader.addEventListener("click", () => {
                        const isOpen = itemsDiv.style.display === "block";
                        itemsDiv.style.display = isOpen ? "none" : "block";
                        if (!isOpen && runItems.length >= 5) {
                            setTimeout(() => runHeader.scrollIntoView({ behavior: "smooth", block: "start" }), 10);
                        }
                    });

                    runDiv.appendChild(runHeader);
                    runDiv.appendChild(itemsDiv);
                    runsContainer.appendChild(runDiv);
                });

                taskHeader.addEventListener("click", () => {
                    runsContainer.style.display = runsContainer.style.display === "block" ? "none" : "block";
                });

                taskDiv.appendChild(runsContainer);
                testingContainer.appendChild(taskDiv);
            });

        } else {
            testingContainer.innerHTML = "<div style='text-align:center;'>No testing data found</div>";
        }

        /* ---- Rework ---- */
        const reworkBody = document.querySelector("#rework-table tbody");
        if (data.reworkRecords?.length > 0) {
            data.reworkRecords.forEach(r => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
          <td>${r.part}</td>
          <td>${r.dateRecorded ? formatDate(new Date(r.dateRecorded)) : "-"}</td>
          <td>${r.areaRecorded}</td>
          <td>${r.rwkRepairCode}</td>
          <td>${r.rwkFaultCode}</td>
          <td>${r.mold}</td>
        `;
                reworkBody.appendChild(tr);
            });
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="6" style="text-align:center;">No rework records found</td>`;
            reworkBody.appendChild(tr);
        }

        /* ---- Cytoscape Production Flow (DISHDRAWER only) ---- */
        if (isDishDrawer) {
            loadProductionFlow(serial);
        } else {
            // Clear any previous flow from a prior search
            const cyContainer = document.getElementById("cy");
            if (cyContainer) cyContainer.innerHTML = "";
        }

    } catch (err) {
        overlay.style.display = "none";
        console.error(err);
        alert("Failed to load product data.");
    }
}


/* ============================================================
   CYTOSCAPE PRODUCTION FLOW
   ============================================================ */
async function loadProductionFlow(serial) {
    const line = "DISHDRAWER";
    let layoutConfig = [];
    let trackHistory = [];

    try {
        const res = await fetch(`./api/FactoryLine/${line}?serial=${encodeURIComponent(serial)}`);
        if (!res.ok) throw new Error(res.status);

        const data = await res.json();
        layoutConfig = data.nodes.map(n => ({
            store: n.store,
            x: n.positionX,
            y: n.positionY,
            label: n.label,
        }));
        trackHistory = data.history.filter(h => h.store_location);

    } catch (e) {
        console.error(e);
        alert("Flow load failed");
        return;
    }

    const statusColor = { P: "#27ae60", R: "#3498db", D: "#bdc3c7" };

    const trackingStatus = {};
    const historyMap = {};
    trackHistory.forEach(h => {
        trackingStatus[h.store_location] = h.status;
        historyMap[h.store_location] = h;
    });

    /* ---- Initialise Cytoscape ---- */
    const cy = cytoscape({
        container: document.getElementById("cy"),
        layout: { name: "preset" },
        style: [
            {
                selector: "node",
                style: {
                    label: "data(label)",
                    "background-color": "data(color)",
                    shape: "round-rectangle",
                    width: 140,
                    height: 56,
                    "font-size": 12,
                    "font-weight": 600,
                    color: "#fff",
                    "text-wrap": "wrap",
                    "text-max-width": 120,
                    "text-line-height": 1.4,
                    "text-valign": "center",
                    "text-halign": "center",
                    "overlay-opacity": 0,
                },
            },
            {
                selector: "edge",
                style: {
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "arrow-scale": 0.9,
                    width: 2,
                    "line-color": "data(color)",
                    "target-arrow-color": "data(color)",
                    "line-opacity": 0.9,
                },
            },
            {
                selector: "edge:hover",
                style: {
                    width: 2,
                    "line-color": "#5dade2",
                    "target-arrow-color": "#5dade2",
                },
            },
        ],
    });

    /* ---- Assign Run Numbers ---- */
    let runNo = 1;
    const nodeRunMap = {};

    [...trackHistory]
        .sort((a, b) => new Date(a.last_maint) - new Date(b.last_maint))
        .forEach(h => {
            if (!layoutConfig.find(n => n.store === h.store_location)) return;
            if (!nodeRunMap[h.store_location]) nodeRunMap[h.store_location] = [];
            nodeRunMap[h.store_location].push(runNo++);
        });

    /* ---- Add Nodes ---- */
    layoutConfig.forEach(cfg => {
        const status = trackingStatus[cfg.store] || "D";
        let label = cfg.label;
        if (nodeRunMap[cfg.store]) {
            label = nodeRunMap[cfg.store].map(n => `[${n}]`).join(" ") + "\n\n" + cfg.label;
        }
        cy.add({
            data: { id: cfg.store, label, color: statusColor[status] },
            position: { x: cfg.x * 10, y: (100 - cfg.y) * 6 },
        });
    });

    /* ---- Draw Edges (animated) ---- */
    const runSequence = [];
    Object.keys(nodeRunMap).forEach(store =>
        nodeRunMap[store].forEach(no => runSequence.push({ runNo: no, store }))
    );
    runSequence.sort((a, b) => a.runNo - b.runNo);

    const edgeColor = "#878787";
    let delay = 0;

    for (let i = 1; i < runSequence.length; i++) {
        const from = runSequence[i - 1].store;
        const to = runSequence[i].store;

        // ✅ Skip self-loops and missing nodes
        if (from === to) continue;
        if (cy.getElementById(from).empty() || cy.getElementById(to).empty()) continue;

        setTimeout(() => {
            cy.add({
                data: { id: `e-${from}-${to}-${i}`, source: from, target: to, color: edgeColor },
                style: { "line-color": edgeColor, "target-arrow-color": edgeColor },
            });
        }, delay);
        delay += 450;
    }
    /* ---- Lock / Interaction Settings ---- */
    const lastRun = runSequence[runSequence.length - 1];
    if (lastRun) cy.getElementById(lastRun.store).addClass("active");

    cy.nodes().lock();
    cy.userZoomingEnabled(false);
    cy.userPanningEnabled(false);
    cy.boxSelectionEnabled(false);
    cy.autoungrabify(true);

    /* ---- Node Tooltip ---- */
    const tooltip = document.getElementById("tooltip");

    cy.on("mouseover", "node", evt => {
        const n = evt.target;
        const h = historyMap[n.id()] || {};
        tooltip.innerHTML = `
      <b>${n.data("label").split("\n").pop()}</b><br />
      Status: <b>${trackingStatus[n.id()] || "D"}</b><br />
      User: ${h.last_maint_logon || "-"}<br />
      Time: ${h.last_maint}
    `;
        tooltip.style.opacity = 1;
    });

    cy.on("mousemove", "node", evt => {
        tooltip.style.top = (evt.originalEvent.pageY - 12) + "px";
        tooltip.style.left = (evt.originalEvent.pageX + 6) + "px";
    });

    cy.on("mouseout", "node", () => { tooltip.style.opacity = 0; });
}


/* ============================================================
   EXPORT TESTING DATA TO EXCEL
   ============================================================ */
function exportTestingExcel() {
    if (!window.testingData?.length) { alert("No testing data to export"); return; }

    const wb = XLSX.utils.book_new();
    const ws_data = window.testingData.map(t => [
        t.task, t.run, t.testPart, t.description, t.testResult, t.testStatus,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Testing");
    XLSX.writeFile(wb, "testing.xlsx");
}