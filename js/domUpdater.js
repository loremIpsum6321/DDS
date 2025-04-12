// DDS/js/domUpdater.js
import { fetchCSVData } from './dataloader.js'; // Make sure this line exists
import { exportRailcarsToCSV } from './utils.js';
import {
    createStatusDropdown,
    formatCurrency,
    applyNumberFormatting, // Make sure this is imported
    formatDateWithSpaces,
    statusOptionsDefinition
} from './utils.js';
// --- Populate Dashboard Sections ---

/**
 * Loads and displays the ingredient status using dropdowns.
 */
export async function loadIngredientStatus() {
    const data = await fetchCSVData('data/ingredients_status.csv');
    const status24hrContainer = document.getElementById('status-24hr');
    const status48hrContainer = document.getElementById('status-48hr');
    const options = statusOptionsDefinition; // Use imported options
    
    if (!status24hrContainer || !status48hrContainer) {
        console.error("Ingredient status containers (#status-24hr, #status-48hr) not found!");
        return;
    }

    // Clear existing indicators/dropdowns first
    const clearContainer = (container) => {
         const oldIndicator = container.querySelector('.status-indicator');
         if (oldIndicator) oldIndicator.remove();
         const existingDropdown = container.querySelector('select.status-dropdown');
         if (existingDropdown) existingDropdown.remove();
    };
    clearContainer(status24hrContainer);
    clearContainer(status48hrContainer);

    
    // --- Find initial statuses ---
    let initialStatus24hr = 'bad'; // Default to 'bad'
    let initialStatus48hr = 'bad'; // Default to 'bad'

    data.forEach(row => {
        const timeframe = row[0]?.toLowerCase().trim();
        const statusText = row[1]?.trim().toLowerCase() || 'crit'; // Default text, lowercase

        // Map CSV values ('ok', 'warning', 'crit', etc.) to dropdown values ('good', 'warning', 'bad')
        let mappedStatusValue = 'bad'; // Default mapping
        if (statusText === 'ok' || statusText === 'good') {
            mappedStatusValue = 'good';
        } else if (statusText === 'caution' || statusText === 'warning') {
            mappedStatusValue = 'warning';
        } // 'bad' or 'crit' or others map to 'bad'

        if (timeframe === '24hr') {
            initialStatus24hr = mappedStatusValue;
        } else if (timeframe === '48hr') {
            initialStatus48hr = mappedStatusValue;
        }
    });
    
    // --- Status Update Callback (Example) ---
     const handleStatusChange = (containerId, newStatus) => {
         console.log(`Status for ${containerId} changed to: ${newStatus}`);
         // Add logic here to save the status update if needed (e.g., send to a server)
     };

    // --- Create and append dropdowns ---
    const status24hrDropdown = createStatusDropdown(initialStatus24hr, (newStatus) => {
        handleStatusChange('24hr', newStatus);
    });
    status24hrContainer.appendChild(status24hrDropdown);

    const status48hrDropdown = createStatusDropdown(initialStatus48hr, (newStatus) => {
        handleStatusChange('48hr', newStatus);
    });
    status48hrContainer.appendChild(status48hrDropdown);
}
    
/**
 * Loads and displays material shortages data.
 * MODIFIED: Adds/removes 'many-shortages' class to main based on count.
 */
export async function loadMaterialShortages() {
    const data = await fetchCSVData('data/material_shortages.csv');
    const tableBody = document.getElementById('shortagesTableBody');
    const mainElement = document.querySelector('main'); // Get the main element
    const shortageThreshold = 5; // Define threshold for switching layout

    // Check if critical elements exist
    if (!tableBody) {
        console.error("Shortages table body (#shortagesTableBody) not found!");
        return; // Exit if table body is missing
    }
    if (!mainElement) {
        // Warn if main element is missing, but proceed with table population
        console.warn("Main element (<main>) not found, cannot toggle 'many-shortages' class.");
    }

    tableBody.innerHTML = ''; // Clear loading/previous data

    // Handle case with no shortages
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No shortages</td></tr>';
        // Ensure class is removed if there are no shortages and main element exists
        if (mainElement) {
            mainElement.classList.remove('many-shortages');
        }
        return; // Exit after handling no data
    }

    // Populate the table with shortage data
    data.forEach(row => {
        const tr = document.createElement('tr');

        // Material
         const tdMaterial = document.createElement('td');
         tdMaterial.textContent = row[0] || 'N/A';
         tdMaterial.classList.add('editable-text'); // <-- Add this class
         tdMaterial.onclick = () => showEditModal(tdMaterial); // <-- Add this click listener
         tr.appendChild(tdMaterial);

        // Short Qty
         const tdQty = document.createElement('td');
         tdQty.textContent = row[1] || 'N/A';
         tdQty.classList.add('editable-text'); // <-- Add class
         tdQty.onclick = () => showEditModal(tdQty); // <-- Add listener
         tr.appendChild(tdQty);

        // ETA
        const tdETA = document.createElement('td');
        tdETA.textContent = formatDateWithSpaces(row[2]);
        tdETA.classList.add('editable-text'); // Make it editable
        tdETA.onclick = () => showEditModal(tdETA); // Add click listener

        tr.appendChild(tdETA);

        tableBody.appendChild(tr);
    });

    // *** CORRECTED LOGIC PLACEMENT ***
    // Check if number of shortages exceeds threshold and toggle class
    // Only run this if mainElement was found earlier
    if (mainElement) {
        if (data.length > shortageThreshold) {
            mainElement.classList.add('many-shortages');
        } else {
            mainElement.classList.remove('many-shortages');
        }
    }
    // *** END CORRECTED LOGIC PLACEMENT ***

} // <<< Function ends here
/**
 * Loads and displays railcar overview data and summary counts.
 * Adds click listeners for editing Location, BOL, Romer, and Released.
 */
export async function loadRailcars() {
    const data = await fetchCSVData('data/railcars.csv');
    const tableBody = document.getElementById('railcarsTableBody');
    const onSiteCountEl = document.getElementById('railOnSiteCount');
    const inYardCountEl = document.getElementById('railInYardCount');
    const totalCountEl = document.getElementById('railTotalCount');

    if (!tableBody || !onSiteCountEl || !inYardCountEl || !totalCountEl) {
        console.error("Railcar elements not found!");
        return;
    }

    tableBody.innerHTML = ''; // Clear loading/previous data
    let onSiteCount = 0;
    let inYardCount = 0;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No railcar data available.</td></tr>';
        onSiteCountEl.textContent = '0';
        inYardCountEl.textContent = '0';
        totalCountEl.textContent = '0';
        return;
    }

    // Store the state in memory (optional, for persistence you'd need more)
    // Initialize with data from CSV
    let railcarStates = data.map(row => ({
        railNum: row[0],
        material: row[1],
        location: row[2] || 'N/A',
        bol: row[3]?.toLowerCase() === 'true',
        romer: row[4]?.toLowerCase() === 'true',
        released: row[5]?.toLowerCase() === 'true',
        // Keep original row data if needed: originalRow: row
    }));


    const updateCounts = () => {
        onSiteCount = railcarStates.filter(state => state.location?.toLowerCase().includes('site')).length;
        inYardCount = railcarStates.filter(state => state.location?.toLowerCase().includes('yard')).length;
        onSiteCountEl.textContent = onSiteCount;
        inYardCountEl.textContent = inYardCount;
        totalCountEl.textContent = onSiteCount + inYardCount; // Assuming Transit isn't counted in totals
    };

    // Initial rendering function
    const renderTable = () => {
        tableBody.innerHTML = ''; // Clear table before re-rendering
        railcarStates.forEach((state, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = index; // Store index for easy lookup

            // Rail #
             const tdRailNum = document.createElement('td');
             tdRailNum.textContent = state.railNum || 'N/A';
             tdRailNum.classList.add('editable-text'); // <-- Add class
             tdRailNum.onclick = () => showEditModal(tdRailNum); // <-- Add listener
             tr.appendChild(tdRailNum);

            // Material
            const tdMaterial = document.createElement('td');
            tdMaterial.textContent = state.material || 'N/A';
            tdMaterial.classList.add('editable-text'); // Make it editable
            tdMaterial.onclick = () => showEditModal(tdMaterial); // Add click listener
            tr.appendChild(tdMaterial);

            // --- Location (Editable) ---
            const tdLocation = document.createElement('td');
            const locationText = state.location || 'N/A';
            const locationLower = locationText.toLowerCase();
            tdLocation.textContent = locationText;
            tdLocation.style.cursor = 'pointer'; // Indicate clickable

            // Set initial class based on state
            tdLocation.classList.remove('status-good', 'status-caution', 'status-bad'); // Clear previous
            if (locationLower.includes('site')) {
                tdLocation.classList.add('status-good');
            } else if (locationLower.includes('yard')) {
                tdLocation.classList.add('status-caution');
            } else { // Includes 'transit' or others
                tdLocation.classList.add('status-bad');
            }

            // Location Click Listener
            tdLocation.addEventListener('click', () => {
                const currentStateIndex = parseInt(tr.dataset.index); // Get index from row
                const currentLoc = railcarStates[currentStateIndex].location?.toLowerCase();
                const cycle = ['Site', 'Yard', 'Transit'];
                let nextLoc = 'Site'; // Default if current is unknown

                if (currentLoc.includes('site')) {
                    nextLoc = 'Yard';
                } else if (currentLoc.includes('yard')) {
                    nextLoc = 'Transit';
                } else if (currentLoc.includes('transit')) {
                    nextLoc = 'Site';
                }

                // Update state
                railcarStates[currentStateIndex].location = nextLoc;

                // Re-render the table and update counts
                renderTable();
                updateCounts();
                console.log(`Railcar ${railcarStates[currentStateIndex].railNum} location changed to: ${nextLoc}`);
                 // Add logic here to save changes if needed (e.g., API call)
            });
            tr.appendChild(tdLocation);


            // --- Helper function for creating TOGGLEABLE Yes/No status cells ---
            const createToggleStatusCell = (value, stateKey) => {
                const td = document.createElement('td');
                td.style.cursor = 'pointer'; // Indicate clickable
                td.dataset.stateKey = stateKey; // Store which state this cell controls

                const updateCellAppearance = (currentValue) => {
                    td.textContent = currentValue ? 'Yes' : 'No';
                    td.classList.remove('status-yes', 'status-no');
                    td.classList.add(currentValue ? 'status-yes' : 'status-no');
                };

                // Set initial appearance
                updateCellAppearance(value);

                // Click Listener
                td.addEventListener('click', () => {
                    const currentStateIndex = parseInt(tr.dataset.index); // Get index from row
                    const key = td.dataset.stateKey;
                    const currentBoolValue = railcarStates[currentStateIndex][key];

                    // Toggle the boolean state
                    railcarStates[currentStateIndex][key] = !currentBoolValue;

                    // Update cell appearance directly (no need to re-render whole table)
                    updateCellAppearance(railcarStates[currentStateIndex][key]);

                    console.log(`Railcar ${railcarStates[currentStateIndex].railNum} ${key} changed to: ${railcarStates[currentStateIndex][key]}`);
                    // Add logic here to save changes if needed (e.g., API call)
                });
                return td;
            };

            // --- BOL (Editable) ---
            tr.appendChild(createToggleStatusCell(state.bol, 'bol'));
            // --- Romer (Editable) ---
            tr.appendChild(createToggleStatusCell(state.romer, 'romer'));
            // --- Released (Editable) ---
            tr.appendChild(createToggleStatusCell(state.released, 'released'));


            tableBody.appendChild(tr);
        });
         // Apply initial counts after rendering
         updateCounts();
    };

    // Initial render
    renderTable();
    // ... (keep all the existing code at the beginning of the function) ...
    // fetchCSVData, checks, railcarStates = data.map(...), updateCounts, renderTable definition ...

    // Initial render
    renderTable(); // Keep this call

    // ---> PASTE THE BUTTON CODE HERE <---
    const sectionElement = document.getElementById('railcar-overview'); // Get the parent section
    if (sectionElement) {
        let exportButton = sectionElement.querySelector('.export-railcars-btn');
        if (!exportButton) { // Only add the button if it doesn't exist
            exportButton = document.createElement('button');
            exportButton.textContent = 'Export Railcars';
            exportButton.classList.add('export-railcars-btn'); // Add a class for styling if needed
            exportButton.style.marginTop = '1rem'; // Add some spacing

            // Append the button (e.g., after the table container)
            const tableContainer = sectionElement.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentElement('afterend', exportButton);
            } else {
                sectionElement.appendChild(exportButton); // Fallback append
            }
        }

        // Remove any old listener before adding a new one to prevent duplicates on refresh
        // This cloning technique helps ensure the listener is fresh each time loadRailcars runs
        exportButton.replaceWith(exportButton.cloneNode(true));
        exportButton = sectionElement.querySelector('.export-railcars-btn'); // Re-select the cloned button

        // Add click listener to the button
        exportButton.addEventListener('click', () => {
            // Now, this listener has access to the 'railcarStates' variable from the outer function scope
            console.log("Exporting railcar data:", railcarStates); // Check the console - this should show the array now
            if (typeof exportRailcarsToCSV === 'function') { // Check if the function exists
                 exportRailcarsToCSV(railcarStates); // Call the export function
            } else {
                 console.error("exportRailcarsToCSV function is not defined or not imported.");
                 alert("Error: Export function not available.");
            }
        });
    }
}
    
/**
 * Loads and displays inventory counts (Cycle and Scrap).
 */
export async function loadInventoryCounts() {
    // --- Cycle Counts ---
    const cycleData = await fetchCSVData('data/cycle_counts.csv');
    const cycleTableBody = document.getElementById('cycleCountsWeeklyBody');
    const cycleTotalEl = document.getElementById('cycleCountTotal');

    if (cycleTableBody && cycleTotalEl) {
        cycleTableBody.innerHTML = ''; // Clear loading
        if (cycleData.length > 0) {
            const row = cycleData[0]; // Assume first row has the data
            const tr = document.createElement('tr');
            
            let cycleTotal = 0;
            // W1 to W4 (or however many columns are in the CSV)
            for (let i = 0; i < 4; i++) {
                const td = document.createElement('td');
                const value = parseFloat(row[i]) || 0; // Default to 0 if empty
                td.textContent = formatCurrency(value);
                applyNumberFormatting(td, value);
                td.classList.add('editable-text'); // <-- Add class
                td.onclick = () => showEditModal(td); // <-- Add listener
                tr.appendChild(td);
            }
            cycleTableBody.appendChild(tr);
            
            // Total PTD
            // Calculate the total from the values in the row, ensuring they are numbers
             for (let i = 0; i < 4; i++) {
                cycleTotal += parseFloat(row[i]) || 0;
            }
            const totalValue = cycleTotal.toString();
            cycleTotalEl.textContent = formatCurrency(totalValue);
            applyNumberFormatting(cycleTotalEl, cycleTotal); // Apply to the span

        } else {
            cycleTableBody.innerHTML = '<tr><td colspan="4">No data</td></tr>';
            cycleTotalEl.textContent = formatCurrency('0');
             applyNumberFormatting(cycleTotalEl, '0');
        }
    } else {
         console.error("Cycle count elements not found!");
    } 

    // --- Scrap Transactions ---
    const scrapData = await fetchCSVData('data/scrap_transactions.csv');
    const scrapTableBody = document.getElementById('scrapTransactionsWeeklyBody');
    const scrapTotalEl = document.getElementById('scrapTotal');

     if (scrapTableBody && scrapTotalEl) {
        scrapTableBody.innerHTML = ''; // Clear loading
        if (scrapData.length > 0) {
            const row = scrapData[0];
            const tr = document.createElement('tr');
            let scrapTotal = 0;
            // W1 to W4 (or however many columns are in the CSV)
             for (let i = 0; i < 4; i++) {
                const td = document.createElement('td');
                const value = parseFloat(row[i]) || 0; // Default to 0 if empty
                scrapTotal += parseFloat(value);
                td.textContent = formatCurrency(value);
                // Scrap values are often negative, apply standard +/- coloring
                applyNumberFormatting(td, value);
                 // If you ALWAYS want non-zero scrap RED, uncomment below:
                 td.classList.add('editable-text'); // Make it editable
                 td.onclick = () => showEditModal(td); // Add click listener
                 // const number = parseFloat(value);
                 // if (!isNaN(number) && number !== 0) {
                 //    td.classList.remove('positive'); // Remove potential positive class
                 //    td.classList.add('negative'); // Force red if non-zero scrap
                 // }
                tr.appendChild(td);
            }
            scrapTableBody.appendChild(tr);
            
            // Total PTD
            const totalValue = scrapTotal.toString();
            scrapTotalEl.textContent = formatCurrency(totalValue);
             applyNumberFormatting(scrapTotalEl, scrapTotal);
             // If you ALWAYS want non-zero total scrap RED, uncomment below:
             // const totalNumber = parseFloat(totalValue);
             // if (!isNaN(totalNumber) && totalNumber !== 0) {
             //    scrapTotalEl.classList.remove('positive');
             //    scrapTotalEl.classList.add('negative');
             // }

        } else { 
            scrapTableBody.innerHTML = '<tr><td colspan="4">No data</td></tr>';
            scrapTotalEl.textContent = formatCurrency('0');
            applyNumberFormatting(scrapTotalEl, '0');
        }
    } else {
         console.error("Scrap transaction elements not found!"); 
    }
}

/**
 * Loads and displays COGI error counts in the header.
 */
// /**
//  * Loads and displays COGI error counts in the header.
//  */
export async function loadCogiErrors() {
    const data = await fetchCSVData('data/cogi_errors.csv');
    const batchingInput = document.getElementById('cogiBatchingCount'); // Get input element
    const packagingInput = document.getElementById('cogiPackagingCount'); // Get input element

    if (!batchingInput || !packagingInput) {
        console.error("COGI input elements not found!");
        return;
    }

    let batchingCount = 0;
    let packagingCount = 0;

    data.forEach(row => {
        // Assumes CSV columns: Area, Count
        const area = row[0]?.toLowerCase().trim();
        const count = parseInt(row[1], 10) || 0; // Use parseInt for whole numbers

        if (area === 'batching') {
            batchingCount += count;
        } else if (area === 'packaging') {
            packagingCount += count;
        }
    });
    batchingInput.value = batchingCount;
    packagingInput.value = packagingCount;
    // Apply formatting (treat any count > 0 as 'negative'/bad)
    applyNumberFormatting(batchingInput, batchingCount > 0 ? -1 : 0); // Use -1 to trigger negative class
    applyNumberFormatting(packagingInput, packagingCount > 0 ? -1 : 0); // Use -1 to trigger negative class
}
/**
 * Calculates and displays the total PTD from Cycle Counts and Scrap.
 * Relies on data already fetched by loadInventoryCounts or fetches it.
 * NOTE: This assumes loadInventoryCounts populates global vars or refetches.
 * A better approach might be to have loadInventoryCounts return the totals.
 * For simplicity here, we will refetch.
 */
export async function loadFinancialInsights() {
    const totalElement = document.getElementById('financialTotalPTD');
    if (!totalElement) {
         console.error("Financial total PTD element not found!");
         return;
    }

    try {
        // Fetch data directly - ensures we have the latest PTD values
        const cycleData = await fetchCSVData('data/cycle_counts.csv');
        const scrapData = await fetchCSVData('data/scrap_transactions.csv');

        let cycleTotalPTD = 0;
        if (cycleData.length > 0) {
             // Assuming TotalPTD is the sum of the first 4 columns
             cycleTotalPTD = (parseFloat(cycleData[0][0]) || 0) + (parseFloat(cycleData[0][1]) || 0) + (parseFloat(cycleData[0][2]) || 0) + (parseFloat(cycleData[0][3]) || 0);
        }

        let scrapTotalPTD = 0;
        if (scrapData.length > 0) {
             // Assuming TotalPTD is the sum of the first 4 columns
             scrapTotalPTD = (parseFloat(scrapData[0][0]) || 0) + (parseFloat(scrapData[0][1]) || 0) + (parseFloat(scrapData[0][2]) || 0) + (parseFloat(scrapData[0][3]) || 0);
        }

        const grandTotal = cycleTotalPTD + scrapTotalPTD;

        totalElement.textContent = formatCurrency(grandTotal);
        applyNumberFormatting(totalElement, grandTotal);

    } catch (error) {
        console.error("Error loading data for Financial Insights Total:", error);
        totalElement.textContent = 'Error';
        totalElement.classList.add('negative'); // Show error in red
    } 
}


/**
 * Loads and displays the top 3 cycle count adjustments.
 */
export async function loadTopCycleCounts() {
    const data = await fetchCSVData('data/top_cycle_counts.csv');

    for (let i = 1; i <= 3; i++) {
        const nameElement = document.getElementById(`top-cycle-item-${i}`);
        const costElement = document.getElementById(`top-cycle-cost-${i}`);

        if (nameElement && costElement) {
            if (data.length >= i) {
                const row = data[i - 1]; // Data is 0-indexed
                const itemName = row[0] || 'N/A';
                const costValue = parseFloat(row[1]) || 0;

                nameElement.textContent = itemName;
                costElement.textContent = formatCurrency(costValue);
                applyNumberFormatting(costElement, costValue);
                nameElement.classList.add('editable-text'); // <-- Add class
                nameElement.onclick = () => showEditModal(nameElement); // <-- Add listener
                costElement.classList.add('editable-text'); // <-- Add class
                costElement.onclick = () => showEditModal(costElement); // <-- Add listener
            } else {
                // Clear fields if less than 3 items in CSV
                nameElement.textContent = '-';
                costElement.textContent = '-';
                 costElement.classList.remove('positive', 'negative');
            }
        } else {
             console.error(`Elements for top cycle count #${i} not found!`);
        }
    }
}

/**
 * Loads and displays the top 3 scrap items.
 */
export async function loadTopScrap() {
    const data = await fetchCSVData('data/top_scrap.csv');

     for (let i = 1; i <= 3; i++) {
        const nameElement = document.getElementById(`top-scrap-item-${i}`);
        const costElement = document.getElementById(`top-scrap-cost-${i}`);

        if (nameElement && costElement) {
            if (data.length >= i) {
                const row = data[i - 1]; // Data is 0-indexed
                const itemName = row[0] || 'N/A';
                const costValue = parseFloat(row[1]) || 0;

                nameElement.textContent = itemName;
                costElement.textContent = formatCurrency(costValue);
                applyNumberFormatting(costElement, costValue);
                nameElement.classList.add('editable-text'); // <-- Add class
                nameElement.onclick = () => showEditModal(nameElement); // <-- Add listener
                costElement.classList.add('editable-text'); // <-- Add class
                costElement.onclick = () => showEditModal(costElement); // <-- Add listener
            } else {
                 // Clear fields if less than 3 items in CSV
                nameElement.textContent = '-';
                costElement.textContent = '-';
                costElement.classList.remove('positive', 'negative');
            }
        } else {
             console.error(`Elements for top scrap #${i} not found!`);
        }
    }
}

/**
 * Loads and displays comments from the comments CSV.
 */
export async function loadComments() {
    const commentsElement = document.getElementById('dashboardCommentsArea');
    if (!commentsElement) {
         console.error("Dashboard comments area element not found!");
         return;
    }

    try {
         // Fetch CSV, assuming single column, skipping header if present
         // Note: dataLoader's parseCSV skips the header automatically.
        const data = await fetchCSVData('data/dashboard_comments.csv');

        if (data.length > 0) {
             // Join all rows/comments with a newline
             const commentsText = data.map(row => row[0] || '').join('\n');
             commentsElement.textContent = commentsText.trim();
             // Add classes/listeners (the initial check ensures commentsElement exists)
             commentsElement.classList.add('editable-text');
             commentsElement.dataset.multiline = 'true';
             commentsElement.onclick = () => showEditModal(commentsElement);
        } else {
             // Handle case where CSV has no data rows (but element exists)
             commentsElement.textContent = 'No comments available.';
        }
    } catch (error) {
         // Handle errors during fetch or processing
         console.error("Error loading dashboard comments:", error);
         commentsElement.textContent = 'Error loading comments.';
    }
    // --- REMOVED the misplaced else, catch, and extra brace from here ---
} // End of loadComments function
