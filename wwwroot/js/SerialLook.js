

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
                taskHeader.innerHTML = `<span>TASK ${taskId}</span>
                                <span>Latest: <span class="${latestResultClass}">${latestPass ? 'PASS' : 'FAIL'}</span></span>`;
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
                    const runPass = runItems.every(i => i.testStatus !== "F");
                    const runResultClass = runPass ? 'pass' : 'fail';

                    const runHeader = document.createElement('div');
                    runHeader.className = 'run-header';
                    runHeader.innerHTML = `<span>Run ${runNum}</span>
                                   <span class="${runResultClass}">${runPass ? 'PASS' : 'FAIL'}</span>`;

                    // Container for test items (hidden initially)
                    const itemsDiv = document.createElement('div');
                    itemsDiv.className = 'test-items';
                    itemsDiv.style.display = 'none';

                    runItems.forEach((item) => {
                        const span = document.createElement('div');
                        span.textContent = `${item.testPart}    ${item.description || '-'} , ${item.testStatus === "F" ? 'FAIL' : 'PASS'}`;
                        span.className = item.testStatus === "F" ? 'fail' : 'pass';
                        itemsDiv.appendChild(span);
                    });

                    // Click run header → toggle test items
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
        const table = document.getElementById("testing-table");
    const partFull = document.getElementById("part").textContent.trim() || "-";
    const part = partFull.split(' ')[0];
    const serial = document.getElementById("serialFPA").textContent.trim() || "-";

    let csv = [];
    csv.push(testingHeaders.join(",")); // header

        for (let row of table.tBodies[0].rows) {
            if (row.classList.contains("group-run-header")) continue;

            let rowData = [part, serial];
            for (let cell of row.cells) {
                let text = convertStatusIcon(cell.textContent.trim()).replace(/,/g, "");
                if (!text) text = "-";
                rowData.push(text);
            }
            csv.push(rowData.join(","));
        }


    const blob = new Blob([csv.join("\n")], {type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getExportFilename()}.csv`;
    link.click();
    }

    // Export Testing Table to Excel
    function exportTestingExcel() {
        const table = document.getElementById("testing-table");
    const partFull = document.getElementById("part").textContent.trim() || "-";
    const part = partFull.split(' ')[0];
    const serial = document.getElementById("serialFPA").textContent.trim() || "-";

    let excelData = [];
    excelData.push(testingHeaders); // header

        for (let row of table.tBodies[0].rows) {
            if (row.classList.contains("group-run-header")) continue;

            let rowData = [part, serial];

            for (let cell of row.cells) {
                let text = convertStatusIcon(cell.textContent.trim());
                if (!text) text = "-";
                rowData.push(text);
            }

            excelData.push(rowData);
        }


    // Force XLSX export only
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






