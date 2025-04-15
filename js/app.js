// DDS/js/app.js
import {
    // Import necessary functions from domUpdater if you prefer to keep update logic there
    // e.g., loadIngredientStatus, loadMaterialShortages, etc.
    // For this example, update logic is adapted locally in app.js
    loadInventoryCounts, // Keep this for the initial load
    loadFinancialInsights // Keep this for initial load & recalculation logic base
} from './domUpdater.js';
import {
    updateTimestamp,
    applyNumberFormatting,
    setupEditModal,
    formatCurrency,
    formatDateWithSpaces, // Import needed for shortages/railcars
    createStatusDropdown, // Import needed for ingredient status
    statusOptionsDefinition, // Import needed for ingredient status
    exportRailcarsToCSV // Import needed for railcars
} from './utils.js';
import { parseCSV } from './dataloader.js'; // Import the CSV parser

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Initializing...");

    // --- Original Setup Functions ---
    function setupCogiInputListeners() {
        const batchingInput = document.getElementById('cogiBatchingCount');
        const packagingInput = document.getElementById('cogiPackagingCount');

        if (batchingInput) {
            batchingInput.addEventListener('change', () => {
                const value = parseInt(batchingInput.value, 10) || 0;
                applyNumberFormatting(batchingInput, value > 0 ? -1 : 0);
                console.log(`Batching Cogi count changed to: ${value}`);
            });
        } else {
            console.warn("Batching Cogi input not found.");
        }

        if (packagingInput) {
            packagingInput.addEventListener('change', () => {
                const value = parseInt(packagingInput.value, 10) || 0;
                applyNumberFormatting(packagingInput, value > 0 ? -1 : 0);
                console.log(`Packaging Cogi count changed to: ${value}`);
            });
        } else {
            console.warn("Packaging Cogi input not found.");
        }
    }

    function initialLoad() {
        updateTimestamp();
        // Use original functions from domUpdater for initial load
        Promise.all([
            import('./domUpdater.js').then(mod => mod.loadIngredientStatus()),
            import('./domUpdater.js').then(mod => mod.loadMaterialShortages()),
            import('./domUpdater.js').then(mod => mod.loadRailcars()),
            import('./domUpdater.js').then(mod => mod.loadInventoryCounts()),
            import('./domUpdater.js').then(mod => mod.loadCogiErrors()),
            import('./domUpdater.js').then(mod => mod.loadFinancialInsights()),
            import('./domUpdater.js').then(mod => mod.loadTopCycleCounts()),
            import('./domUpdater.js').then(mod => mod.loadTopScrap()),
            import('./domUpdater.js').then(mod => mod.loadComments())
        ]).then(() => {
            setupCogiInputListeners();
            setupEditModal();
            console.log("Dashboard data loaded successfully and modal setup.");
        }).catch(error => {
            console.error("Error loading one or more dashboard sections:", error);
        });
    }

    // --- Theme Toggle Setup ---
    const themeToggleButton = document.getElementById('theme-toggle-icon-button');
    if (themeToggleButton) {
        const savedTheme = localStorage.getItem('dashboardTheme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('dashboardTheme', isLight ? 'light' : 'dark');
        });
    } else {
        console.warn("Theme toggle button (#theme-toggle-icon-button) not found.");
    }

    // ===== START: Updated Drag and Drop Logic =====
    const dropZoneOverlay = document.getElementById('drop-zone-overlay');
    const bodyElement = document.body;

    if (dropZoneOverlay && bodyElement) {
        let dragCounter = 0;

        bodyElement.addEventListener('dragenter', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dragCounter++;
            if (event.dataTransfer && event.dataTransfer.types.includes('Files')) {
                dropZoneOverlay.classList.add('drop-zone-visible');
                // Update overlay text based on potential files later if needed
            }
        });

        bodyElement.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.target === dropZoneOverlay || dropZoneOverlay.contains(event.target)) {
                 dropZoneOverlay.classList.add('drop-zone-active');
                 // You could dynamically change the text here based on hovered file if desired
                 const overlayText = dropZoneOverlay.querySelector('.drop-zone-content p');
                 if (overlayText) overlayText.textContent = "Drop file here to update...";

            } else {
                 dropZoneOverlay.classList.remove('drop-zone-active');
            }
        });

        bodyElement.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dragCounter--;
            if (dragCounter === 0) {
                dropZoneOverlay.classList.remove('drop-zone-visible', 'drop-zone-active');
                // Reset overlay text
                 const overlayText = dropZoneOverlay.querySelector('.drop-zone-content p');
                 if (overlayText) overlayText.textContent = "Drop CSV file here to update relevant section"; // Default text
            }
            if (event.target === dropZoneOverlay || dropZoneOverlay.contains(event.target)) {
                 dropZoneOverlay.classList.remove('drop-zone-active');
            }
        });

        bodyElement.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dragCounter = 0;
            dropZoneOverlay.classList.remove('drop-zone-visible', 'drop-zone-active');
             // Reset overlay text
            const overlayText = dropZoneOverlay.querySelector('.drop-zone-content p');
            if (overlayText) overlayText.textContent = "Drop CSV file here to update relevant section"; // Default text


            const files = event.dataTransfer.files;

            if (files.length > 0) {
                const file = files[0];
                console.log(`File dropped: ${file.name}, type: ${file.type}, size: ${file.size}`);

                // --- Check if it's a CSV file ---
                if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
                    console.log("CSV file detected. Reading...");
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        try {
                            const csvText = e.target.result;
                            const parsedData = parseCSV(csvText); // Assumes header row
                            console.log(`Parsed data for ${file.name}:`, parsedData);

                            if (parsedData.length === 0) {
                                console.warn("Dropped CSV is empty or has no data rows.");
                                alert(`The dropped file '${file.name}' seems to be empty or incorrectly formatted.`);
                                return;
                            }

                            // --- Route data to the correct UI update function ---
                            switch (file.name.toLowerCase()) {
                                case 'scrap_transactions.csv':
                                    updateScrapUI(parsedData);
                                    break;
                                case 'cycle_counts.csv':
                                    updateCycleCountsUI(parsedData);
                                    break;
                                case 'cogi_errors.csv':
                                    updateCogiErrorsUI(parsedData);
                                    break;
                                case 'dashboard_comments.csv':
                                    updateCommentsUI(parsedData);
                                    break;
                                case 'ingredients_status.csv':
                                    updateIngredientStatusUI(parsedData);
                                    break;
                                case 'material_shortages.csv':
                                    updateMaterialShortagesUI(parsedData);
                                    break;
                                case 'railcars.csv':
                                    updateRailcarsUI(parsedData);
                                    break;
                                case 'top_cycle_counts.csv':
                                    updateTopCycleCountsUI(parsedData);
                                    break;
                                case 'top_scrap.csv':
                                    updateTopScrapUI(parsedData);
                                    break;
                                default:
                                    console.log(`Dropped CSV '${file.name}' is not recognized for UI updates.`);
                                    alert(`File '${file.name}' dropped, but no specific UI update is configured for this file.`);
                                    break;
                            }
                             // Update timestamp after any successful update
                             updateTimestamp();

                        } catch (error) {
                            console.error(`Error parsing dropped CSV '${file.name}':`, error);
                            alert(`Error reading or parsing '${file.name}'. Make sure it's a valid CSV.`);
                        }
                    };

                    reader.onerror = (e) => {
                        console.error(`Error reading file '${file.name}':`, e);
                        alert(`Could not read the dropped file '${file.name}'.`);
                    };

                    reader.readAsText(file);
                } else {
                    console.log("Incorrect file type dropped. Ignoring.");
                    alert(`Please drop a CSV file. You dropped: ${file.name} (${file.type})`);
                }
            }
        });

        // --- UI Update Functions (Adapted from domUpdater.js logic) ---

        function recalculateFinancialTotal() {
            const financialTotalEl = document.getElementById('financialTotalPTD');
            const cycleTotalValue = parseFloat(document.getElementById('cycleCountTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;
            const scrapTotalValue = parseFloat(document.getElementById('scrapTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;

            if(financialTotalEl) {
                const grandTotal = cycleTotalValue + scrapTotalValue;
                financialTotalEl.textContent = formatCurrency(grandTotal);
                applyNumberFormatting(financialTotalEl, grandTotal);
                console.log("Financial total recalculated.");
            } else {
                 console.error("Financial total element not found during recalculation!");
            }
        }

        function updateScrapUI(scrapData) {
            const scrapTableBody = document.getElementById('scrapTransactionsWeeklyBody');
            const scrapTotalEl = document.getElementById('scrapTotal');
            if (!scrapTableBody || !scrapTotalEl) return console.error("Scrap UI elements missing.");

            scrapTableBody.innerHTML = '';
            const row = scrapData[0];
            const tr = document.createElement('tr');
            let scrapTotal = 0;
            for (let i = 0; i < 4; i++) { // Assumes 4 weeks W1-W4
                const td = document.createElement('td');
                const value = parseFloat(row[i]) || 0;
                scrapTotal += value;
                td.textContent = formatCurrency(value);
                applyNumberFormatting(td, value);
                td.classList.add('editable-text');
                td.onclick = () => showEditModal(td);
                tr.appendChild(td);
            }
            scrapTableBody.appendChild(tr);
            scrapTotalEl.textContent = formatCurrency(scrapTotal);
            applyNumberFormatting(scrapTotalEl, scrapTotal);
            recalculateFinancialTotal(); // Recalculate grand total
            console.log("Scrap UI updated from dropped file.");
        }

        function updateCycleCountsUI(cycleData) {
            const cycleTableBody = document.getElementById('cycleCountsWeeklyBody');
            const cycleTotalEl = document.getElementById('cycleCountTotal');
            if (!cycleTableBody || !cycleTotalEl) return console.error("Cycle Count UI elements missing.");

            cycleTableBody.innerHTML = '';
            const row = cycleData[0];
            const tr = document.createElement('tr');
            let cycleTotal = 0;
            for (let i = 0; i < 4; i++) { // Assumes 4 weeks W1-W4
                const td = document.createElement('td');
                const value = parseFloat(row[i]) || 0;
                cycleTotal += value;
                td.textContent = formatCurrency(value);
                applyNumberFormatting(td, value);
                td.classList.add('editable-text');
                td.onclick = () => showEditModal(td);
                tr.appendChild(td);
            }
            cycleTableBody.appendChild(tr);
            cycleTotalEl.textContent = formatCurrency(cycleTotal);
            applyNumberFormatting(cycleTotalEl, cycleTotal);
            recalculateFinancialTotal(); // Recalculate grand total
            console.log("Cycle Counts UI updated from dropped file.");
        }

        function updateCogiErrorsUI(cogiData) {
            const batchingInput = document.getElementById('cogiBatchingCount');
            const packagingInput = document.getElementById('cogiPackagingCount');
            if (!batchingInput || !packagingInput) return console.error("COGI input elements missing.");

            let batchingCount = 0;
            let packagingCount = 0;
            cogiData.forEach(row => { // Data has multiple rows: Area, Count
                const area = row[0]?.toLowerCase().trim();
                const count = parseInt(row[1], 10) || 0;
                if (area === 'batching') batchingCount += count;
                else if (area === 'packaging') packagingCount += count;
            });
            batchingInput.value = batchingCount;
            packagingInput.value = packagingCount;
            applyNumberFormatting(batchingInput, batchingCount > 0 ? -1 : 0);
            applyNumberFormatting(packagingInput, packagingCount > 0 ? -1 : 0);
            console.log("COGI Errors UI updated from dropped file.");
        }

        function updateCommentsUI(commentsData) {
            const commentsElement = document.getElementById('dashboardCommentsArea');
            if (!commentsElement) return console.error("Comments area element missing.");

            const commentsText = commentsData.map(row => row[0] || '').join('\n');
            commentsElement.textContent = commentsText.trim() || 'No comments in file.';
            // Re-apply editable classes/listeners if they were removed
            commentsElement.classList.add('editable-text');
            commentsElement.dataset.multiline = 'true';
            commentsElement.onclick = () => showEditModal(commentsElement);
            console.log("Comments UI updated from dropped file.");
        }

        function updateIngredientStatusUI(statusData) {
             const status24hrContainer = document.getElementById('status-24hr');
             const status48hrContainer = document.getElementById('status-48hr');
             if (!status24hrContainer || !status48hrContainer) return console.error("Ingredient status containers missing.");

             // Clear existing dropdowns first
             const clearContainer = (container) => {
                  const existingDropdown = container.querySelector('select.status-dropdown');
                  if (existingDropdown) existingDropdown.remove();
             };
             clearContainer(status24hrContainer);
             clearContainer(status48hrContainer);

             let initialStatus24hr = 'bad';
             let initialStatus48hr = 'bad';
             statusData.forEach(row => {
                 const timeframe = row[0]?.toLowerCase().trim();
                 const statusText = row[1]?.trim().toLowerCase() || 'crit';
                 let mappedStatusValue = 'bad';
                 if (statusText === 'ok' || statusText === 'good') mappedStatusValue = 'good';
                 else if (statusText === 'caution' || statusText === 'warning') mappedStatusValue = 'warning';
                 if (timeframe === '24hr') initialStatus24hr = mappedStatusValue;
                 else if (timeframe === '48hr') initialStatus48hr = mappedStatusValue;
             });

             const handleStatusChange = (containerId, newStatus) => { console.log(`Status for ${containerId} changed to: ${newStatus}`); };
             const status24hrDropdown = createStatusDropdown(initialStatus24hr, (newStatus) => handleStatusChange('24hr', newStatus));
             status24hrContainer.appendChild(status24hrDropdown);
             const status48hrDropdown = createStatusDropdown(initialStatus48hr, (newStatus) => handleStatusChange('48hr', newStatus));
             status48hrContainer.appendChild(status48hrDropdown);
             console.log("Ingredient Status UI updated from dropped file.");
        }

        function updateMaterialShortagesUI(shortagesData) {
            const tableBody = document.getElementById('shortagesTableBody');
            const mainElement = document.querySelector('main');
            if (!tableBody) return console.error("Shortages table body missing.");

            tableBody.innerHTML = '';
            if (shortagesData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3">No shortages in file</td></tr>';
                if (mainElement) mainElement.classList.remove('many-shortages');
                return;
            }

            shortagesData.forEach(row => {
                const tr = document.createElement('tr');
                const tdMaterial = document.createElement('td');
                tdMaterial.textContent = row[0] || 'N/A';
                tdMaterial.classList.add('editable-text');
                tdMaterial.onclick = () => showEditModal(tdMaterial);
                tr.appendChild(tdMaterial);

                const tdQty = document.createElement('td');
                tdQty.textContent = row[1] || 'N/A';
                tdQty.classList.add('editable-text');
                tdQty.onclick = () => showEditModal(tdQty);
                tr.appendChild(tdQty);

                const tdETA = document.createElement('td');
                tdETA.textContent = formatDateWithSpaces(row[2]);
                 tdETA.classList.add('editable-text'); // Make it editable
                 tdETA.onclick = () => showEditModal(tdETA); // Add click listener
                tr.appendChild(tdETA);
                tableBody.appendChild(tr);
            });

            if (mainElement) {
                const shortageThreshold = 5;
                if (shortagesData.length > shortageThreshold) mainElement.classList.add('many-shortages');
                else mainElement.classList.remove('many-shortages');
            }
            console.log("Material Shortages UI updated from dropped file.");
        }

         // Simplified update for railcars - just re-renders the table based on dropped data
         // NOTE: This replaces the interactive state management from the original loadRailcars
        function updateRailcarsUI(railcarData) {
            const tableBody = document.getElementById('railcarsTableBody');
            const onSiteCountEl = document.getElementById('railOnSiteCount');
            const inYardCountEl = document.getElementById('railInYardCount');
            const totalCountEl = document.getElementById('railTotalCount');
            if (!tableBody || !onSiteCountEl || !inYardCountEl || !totalCountEl) return console.error("Railcar elements missing.");

            tableBody.innerHTML = '';
            let onSiteCount = 0;
            let inYardCount = 0;

            if (railcarData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No railcar data in file.</td></tr>';
                onSiteCountEl.textContent = '0';
                inYardCountEl.textContent = '0';
                totalCountEl.textContent = '0';
                return;
            }

            // Process data directly from the parsed CSV
             railcarData.forEach(row => {
                const tr = document.createElement('tr');
                // NOTE: Click listeners for editing state are NOT re-added here for simplicity
                // You would need to replicate the state management and listener setup from
                // the original loadRailcars if you want dropped files to make the table interactive again.

                const railNum = row[0] || 'N/A';
                const material = row[1] || 'N/A';
                const location = row[2] || 'N/A';
                const bol = row[3]?.toLowerCase() === 'true';
                const romer = row[4]?.toLowerCase() === 'true';
                const released = row[5]?.toLowerCase() === 'true';

                 // Update counts based on location
                 const locationLower = location.toLowerCase();
                 if (locationLower.includes('site')) onSiteCount++;
                 else if (locationLower.includes('yard')) inYardCount++;

                 // Create cells (without stateful interaction from original loadRailcars)
                tr.innerHTML = `
                    <td class="editable-text" onclick="showEditModal(this)">${railNum}</td>
                    <td class="editable-text" onclick="showEditModal(this)">${material}</td>
                    <td class="${locationLower.includes('site') ? 'status-good' : locationLower.includes('yard') ? 'status-caution' : 'status-bad'}">${location}</td>
                    <td class="${bol ? 'status-yes' : 'status-no'}">${bol ? 'Yes' : 'No'}</td>
                    <td class="${romer ? 'status-yes' : 'status-no'}">${romer ? 'Yes' : 'No'}</td>
                    <td class="${released ? 'status-yes' : 'status-no'}">${released ? 'Yes' : 'No'}</td>
                `;
                // Add onclick handlers to cells if needed (similar to shortages)
                 tr.querySelectorAll('td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6)').forEach(td => {
                     // You might want to add more complex click handlers here later
                     // For now, making location text editable as an example
                     if (td.cellIndex === 2) { // Location column
                        td.classList.add('editable-text');
                        td.onclick = () => showEditModal(td);
                     }
                    // Boolean columns could have toggle logic re-added if necessary
                 });

                tableBody.appendChild(tr);
            });

            // Update summary counts
            onSiteCountEl.textContent = onSiteCount;
            inYardCountEl.textContent = inYardCount;
            totalCountEl.textContent = onSiteCount + inYardCount;

             // Re-attach export button listener if needed (or ensure it uses latest data)
             // This simplified version doesn't store state like the original loadRailcars
             // so the export button added by loadRailcars might export old data.
             // A cleaner solution might involve making exportRailcarsToCSV read directly from the table.

            console.log("Railcars UI updated from dropped file (interaction state reset).");
        }

        function updateTopCycleCountsUI(topData) {
            for (let i = 1; i <= 3; i++) {
                const nameElement = document.getElementById(`top-cycle-item-${i}`);
                const costElement = document.getElementById(`top-cycle-cost-${i}`);
                if (nameElement && costElement) {
                    if (topData.length >= i) {
                        const row = topData[i - 1];
                        const itemName = row[0] || 'N/A';
                        const costValue = parseFloat(row[1]) || 0;
                        nameElement.textContent = itemName;
                        costElement.textContent = formatCurrency(costValue);
                        applyNumberFormatting(costElement, costValue);
                        nameElement.classList.add('editable-text'); nameElement.onclick = () => showEditModal(nameElement);
                        costElement.classList.add('editable-text'); costElement.onclick = () => showEditModal(costElement);
                    } else {
                        nameElement.textContent = '-'; costElement.textContent = '-'; costElement.classList.remove('positive', 'negative');
                    }
                }
            }
            console.log("Top Cycle Counts UI updated from dropped file.");
        }

        function updateTopScrapUI(topData) {
             for (let i = 1; i <= 3; i++) {
                const nameElement = document.getElementById(`top-scrap-item-${i}`);
                const costElement = document.getElementById(`top-scrap-cost-${i}`);
                if (nameElement && costElement) {
                    if (topData.length >= i) {
                        const row = topData[i - 1];
                        const itemName = row[0] || 'N/A';
                        const costValue = parseFloat(row[1]) || 0;
                        nameElement.textContent = itemName;
                        costElement.textContent = formatCurrency(costValue);
                        applyNumberFormatting(costElement, costValue);
                        nameElement.classList.add('editable-text'); nameElement.onclick = () => showEditModal(nameElement);
                        costElement.classList.add('editable-text'); costElement.onclick = () => showEditModal(costElement);
                    } else {
                        nameElement.textContent = '-'; costElement.textContent = '-'; costElement.classList.remove('positive', 'negative');
                    }
                }
            }
             console.log("Top Scrap UI updated from dropped file.");
        }

    } else {
        console.warn("Drop zone overlay element or body element not found. Drag and drop functionality disabled.");
    }
    // ===== END: Updated Drag and Drop Logic =====

    // --- Load Initial Data ---
    initialLoad();

    // --- Optional: Auto-refresh logic ---
    // const refreshInterval = 300000;
    // setInterval(initialLoad, refreshInterval);

}); // End DOMContentLoaded