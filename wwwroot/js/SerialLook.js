

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
    if (!serial) {alert("Please enter a serial number."); return; }

    const overlay = document.getElementById("loading");
    overlay.style.display = "flex";

    try {
            const response = await fetch(`./api/Product/${serial}`);
    overlay.style.display = "none";
    if (!response.ok) {alert("Product not found."); return; }

    const data = await response.json();

    // ---------------- Product Details ----------------
    const pd = data.productDetails || { };
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
            ["#tracking-table tbody", "#testing-table tbody", "#rework-table tbody"].forEach(sel => {
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
    // Grouping and rendering testing table

    // Toggle test group rows
    function attachTestingToggle() {
                const tbody = document.querySelector("#testing-table tbody");
                tbody.querySelectorAll(".group-run-header").forEach(header => {
        header.addEventListener("click", () => {
            const icon = header.querySelector(".icon");
            if (icon) icon.classList.toggle("rotate");
            let next = header.nextElementSibling;
            while (next && next.classList.contains("group-row")) {
                next.style.display = (next.style.display === "none") ? "table-row" : "none";
                next = next.nextElementSibling;
            }
        });
                });
            }


    const grouped = { };
            data.testing.forEach(t => {
                // Create task object if it doesn't exist
                if (!grouped[t.task]) grouped[t.task] = {
        description: t.taskDescription || '', // store task description here
    runs: { }
                };

    // Create run array if it doesn't exist
    if (!grouped[t.task].runs[t.run]) grouped[t.task].runs[t.run] = [];

    // Push test row into run array
    grouped[t.task].runs[t.run].push(t);
            });

    const tbody = document.querySelector("#testing-table tbody");
            Object.keys(grouped).forEach(task => {
                const runs = grouped[task].runs; // <-- access runs properly
                const runKeys = Object.keys(runs).sort((a, b) => a - b);
    const lastRunKey = runKeys[runKeys.length - 1];
    const lastRunRows = runs[lastRunKey];

                // Keep lastRunHasFail based on taskStatus
                const lastRunHasFail = lastRunRows.some(t => t.taskStatus === "F");

                Object.keys(runs).forEach(run => {
                    const runRows = runs[run];
                    const hasFail = runRows.some(t => t.testStatus === "F");
                    let runIcon = hasFail ? '❌' : '✅';

                    if (lastRunHasFail) {
                        runIcon = '❌';
                    }

    // COMPUTE taskLink
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

                    const formatDateYYYYMMDD = dt =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    const taskLink =
    `http://tiger/QA_LISSummary/ResultPartTest?startDate=${formatDateYYYYMMDD(yesterday)}&endDate=${formatDateYYYYMMDD(tomorrow)}&TaskNo=${task}&PartTestsNo=`;

    // CREATE run header row
    const runRow = document.createElement("tr");
    runRow.classList.add("group-run-header");
    const taskDescription = grouped[task].description; // get description for this task

    // Get the last dateTested in this run
    const lastDateTested = runRows
                        .map(r => r.dateTested)
                        .filter(d => d) // remove null/undefined
                        .map(d => new Date(d))
                        .sort((a, b) => b - a)[0]; // descending, take first = latest

    runRow.innerHTML = `
    <td colspan="8">
        <span class="status-icon">${runIcon}</span>
        Task: ${task} <span class="sep">❘</span> Run: ${run}
        <a href="${taskLink}" target="_blank" class="link-btn" title="View Task Results">
            ${taskDescription}
        </a>
        ${lastDateTested
            ? ` <span class="sep">❘</span> <span class="last-tested" title="Last Tested">🕒 ${formatDate(lastDateTested)}</span>`
            : ''}
    </td>
    `;


    runRow.style.fontWeight = "bold";
    runRow.style.cursor = "pointer";
    tbody.appendChild(runRow);


                    runRows.forEach(t => {
                        const tr = document.createElement("tr");
    tr.classList.add("group-row");
    tr.style.display = "none"; // hide by default

    const testTaskLink = `http://tiger/LIS_ITEM/ItemCheck/GETPTBYCATASK?Part=&taskChk=&partNo=${t.testPart}`;

    tr.innerHTML = `
    <td>${t.task}</td>
    <td>${t.run}</td>
    <td>
        <a href="${testTaskLink}" target="_blank" class="link-btn" title="Check Limits">
            ${t.testPart}
        </a>
    </td>
    <td>${t.description || '-'}</td>
    <td>${t.testResult || '-'}</td>
    <td>${t.testFault || '-'}</td>
    <td class="status-icon">${t.testStatus === "F" ? '❌' : '✅'}</td>
    <td>${t.dateTested ? formatDate(new Date(t.dateTested)) : '-'}</td>
    `;
    tbody.appendChild(tr);
                    });

                });
            });


            // Attach toggle for group rows
            tbody.querySelectorAll(".group-run-header").forEach(header => {
        header.addEventListener("click", () => {
            let next = header.nextElementSibling;
            while (next && next.classList.contains("group-row")) {
                next.style.display = (next.style.display === "none") ? "table-row" : "none";
                next = next.nextElementSibling;
            }
        });
            });

            // ---------------- Rework table ----------------
            if (data.reworkRecords && data.reworkRecords.length > 0) {
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
            document.querySelector("#rework-table tbody").appendChild(tr);
        });
            } else {
                const tbody = document.querySelector("#rework-table tbody");
    const tr = document.createElement("tr");
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



