

    function formatDate(dt) {
        const d = dt.getDate().toString().padStart(2, '0');
    const m = (dt.getMonth() + 1).toString().padStart(2, '0');
    const y = dt.getFullYear();
    const h = dt.getHours().toString().padStart(2, '0');
    const min = dt.getMinutes().toString().padStart(2, '0');
    const s = dt.getSeconds().toString().padStart(2, '0');
    return `${d}/${m}/${y} : ${h}:${min}:${s}`;
    }

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

        // ---------------- Product Details ----------------
        const pd = data.productDetails || {};
        document.getElementById("serialFPA").textContent = pd.serialFPA || "-";
        document.getElementById("serialGEA").textContent = pd.serialGEA || "-";
        document.getElementById("serialHAIER").textContent = pd.serialHAIER || "-";
        document.getElementById("part").textContent = pd.part || "-";
        document.getElementById("partIssue").textContent = pd.partIssue || "-";
        document.getElementById("serialIssueDate").textContent = pd.serialIssueDate ? formatDate(new Date(pd.serialIssueDate)) : "-";
        document.getElementById("vaI_FoamCode").textContent = pd.vaI_FoamCode || "-";
        const statusEl = document.getElementById("status");
        statusEl.textContent = pd.status || "-";
        statusEl.classList.remove("status-P", "status-R", "status-D", "status-N");
        if (pd.status) statusEl.classList.add(`status-${pd.status}`);

        // ---------------- Clear old tables ----------------
        ["#tracking-table tbody", "#rework-table tbody"].forEach(sel => {
            document.querySelector(sel).innerHTML = "";
        });

        // ---------------- Tracking table ----------------
        if (data.tracking && data.tracking.length > 0) {
            data.tracking.forEach(t => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${t.workcell}</td>
                    <td>${t.task}</td>
                    <td>${t.store_location}</td>
                    <td class="status-${t.status}">${t.status}</td>
                    <td>${t.store}</td>
                    <td>${t.last_maint ? formatDate(new Date(t.last_maint)) : '-'}</td>
                    <td>${t.last_maint_logon || '-'}</td>
                    <td>${t.update_reference || '-'}</td>
                    <td>${t.order_no || '-'}</td>
                    <td>${t.reject_reason || '-'}</td>
                `;
                document.querySelector("#tracking-table tbody").appendChild(tr);
            });
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="11" style="text-align:center;">No tracking data found</td>`;
            document.querySelector("#tracking-table tbody").appendChild(tr);
        }

        // ---------------- Testing table ----------------
        const testingContainer = document.getElementById("testing-container");
        testingContainer.innerHTML = ""; // clear previous
        window.testingData = data.testing || [];
        if (data.testing && data.testing.length > 0) {
            // Group by task then run
            const grouped = {};
            data.testing.forEach(t => {
                if (!grouped[t.task]) grouped[t.task] = {};
                if (!grouped[t.task][t.run]) grouped[t.task][t.run] = [];
                grouped[t.task][t.run].push(t);
                
            });

            Object.keys(grouped).forEach((taskId) => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task';

                // Latest run result for task
                const runs = Object.keys(grouped[taskId]).sort((a, b) => a - b);
                const latestRunItems = grouped[taskId][runs[runs.length - 1]];
                const latestPass = latestRunItems.every(i => i.testStatus !== "F");
                const latestResultClass = latestPass ? 'pass' : 'fail';

                // TASK header only (default visible)
                const taskHeader = document.createElement('div');
                taskHeader.className = 'task-header';
                const startDate = formatDateYYYYMMDD(yesterday); // calculate yesterday
                const endDate = formatDateYYYYMMDD(tomorrow);   // calculate tomorrow
                const taskDescription = latestRunItems[0].taskDescription || '';
                // Then build header
                taskHeader.innerHTML = `
<a href="http://tiger/QA_LISSummary/ResultPartTest?startDate=${startDate}&endDate=${endDate}&TaskNo=${taskId}" 
   target="_blank" class="task-link">
   TASK ${taskId} ${taskDescription}
</a>
<span> • <span class="${latestResultClass}">&nbsp${latestPass ? 'PASS' : 'FAIL'}</span></span>
`;

                taskDiv.appendChild(taskHeader);

                // Container for all runs (hidden by default)
                const runsContainer = document.createElement('div');
                runsContainer.className = 'runs-container';
                runsContainer.style.display = 'none';

                // Build all runs inside container
                runs.forEach((runNum) => {
                    const runDiv = document.createElement('div');
                    runDiv.className = 'run';

                    const runItems = grouped[taskId][runNum];
                    const runFail = runItems.some(i => i.testStatus === "F"); // check if any fail
                    const runPass = !runFail;
                    const runResultClass = runPass ? 'pass' : 'fail';

                    // Get the last tested date in this run
                    const lastDateTested = runItems
                        .map(r => r.dateTested)
                        .filter(d => d)
                        .map(d => new Date(d))
                        .sort((a, b) => b - a)[0];

                    // Run header with modern separator and status
                    const runHeader = document.createElement('div');
                    runHeader.className = 'run-header';
                    if (runFail) runHeader.style.backgroundColor = '#ffe5e5'; // light red if any fail

                    const runDescription = runItems[0].taskDescription || '';
                    runHeader.innerHTML = `Task ${taskId} • Run: ${runNum} • ${lastDateTested ? '🕒 ' + formatDate(lastDateTested) : ''} <span class="${runResultClass}">${runPass ? '✅' : '❌'}</span>`;

                    // Container for test items
                    const itemsDiv = document.createElement('div');
                    itemsDiv.className = 'test-items';
                    itemsDiv.style.display = 'none';

                    runItems.forEach((item) => {
                        const isFail = item.testStatus === "F";
                        const span = document.createElement('div');
                        span.innerHTML = `
<div class="test-row ${isFail ? 'row-fail' : ''}">
   <div class="col part">
    <a href="http://tiger/LIS_ITEM/ItemCheck/GETPTBYCATASK?Part=&taskChk=&partNo=${item.testPart}" target="_blank">
        ${item.testPart}
    </a>
</div>
    <div class="col description">${item.description || '-'}</div>
    <div class="col result"><span class="test-result">${item.testResult || '-'}</span></div>
    <div class="col status">
        <span class="${isFail ? 'fail' : 'pass'}">
            ${isFail ? '❌' : '✅'}
        </span>
    </div>
</div>
`;

                        itemsDiv.appendChild(span);
                    });

                    runHeader.addEventListener('click', () => {
                        itemsDiv.style.display = itemsDiv.style.display === 'block' ? 'none' : 'block';
                    });

                    runDiv.appendChild(runHeader);
                    runDiv.appendChild(itemsDiv);
                    runsContainer.appendChild(runDiv);
                });

                // Click TASK header → toggle all runs
                taskHeader.addEventListener('click', () => {
                    runsContainer.style.display = runsContainer.style.display === 'block' ? 'none' : 'block';
                });

                taskDiv.appendChild(runsContainer);
                testingContainer.appendChild(taskDiv);
            });

        } else {
            testingContainer.innerHTML = "<div style='text-align:center;'>No testing data found</div>";
        }

        // ---------------- Rework table ----------------
        if (data.reworkRecords && data.reworkRecords.length > 0) {
            data.reworkRecords.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.part}</td>
                    <td>${r.dateRecorded ? formatDate(new Date(r.dateRecorded)) : '-'}</td>
                    <td>${r.areaRecorded}</td>
                    <td>${r.rwkRepairCode}</td>
                    <td>${r.rwkFaultCode}</td>
                    <td>${r.mold}</td>
                `;
                document.querySelector("#rework-table tbody").appendChild(tr);
            });
        } else {
            const tbody = document.querySelector("#rework-table tbody");
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align:center;">No rework records found</td>`;
            tbody.appendChild(tr);
        }

    } catch (err) {
        overlay.style.display = "none";
        console.error(err);
        alert("Failed to load product data.");
    }
}


    // Calculate dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Format date as YYYY-MM-DD
    function formatDateYYYYMMDD(dt) {
        const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
    }

    // Collapsible sections
    document.querySelectorAll(".collapsible").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("active");
            const content = btn.nextElementSibling;
            // Toggle visibility of the table inside the collapsible section
            if (content.style.display === "none" || content.style.display === "") {
                content.style.display = "block"; // Show table
            } else {
                content.style.display = "none"; // Hide table
            }
        });
    });

    // Convert icon to letter for export
function convertStatusIcon(cellContent) {
    if (cellContent === '✅') return 'P';
    if (cellContent === '❌') return 'F';
    return cellContent || "-";
}

    // Column headers for export
    const testingHeaders = [
    "Part",
    "Serial",
    "Task",
    "Run",
    "Test Part",
    "Description",
    "Test Result",
    "Test Fault",
    "Status",
    "Date Tested"
    ];

    // Generate filename with Serial + timestamp
    function getExportFilename() {
        const serial = document.getElementById("serialFPA").textContent.trim() || "unknown";
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
        //return `${serial}_${y}${m}${d}_${h}${min}${s}`;
    return `${serial}_${y}${m}${d}`;
    }

    // Export Testing Table to CSV
function exportTestingCSV() {
    const serial = document.getElementById("serialFPA").textContent.trim() || "-";
    const partFull = document.getElementById("part").textContent.trim() || "-";
    const part = partFull.split(' ')[0];

    if (!window.testingData || !window.testingData.length) {
        alert("No testing data loaded for export.");
        return;
    }

    const csv = [];
    csv.push(testingHeaders.join(",")); // add header row

    // group by task & run
    const grouped = {};
    window.testingData.forEach(t => {
        if (!grouped[t.task]) grouped[t.task] = {};
        if (!grouped[t.task][t.run]) grouped[t.task][t.run] = [];
        grouped[t.task][t.run].push(t);
    });

    Object.keys(grouped).forEach(taskId => {
        const runs = Object.keys(grouped[taskId]).sort((a, b) => a - b);
        runs.forEach(runNum => {
            grouped[taskId][runNum].forEach(item => {
                const partLink = `http://tiger/LIS_ITEM/ItemCheck/GETPTBYCATASK?Part=&taskChk=&partNo=${item.testPart}`;
                const taskLink = `http://tiger/QA_LISSummary/ResultPartTest?startDate=2026-02-18&endDate=2026-02-20&TaskNo=${taskId}`;

                const rowData = [
                    `=HYPERLINK("${partLink}", "${item.testPart || "-"}")`,
                    serial,
                    `=HYPERLINK("${taskLink}", "${taskId}")`,
                    runNum,
                    item.testPart || "-",
                    item.description || "-",
                    item.testResult || "-",
                    "-", // Test Fault
                    item.testStatus === "F" ? "F" : "P",
                    item.dateTested ? formatDate(new Date(item.dateTested)) : "-"
                ];

                csv.push(rowData.join(","));
            });
        });
    });

    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getExportFilename()}.csv`;
    link.click();
}

    // Export Testing Table to Excel
function exportTestingExcel() {
    const serial = document.getElementById("serialFPA").textContent.trim() || "-";
    const partFull = document.getElementById("part").textContent.trim() || "-";
    const part = partFull.split(' ')[0];

    if (!window.testingData || !window.testingData.length) {
        alert("No testing data loaded for export.");
        return;
    }

    const excelData = [];
    excelData.push(testingHeaders); // header row

    // group by task & run
    const grouped = {};
    window.testingData.forEach(t => {
        if (!grouped[t.task]) grouped[t.task] = {};
        if (!grouped[t.task][t.run]) grouped[t.task][t.run] = [];
        grouped[t.task][t.run].push(t);
    });

    Object.keys(grouped).forEach(taskId => {
        const runs = Object.keys(grouped[taskId]).sort((a, b) => a - b);
        runs.forEach(runNum => {
            grouped[taskId][runNum].forEach(item => {
                const partLink = `http://tiger/LIS_ITEM/ItemCheck/GETPTBYCATASK?Part=&taskChk=&partNo=${item.testPart}`;
                const taskLink = `http://tiger/QA_LISSummary/ResultPartTest?startDate=2026-02-18&endDate=2026-02-20&TaskNo=${taskId}`;

                const rowData = [
                    { v: item.testPart || "-", l: { Target: partLink, Tooltip: "Click to open Part" } },
                    serial,
                    { v: taskId, l: { Target: taskLink, Tooltip: "Click to open Task" } },
                    runNum,
                    item.testPart || "-",
                    item.description || "-",
                    item.testResult || "-",
                    "-", // Test Fault
                    item.testStatus === "F" ? "F" : "P",
                    item.dateTested ? formatDate(new Date(item.dateTested)) : "-"
                ];

                excelData.push(rowData);
            });
        });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Testing");
    XLSX.writeFile(wb, `${getExportFilename()}.xlsx`);
}


document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".collapsible").forEach((btn, index) => {
        const content = btn.nextElementSibling;
        if (!content) return;

        // ✅ Default OPEN
        btn.classList.add("active");
        content.classList.remove("collapsed");

        btn.addEventListener("click", () => {
            const isOpen = btn.classList.toggle("active");
            content.classList.toggle("collapsed", !isOpen);
        });
    });
});






