document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Initializing...");

    // --- Helper Functions ---

    // Update footer timestamp
    function updateTimestamp() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = new Date().toLocaleString();
        }
    }

    // Generic CSV Fetch and Parse function
    async function fetchCSVData(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
            }
            const text = await response.text();
            return parseCSV(text);
        } catch (error) {
            console.error(`Error fetching or parsing ${filePath}:`, error);
            return []; // Return empty array on error
        }
    }

    // Simple CSV Parser (Assumes comma delimiter, handles basic quotes)
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length <= 1) return []; // No data or only header

        const data = [];
        // Start from index 1 to skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = [];
                let currentVal = '';
                let inQuotes = false;
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    // Basic quote handling (doesn't handle escaped quotes robustly)
                    if (char === '"' && (j === 0 || line[j - 1] !== '\\')) {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(currentVal.trim());
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                values.push(currentVal.trim()); // Add the last value
                data.push(values);
            }
        }
        return data;
    }

    // Format number as currency (USD)
    function formatCurrency(value) {
        const number = parseFloat(value);
        if (isNaN(number)) {
            return value; // Return original value if not a number
        }
        return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    // Apply positive/negative class to an element based on numeric value
    function applyNumberFormatting(element, value) {
        const number = parseFloat(value);
        element.classList.remove('positive', 'negative'); // Clear previous classes
        if (!isNaN(number)) {
            if (number > 0) {
                element.classList.add('positive');
            } else if (number < 0) {
                element.classList.add('negative');
            }
            // Optional: Add a 'zero' class if needed: else { element.classList.add('zero'); }
        }
    }

    // Format date with spaces
    function formatDateWithSpaces(dateString) {
        if (!dateString || dateString.trim() === '') return 'N/A';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString; // Return original if not in expected format
        return `${parts[0]} - ${parts[1]} - ${parts[2]}`;
    }


    // --- Populate Dashboard Sections ---

    // 1. Ingredient Status
    async function loadIngredientStatus() {
        const data = await fetchCSVData('data/ingredients_status.csv');
        const status24hrEl = document.querySelector('#status-24hr .status-indicator');
        const status48hrEl = document.querySelector('#status-48hr .status-indicator');

        if (!status24hrEl || !status48hrEl) return;

        // Reset to default/loading state
        status24hrEl.textContent = 'N/A';
        status48hrEl.textContent = 'N/A';
        status24hrEl.className = 'status-indicator loading';
        status48hrEl.className = 'status-indicator loading';

        let found24 = false;
        let found48 = false;

        data.forEach(row => {
            const timeframe = row[0]?.toLowerCase();
            const statusText = row[1] || 'N/A'; // Keep original casing for display
            const status = statusText.toLowerCase();
            let indicatorClass = 'bad'; // Default class

            if (status === 'good' || status === 'ok') indicatorClass = 'good';
            else if (status === 'warning' || status === 'caution') indicatorClass = 'caution'; // Use 'caution' for yellow

            if (timeframe === '24hr') {
                status24hrEl.textContent = statusText;
                status24hrEl.className = `status-indicator ${indicatorClass}`;
                found24 = true;
            } else if (timeframe === '48hr') {
                status48hrEl.textContent = statusText;
                status48hrEl.className = `status-indicator ${indicatorClass}`;
                found48 = true;
            }
        });

        // If data wasn't found in file, set to bad/error state
         if (!found24) status24hrEl.className = 'status-indicator bad';
         if (!found48) status48hrEl.className = 'status-indicator bad';
    }

    // 2. Material Shortages
    async function loadMaterialShortages() {
        const data = await fetchCSVData('data/material_shortages.csv');
        const tableBody = document.getElementById('shortagesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = ''; // Clear loading/previous data

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No shortages reported or data unavailable.</td></tr>';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');

            // Create cells and apply formatting if needed (assuming cols 0,1,2 are text for now)
            const tdMaterial = document.createElement('td');
            tdMaterial.textContent = row[0] || 'N/A';
            tr.appendChild(tdMaterial);

            const tdQty = document.createElement('td');
            tdQty.textContent = row[1] || 'N/A';
            // applyNumberFormatting(tdQty, row[1]); // Uncomment if Short Qty is numeric and needs +/- coloring
            tr.appendChild(tdQty);

            const tdETA = document.createElement('td');
            tdETA.textContent = formatDateWithSpaces(row[2]);
            // Potential future enhancement: color ETA based on date proximity
            tr.appendChild(tdETA);

            tableBody.appendChild(tr);
        });
    }

    // 3. Railcars
    async function loadRailcars() {
        const data = await fetchCSVData('data/railcars.csv');
        const tableBody = document.getElementById('railcarsTableBody');
        const onSiteCountEl = document.getElementById('railOnSiteCount');
        const inYardCountEl = document.getElementById('railInYardCount');
        const totalCountEl = document.getElementById('railTotalCount');

        if (!tableBody || !onSiteCountEl || !inYardCountEl || !totalCountEl) return;

        tableBody.innerHTML = ''; // Clear loading/previous data
        let onSiteCount = 0;
        let inYardCount = 0;

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No railcar data available.</td></tr>';
            onSiteCountEl.textContent = '0';
            inYardCountEl.textContent = '0';
            totalCountEl.textContent = '0';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');

            // Rail #
            const tdRailNum = document.createElement('td');
            tdRailNum.textContent = row[0] || 'N/A';
            tr.appendChild(tdRailNum);

            // Material
            const tdMaterial = document.createElement('td');
            tdMaterial.textContent = row[1] || 'N/A';
            tr.appendChild(tdMaterial);

            // Location (with formatting)
            const tdLocation = document.createElement('td');
            const locationText = row[2] || 'N/A';
            const locationLower = locationText.toLowerCase();
            tdLocation.textContent = locationText;
            if (locationLower.includes('on site') || locationLower.includes('onsite')) {
                tdLocation.classList.add('status-good'); // Green for On Site
                 onSiteCount++;
            } else if (locationLower.includes('in yard') || locationLower.includes('inyard') || locationLower.includes('yard')) {
                tdLocation.classList.add('status-caution'); // Yellow for In Yard
                inYardCount++;
            } else {
                 tdLocation.classList.add('status-bad'); // Red for Unknown/Other
            }
            tr.appendChild(tdLocation);


            // BOL (with formatting)
            const tdBOL = document.createElement('td');
            const bolRaw = row[3]?.toLowerCase() === 'true';
            tdBOL.textContent = bolRaw ? 'Yes' : 'No';
            tdBOL.classList.add(bolRaw ? 'status-yes' : 'status-no');
            tr.appendChild(tdBOL);

            // Romer (with formatting)
            const tdRomer = document.createElement('td');
            const romerRaw = row[4]?.toLowerCase() === 'true';
            tdRomer.textContent = romerRaw ? 'Yes' : 'No';
            tdRomer.classList.add(romerRaw ? 'status-yes' : 'status-no');
            tr.appendChild(tdRomer);

            tableBody.appendChild(tr);
        });

        // Update counts
        onSiteCountEl.textContent = onSiteCount;
        inYardCountEl.textContent = inYardCount;
        totalCountEl.textContent = onSiteCount + inYardCount;
    }

     // 4. Inventory Counts (Cycle Counts & Scrap) - Updated for Currency & +/- Formatting
    async function loadInventoryCounts() {
        // --- Cycle Counts ---
        const cycleData = await fetchCSVData('data/cycle_counts.csv');
        const cycleTableBody = document.getElementById('cycleCountsWeeklyBody');
        const cycleTotalEl = document.getElementById('cycleCountTotal');

        if (cycleTableBody && cycleTotalEl) {
            cycleTableBody.innerHTML = ''; // Clear loading
            if (cycleData.length > 0) {
                const row = cycleData[0]; // Assume first row has the data
                const tr = document.createElement('tr');

                // W1 to W4 - Create Cells, Format Currency, Apply +/- Color
                for (let i = 0; i < 4; i++) { // W1=0, W2=1, W3=2, W4=3
                    const td = document.createElement('td');
                    const value = row[i] || '0';
                    td.textContent = formatCurrency(value);
                    applyNumberFormatting(td, value);
                    tr.appendChild(td);
                }
                cycleTableBody.appendChild(tr);

                // Total PTD - Format Currency, Apply +/- Color
                const totalValue = row[4] || '0';
                cycleTotalEl.textContent = formatCurrency(totalValue);
                applyNumberFormatting(cycleTotalEl, totalValue); // Apply to the span

            } else {
                cycleTableBody.innerHTML = '<tr><td colspan="4">No data</td></tr>';
                cycleTotalEl.textContent = formatCurrency('0');
                 applyNumberFormatting(cycleTotalEl, '0');
            }
        }

        // --- Scrap Transactions ---
        const scrapData = await fetchCSVData('data/scrap_transactions.csv');
        const scrapTableBody = document.getElementById('scrapTransactionsWeeklyBody');
        const scrapTotalEl = document.getElementById('scrapTotal');

         if (scrapTableBody && scrapTotalEl) {
            scrapTableBody.innerHTML = ''; // Clear loading
            if (scrapData.length > 0) {
                const row = scrapData[0]; // Assume first row has the data
                const tr = document.createElement('tr');

                 // W1 to W4 - Create Cells, Format Currency, Apply +/- Color
                 for (let i = 0; i < 4; i++) { // W1=0, W2=1, W3=2, W4=3
                    const td = document.createElement('td');
                    const value = row[i] || '0';
                    // NOTE: Scrap is often considered negative, so we apply formatting directly
                    td.textContent = formatCurrency(value);
                    applyNumberFormatting(td, value); // Use standard +/- coloring
                    // If you ALWAYS want scrap > 0 to be RED, use this instead:
                    // const number = parseFloat(value);
                    // if (!isNaN(number) && number !== 0) {
                    //    td.classList.add('negative'); // Force red if non-zero scrap
                    // }
                    tr.appendChild(td);
                }
                scrapTableBody.appendChild(tr);

                // Total PTD - Format Currency, Apply +/- Color
                const totalValue = row[4] || '0';
                scrapTotalEl.textContent = formatCurrency(totalValue);
                 applyNumberFormatting(scrapTotalEl, totalValue); // Apply to the span
                  // If you ALWAYS want total scrap > 0 to be RED, use this instead:
                 // const totalNumber = parseFloat(totalValue);
                 // if (!isNaN(totalNumber) && totalNumber !== 0) {
                 //    scrapTotalEl.classList.add('negative'); // Force red if non-zero total scrap
                 // }


            } else {
                scrapTableBody.innerHTML = '<tr><td colspan="4">No data</td></tr>';
                scrapTotalEl.textContent = formatCurrency('0');
                applyNumberFormatting(scrapTotalEl, '0');
            }
        }
    }

    // 5. COGI Errors
    async function loadCogiErrors() {
        const data = await fetchCSVData('data/cogi_errors.csv');
        const batchingEl = document.getElementById('cogiBatchingCount');
        const packagingEl = document.getElementById('cogiPackagingCount');

        if (!batchingEl || !packagingEl) return;

        let batchingCount = 0;
        let packagingCount = 0;

        data.forEach(row => {
            // Assumes CSV columns: Area, Count
            const area = row[0]?.toLowerCase();
            const count = parseInt(row[1], 10) || 0;

            if (area === 'batching') {
                batchingCount += count;
            } else if (area === 'packaging') {
                packagingCount += count;
            }
            // Other areas are ignored by this summary
        });

        batchingEl.textContent = batchingCount;
        packagingEl.textContent = packagingCount;

        // Apply formatting to COGI counts (treat any count > 0 as 'negative' or 'warning')
        batchingEl.classList.remove('positive', 'negative', 'caution');
        packagingEl.classList.remove('positive', 'negative', 'caution');
        if (batchingCount > 0) batchingEl.classList.add('negative'); // Use red for errors
        if (packagingCount > 0) packagingEl.classList.add('negative'); // Use red for errors

    }


    // --- Initial Data Load ---
    function initialLoad() {
        updateTimestamp(); // Set initial timestamp
        Promise.all([
            loadIngredientStatus(),
            loadMaterialShortages(),
            loadRailcars(),
            loadInventoryCounts(),
            loadCogiErrors()
        ]).then(() => {
            console.log("Dashboard data loaded.");
        }).catch(error => {
            console.error("Error loading dashboard data:", error);
            // Display a general error message on the page if needed
        });
    }

    // Load data when the page is ready
    initialLoad();

    // Optional: Set up auto-refresh
    // const refreshInterval = 300000; // 5 minutes
    // setInterval(() => {
    //     console.log("Refreshing dashboard data...");
    //     initialLoad(); // Call the main load function again
    // }, refreshInterval);

}); // End DOMContentLoaded
