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
    exportRailcarsToCSV, // Import needed for railcars
    scrambleAndUpdateElement // <-- Import the new function
} from './utils.js';
import { parseCSV } from './dataloader.js'; // Import the CSV parser

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Initializing...");

    // --- Variables to store current numeric totals ---
    let currentCycleTotal = 0;
    let currentScrapTotal = 0;

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
        setupEditModal(); // Set up the modal and define showEditModal globally FIRST

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
            console.log("Dashboard data loaded successfully and modal setup.");

            // --- Initialize stored totals after initial data load ---
            try {
                currentCycleTotal = parseFloat(document.getElementById('cycleCountTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                currentScrapTotal = parseFloat(document.getElementById('scrapTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                console.log(`Initialized totals: Cycle=${currentCycleTotal}, Scrap=${currentScrapTotal}`);
                // Optionally call recalculateFinancialTotal() here if the initial load calculation needs verification/sync
                // recalculateFinancialTotal(); // Might cause an extra scramble effect on load
            } catch (e) {
                console.error("Error initializing totals after load:", e);
                // Keep totals as 0 if DOM elements aren't ready
                currentCycleTotal = 0;
                currentScrapTotal = 0;
            }

        }).catch(error => {
            console.error("Error loading one or more dashboard sections:", error);
            // ** IMPORTANT: Check your browser's developer console (F12) for the specific error message! **
        });
    }

    // --- Theme Toggle Setup ---
    // (Keep existing theme toggle code)
    const themeToggleButton = document.getElementById('theme-toggle-icon-button');
    if (themeToggleButton) {
        const savedTheme = localStorage.getItem('dashboardTheme');
        if (savedTheme === 'light') document.body.classList.add('light-theme');
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('dashboardTheme', isLight ? 'light' : 'dark');
        });
    } else {
        console.warn("Theme toggle button not found.");
    }

    // ===== START: Updated Drag and Drop Logic =====
    const dropZoneOverlay = document.getElementById('drop-zone-overlay');
    const bodyElement = document.body;

    if (dropZoneOverlay && bodyElement) {
        let dragCounter = 0;

        // (Keep existing dragenter, dragover, dragleave listeners)
        bodyElement.addEventListener('dragenter', (event) => {
            event.preventDefault(); event.stopPropagation(); dragCounter++;
            if (event.dataTransfer?.types.includes('Files')) dropZoneOverlay.classList.add('drop-zone-visible');
        });
        bodyElement.addEventListener('dragover', (event) => {
            event.preventDefault(); event.stopPropagation();
            if (event.target === dropZoneOverlay || dropZoneOverlay.contains(event.target)) {
                 dropZoneOverlay.classList.add('drop-zone-active');
                 dropZoneOverlay.querySelector('.drop-zone-content p').textContent = "Drop file here to update...";
            } else {
                 dropZoneOverlay.classList.remove('drop-zone-active');
            }
        });
        bodyElement.addEventListener('dragleave', (event) => {
            event.preventDefault(); event.stopPropagation(); dragCounter--;
            if (dragCounter === 0) {
                dropZoneOverlay.classList.remove('drop-zone-visible', 'drop-zone-active');
                 dropZoneOverlay.querySelector('.drop-zone-content p').textContent = "Drop CSV file here to update relevant section";
            }
            if (event.target === dropZoneOverlay || dropZoneOverlay.contains(event.target)) {
                 dropZoneOverlay.classList.remove('drop-zone-active');
            }
        });

        bodyElement.addEventListener('drop', (event) => {
            event.preventDefault(); event.stopPropagation(); dragCounter = 0;
            dropZoneOverlay.classList.remove('drop-zone-visible', 'drop-zone-active');
            dropZoneOverlay.querySelector('.drop-zone-content p').textContent = "Drop CSV file here to update relevant section";

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                console.log(`Processing ${files.length} dropped file(s)...`);
                let filesProcessed = 0;
                let relevantFilesProcessed = false; // Track if cycle or scrap files are processed in this drop
                const totalFiles = files.length;

                for (const file of files) {
                    // console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`); // Less verbose logging
                    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            let processedRelevantInThisFile = false;
                            try {
                                const csvText = e.target.result;
                                const parsedData = parseCSV(csvText);
                                // console.log(`Parsed data for ${file.name}:`, parsedData); // Less verbose
                                if (parsedData.length > 0) {
                                    processedRelevantInThisFile = routeDroppedData(file.name, parsedData);
                                    if (processedRelevantInThisFile) {
                                        relevantFilesProcessed = true; // Mark that at least one relevant file was processed in this drop
                                    }
                                } else {
                                    console.warn(`Dropped CSV '${file.name}' is empty or has no data rows.`);
                                }
                            } catch (error) {
                                console.error(`Error processing dropped CSV '${file.name}':`, error);
                                alert(`Error reading or parsing '${file.name}'.`);
                            } finally {
                                filesProcessed++;
                                // Recalculate AFTER processing THIS file if it was relevant
                                if (processedRelevantInThisFile) {
                                     recalculateFinancialTotal(); // Use the updated stored variables
                                }
                                if (filesProcessed === totalFiles) {
                                    updateTimestamp();
                                    console.log("All dropped files processed.");
                                    // Optional: Final recalculation just in case, though might be redundant
                                    // if (relevantFilesProcessed) recalculateFinancialTotal();
                                }
                            }
                        };
                        reader.onerror = (e) => {
                            console.error(`Error reading file '${file.name}':`, e);
                            alert(`Could not read the dropped file '${file.name}'.`);
                            filesProcessed++;
                            if (filesProcessed === totalFiles) updateTimestamp();
                        };
                        reader.readAsText(file);
                    } else {
                        console.log(`Incorrect file type dropped: ${file.name} (${file.type}). Ignoring.`);
                        filesProcessed++;
                        if (filesProcessed === totalFiles) updateTimestamp();
                    }
                } // --- End loop ---
            }
        });

        // --- Function to route dropped data ---
        // Returns true if scrap or cycle counts were processed
        function routeDroppedData(filename, data) {
            let isRelevant = false;
            switch (filename.toLowerCase()) {
                case 'scrap_transactions.csv':
                    updateScrapUI(data);
                    isRelevant = true;
                    break;
                case 'cycle_counts.csv':
                    updateCycleCountsUI(data);
                    isRelevant = true;
                    break;
                case 'cogi_errors.csv':         updateCogiErrorsUI(data); break;
                case 'dashboard_comments.csv':  updateCommentsUI(data); break;
                case 'ingredients_status.csv':  updateIngredientStatusUI(data); break;
                case 'material_shortages.csv':  updateMaterialShortagesUI(data); break;
                case 'railcars.csv':            updateRailcarsUI(data); break;
                case 'top_cycle_counts.csv':    updateTopCycleCountsUI(data); break;
                case 'top_scrap.csv':           updateTopScrapUI(data); break;
                default:
                    console.log(`Dropped CSV '${filename}' is not recognized for UI updates.`);
                    break;
            }
            return isRelevant;
        }

        // --- UI Update Functions ---

        // MODIFIED: Uses stored variables for calculation
        function recalculateFinancialTotal() {
            const financialTotalEl = document.getElementById('financialTotalPTD');
            if (!financialTotalEl) {
                console.error("Financial total element not found during recalculation!");
                return;
            }

            // Use the stored JS variables for calculation
            const grandTotal = currentCycleTotal + currentScrapTotal;

            console.log(`Recalculating Total: Stored Cycle=${currentCycleTotal}, Stored Scrap=${currentScrapTotal} => Grand Total=${grandTotal}`); // Debug log

            // Update the DOM element with the calculated total
            scrambleAndUpdateElement(financialTotalEl, grandTotal, 800, formatCurrency, applyNumberFormatting);
        }

        // MODIFIED: Updates stored variable
        function updateScrapUI(scrapData) {
            const scrapTableBody = document.getElementById('scrapTransactionsWeeklyBody');
            const scrapTotalEl = document.getElementById('scrapTotal');
            if (!scrapTableBody || !scrapTotalEl) return console.error("Scrap UI elements missing.");

            scrapTableBody.innerHTML = '';
            const row = scrapData[0];
            if (!row) return console.error("Scrap data format error.");

            const tr = document.createElement('tr');
            let newScrapTotal = 0; // Calculate new total from data
            for (let i = 0; i < 4; i++) {
                 const td = document.createElement('td');
                 const value = parseFloat(row[i]) || 0;
                 newScrapTotal += value; // Sum the new total
                 td.classList.add('editable-text');
                 td.onclick = () => showEditModal(td);
                 tr.appendChild(td);
                 scrambleAndUpdateElement(td, value, 700, formatCurrency, applyNumberFormatting);
            }
            scrapTableBody.appendChild(tr);

            // Update the DOM span for scrap total
            scrambleAndUpdateElement(scrapTotalEl, newScrapTotal, 700, formatCurrency, applyNumberFormatting);

            // --- Update the stored variable ---
            currentScrapTotal = newScrapTotal;
            console.log(`Scrap UI updated. Stored Scrap Total: ${currentScrapTotal}`);
        }

        // MODIFIED: Updates stored variable
        function updateCycleCountsUI(cycleData) {
            const cycleTableBody = document.getElementById('cycleCountsWeeklyBody');
            const cycleTotalEl = document.getElementById('cycleCountTotal');
            if (!cycleTableBody || !cycleTotalEl) return console.error("Cycle Count UI elements missing.");

            cycleTableBody.innerHTML = '';
            const row = cycleData[0];
             if (!row) return console.error("Cycle count data format error.");

            const tr = document.createElement('tr');
            let newCycleTotal = 0; // Calculate new total from data
            for (let i = 0; i < 4; i++) {
                 const td = document.createElement('td');
                 const value = parseFloat(row[i]) || 0;
                 newCycleTotal += value; // Sum the new total
                 td.classList.add('editable-text');
                 td.onclick = () => showEditModal(td);
                 tr.appendChild(td);
                 scrambleAndUpdateElement(td, value, 700, formatCurrency, applyNumberFormatting);
            }
            cycleTableBody.appendChild(tr);

            // Update the DOM span for cycle total
            scrambleAndUpdateElement(cycleTotalEl, newCycleTotal, 700, formatCurrency, applyNumberFormatting);

            // --- Update the stored variable ---
            currentCycleTotal = newCycleTotal;
            console.log(`Cycle Counts UI updated. Stored Cycle Total: ${currentCycleTotal}`);
        }

        // --- Other UI update functions (updateCogiErrorsUI, updateCommentsUI, etc.) ---
        // (No changes needed in these)
        function updateCogiErrorsUI(cogiData) {
            const batchingInput = document.getElementById('cogiBatchingCount');
            const packagingInput = document.getElementById('cogiPackagingCount');
            if (!batchingInput || !packagingInput) return console.error("COGI input elements missing.");
            let batchingCount = 0, packagingCount = 0;
            cogiData.forEach(row => {
                const area = row[0]?.toLowerCase().trim();
                const count = parseInt(row[1], 10) || 0;
                if (area === 'batching') batchingCount = count;
                else if (area === 'packaging') packagingCount = count;
            });
            const inputStyler = (el, val) => { el.value = val; applyNumberFormatting(el, val > 0 ? -1 : 0); };
            scrambleAndUpdateElement(batchingInput, batchingCount, 700, val => val, inputStyler);
            scrambleAndUpdateElement(packagingInput, packagingCount, 700, val => val, inputStyler);
            console.log("COGI Errors UI updated.");
        }

        function updateCommentsUI(commentsData) {
            const commentsElement = document.getElementById('dashboardCommentsArea');
            if (!commentsElement) return console.error("Comments area element missing.");
            const commentsText = commentsData.map(row => row[0] || '').join('\n').trim() || 'No comments in file.';
            commentsElement.classList.add('editable-text');
            commentsElement.dataset.multiline = 'true';
            commentsElement.onclick = () => showEditModal(commentsElement);
            scrambleAndUpdateElement(commentsElement, commentsText, 1000);
            console.log("Comments UI updated.");
        }

        function updateIngredientStatusUI(statusData) {
             const status24hrContainer = document.getElementById('status-24hr');
             const status48hrContainer = document.getElementById('status-48hr');
             if (!status24hrContainer || !status48hrContainer) return console.error("Ingredient status containers missing.");
             const clearContainer = (container) => { container.querySelector('select.status-dropdown')?.remove(); };
             clearContainer(status24hrContainer); clearContainer(status48hrContainer);
             let initialStatus24hr = 'bad', initialStatus48hr = 'bad';
             statusData.forEach(row => {
                 const timeframe = row[0]?.toLowerCase().trim();
                 const statusText = row[1]?.trim().toLowerCase() || 'crit';
                 let mappedStatusValue = 'bad';
                 if (statusText === 'ok' || statusText === 'good') mappedStatusValue = 'good';
                 else if (statusText === 'caution' || statusText === 'warning') mappedStatusValue = 'warning';
                 if (timeframe === '24hr') initialStatus24hr = mappedStatusValue;
                 else if (timeframe === '48hr') initialStatus48hr = mappedStatusValue;
             });
             const handleStatusChange = (containerId, newStatus) => console.log(`Status for ${containerId} changed to: ${newStatus}`);
             status24hrContainer.appendChild(createStatusDropdown(initialStatus24hr, (newStatus) => handleStatusChange('24hr', newStatus)));
             status48hrContainer.appendChild(createStatusDropdown(initialStatus48hr, (newStatus) => handleStatusChange('48hr', newStatus)));
             console.log("Ingredient Status UI updated.");
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
            const fragment = document.createDocumentFragment();
            shortagesData.forEach(row => {
                const tr = document.createElement('tr');
                const material = row[0] || 'N/A', qty = row[1] || 'N/A', eta = formatDateWithSpaces(row[2]);
                const tdMaterial = document.createElement('td'), tdQty = document.createElement('td'), tdETA = document.createElement('td');
                tdMaterial.classList.add('editable-text'); tdMaterial.onclick = () => showEditModal(tdMaterial); tr.appendChild(tdMaterial);
                tdQty.classList.add('editable-text'); tdQty.onclick = () => showEditModal(tdQty); tr.appendChild(tdQty);
                tdETA.classList.add('editable-text'); tdETA.onclick = () => showEditModal(tdETA); tr.appendChild(tdETA);
                fragment.appendChild(tr);
                scrambleAndUpdateElement(tdMaterial, material, 700);
                scrambleAndUpdateElement(tdQty, qty, 700);
                scrambleAndUpdateElement(tdETA, eta, 700);
            });
            tableBody.appendChild(fragment);
            if (mainElement) {
                const shortageThreshold = 5;
                mainElement.classList.toggle('many-shortages', shortagesData.length > shortageThreshold);
            }
            console.log("Material Shortages UI updated.");
        }

        function updateRailcarsUI(railcarData) {
            const tableBody = document.getElementById('railcarsTableBody');
            const onSiteCountEl = document.getElementById('railOnSiteCount'), inYardCountEl = document.getElementById('railInYardCount'), totalCountEl = document.getElementById('railTotalCount');
            if (!tableBody || !onSiteCountEl || !inYardCountEl || !totalCountEl) return console.error("Railcar elements missing.");
            tableBody.innerHTML = '';
            let onSiteCount = 0, inYardCount = 0;
            if (railcarData.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No railcar data in file.</td></tr>';
                 scrambleAndUpdateElement(onSiteCountEl, 0, 500); scrambleAndUpdateElement(inYardCountEl, 0, 500); scrambleAndUpdateElement(totalCountEl, 0, 500);
                return;
            }
            const fragment = document.createDocumentFragment();
            railcarData.forEach(row => {
                const tr = document.createElement('tr');
                const railNum = row[0] || 'N/A', material = row[1] || 'N/A', location = row[2] || 'N/A';
                const bol = row[3]?.toLowerCase() === 'true', romer = row[4]?.toLowerCase() === 'true', released = row[5]?.toLowerCase() === 'true';
                const locationLower = location.toLowerCase();
                if (locationLower.includes('site')) onSiteCount++; else if (locationLower.includes('yard')) inYardCount++;
                 tr.innerHTML = `<td class="editable-text">${railNum}</td><td class="editable-text">${material}</td><td class="${locationLower.includes('site') ? 'status-good' : locationLower.includes('yard') ? 'status-caution' : 'status-bad'}">${location}</td><td class="${bol ? 'status-yes' : 'status-no'}">${bol ? 'Yes' : 'No'}</td><td class="${romer ? 'status-yes' : 'status-no'}">${romer ? 'Yes' : 'No'}</td><td class="${released ? 'status-yes' : 'status-no'}">${released ? 'Yes' : 'No'}</td>`;
                tr.querySelectorAll('.editable-text').forEach(td => { td.onclick = () => showEditModal(td); });
                fragment.appendChild(tr);
            });
            tableBody.appendChild(fragment);
            scrambleAndUpdateElement(onSiteCountEl, onSiteCount, 500); scrambleAndUpdateElement(inYardCountEl, inYardCount, 500); scrambleAndUpdateElement(totalCountEl, onSiteCount + inYardCount, 500);
            console.log("Railcars UI updated.");
        }

        function updateTopCycleCountsUI(topData) {
            for (let i = 1; i <= 3; i++) {
                const nameElement = document.getElementById(`top-cycle-item-${i}`), costElement = document.getElementById(`top-cycle-cost-${i}`);
                if (nameElement && costElement) {
                    const row = topData[i - 1], itemName = row?.[0] || '-', costValue = parseFloat(row?.[1]) || 0;
                    nameElement.classList.add('editable-text'); nameElement.onclick = () => showEditModal(nameElement);
                    costElement.classList.add('editable-text'); costElement.onclick = () => showEditModal(costElement);
                    scrambleAndUpdateElement(nameElement, itemName, 700);
                    scrambleAndUpdateElement(costElement, costValue, 700, formatCurrency, applyNumberFormatting);
                    if (itemName === '-') costElement.classList.remove('positive', 'negative');
                }
            }
            console.log("Top Cycle Counts UI updated.");
        }

        function updateTopScrapUI(topData) {
             for (let i = 1; i <= 3; i++) {
                const nameElement = document.getElementById(`top-scrap-item-${i}`), costElement = document.getElementById(`top-scrap-cost-${i}`);
                if (nameElement && costElement) {
                    const row = topData[i - 1], itemName = row?.[0] || '-', costValue = parseFloat(row?.[1]) || 0;
                    nameElement.classList.add('editable-text'); nameElement.onclick = () => showEditModal(nameElement);
                    costElement.classList.add('editable-text'); costElement.onclick = () => showEditModal(costElement);
                    scrambleAndUpdateElement(nameElement, itemName, 700);
                    scrambleAndUpdateElement(costElement, costValue, 700, formatCurrency, applyNumberFormatting);
                    if (itemName === '-') costElement.classList.remove('positive', 'negative');
                }
            }
             console.log("Top Scrap UI updated.");
        }
        // --- End UI Update Functions ---

    } // End of drag and drop setup check

    // --- Load Initial Data ---
    initialLoad();

    // --- Optional: Auto-refresh logic ---
    // const refreshInterval = 300000; // 5 minutes
    // setInterval(initialLoad, refreshInterval);

}); // End DOMContentLoaded