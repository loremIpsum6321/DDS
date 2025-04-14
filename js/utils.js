// DDS/js/utils.js
import { loadInventoryCounts, loadFinancialInsights } from './domUpdater.js';

// --- Status Options Definition (Assumed based on usage) ---
export const statusOptionsDefinition = [
    { value: 'good', text: 'Good', class: 'good' },
    { value: 'warning', text: 'Warning', class: 'caution' }, // 'warning' value maps to 'caution' class
    { value: 'bad', text: 'Crit*', class: 'bad' }
];

// --- Helper Functions ---

/**
 * Updates the timestamp in the footer.
 */
export function updateTimestamp() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = new Date().toLocaleString();
    }
}

/**
 * Creates a status dropdown select element.
 * @param {string} currentStatusValue - The initially selected status value ('good', 'warning', 'bad').
 * @param {function} changeCallback - Optional function to call when the dropdown value changes.
 * @returns {HTMLSelectElement} The created dropdown element.
 */
export function createStatusDropdown(currentStatusValue, changeCallback) {
    const dropdown = document.createElement('select');
    dropdown.classList.add('status-dropdown'); // Base class

    const options = statusOptionsDefinition; // Use the defined options array

    // Helper to get the class associated with a value
    const getClassForValue = (value) => {
        const optionData = options.find(o => o.value === value);
        return optionData ? optionData.class : 'bad'; // Default to 'bad' class if no match
    };

    options.forEach(optionData => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.text = optionData.text;
        option.classList.add(optionData.class); // Add class for potential text styling in list
        if (optionData.value === currentStatusValue) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });

    // --- Event Listener ---
    dropdown.addEventListener('change', () => {
        const selectedValue = dropdown.value;
        const newClass = getClassForValue(selectedValue);

        // Update dropdown's own class for background color
        dropdown.classList.remove('good', 'caution', 'bad'); // Remove old status classes
        dropdown.classList.add(newClass);                   // Add the new one

        if (changeCallback) {
            changeCallback(selectedValue); // Pass the new status value back
        }
    });

    // --- Set Initial Class for Background ---
    const initialClass = getClassForValue(currentStatusValue);
    dropdown.classList.add(initialClass); // Add the initial status class

    return dropdown;
}


/**
 * Formats a number as US currency.
 * @param {string|number} value - The numeric value to format.
 * @returns {string} Formatted currency string or original value if input is not a number.
 */
export function formatCurrency(value) {
    const number = parseFloat(value);
    if (isNaN(number)) {
        return value; // Return original value if not a number
    }
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * Applies 'positive' or 'negative' CSS class to an element based on its numeric value.
 * @param {HTMLElement} element - The HTML element to apply the class to.
 * @param {string|number} value - The numeric value to check.
 */
export function applyNumberFormatting(element, value) {
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

/**
 * Formats a date string (like YYYY-MM-DD) to "YYYY - MM - DD".
 * @param {string} dateString - The date string to format.
 * @returns {string} Formatted date string or 'N/A' or original string.
 */
export function formatDateWithSpaces(dateString) {
    if (!dateString || dateString.trim() === '') return 'N/A';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // Return original if not in expected format
    return `${parts[0]} - ${parts[1]} - ${parts[2]}`;
}

/**
 * Exports the current railcar data to a CSV file for download.
 * @param {Array<Object>} railcarData - The array containing the current railcar state objects.
 * Each object should have keys like railNum, material, location, bol, romer, released.
 * @param {string} [filename='updated_railcars.csv'] - The desired name for the downloaded file.
 */
export function exportRailcarsToCSV(railcarData, filename = 'railcars.csv') {
    if (!railcarData || railcarData.length === 0) {
        console.warn("No railcar data available to export.");
        alert("No railcar data to export.");
        return;
    }

    // Define CSV Headers matching your railcars.csv structure
    const headers = ['RailNumber', 'Material', 'Location', 'BOL', 'Romer', 'Released'];

    // Helper to format values for CSV (handles commas, quotes, booleans)
    const formatCSVValue = (value) => {
        if (value === null || typeof value === 'undefined') {
            return '';
        }
        // Convert booleans to uppercase TRUE/FALSE strings
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        let stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            stringValue = stringValue.replace(/"/g, '""'); // Escape double quotes
            return `"${stringValue}"`;
        }
        return stringValue;
    };

    // Combine headers and rows
    const headerRow = headers.map(formatCSVValue).join(',');
    const dataRows = railcarData.map(car => {
        const row = [
            car.railNum,
            car.material,
            car.location,
            car.bol,
            car.romer,
            car.released
        ];
        return row.map(formatCSVValue).join(',');
    });

    const csvContent = headerRow + '\r\n' + dataRows.join('\r\n');

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Sets up the editing modal functionality.
 * Should be called once after the DOM is loaded.
 */
export function setupEditModal() {
    const modal = document.getElementById('editModal');
    const modalContent = modal.querySelector('.modal-content'); // Get the content area for dragging
    if (!modal || !modalContent) {
        console.error("Edit modal or modal content not found. Cannot set up modal or make it draggable.");
        return;
    }
    
    const modalInput = document.getElementById('modalInput');
    const modalInputSingle = document.getElementById('modalInputSingle');
    const saveButton = document.getElementById('modalSaveButton');
    const cancelButton = document.getElementById('modalCancelButton');
    const closeButton = modal.querySelector('.modal-close-button');
    let targetElement = null; // To store the element being edited

    // --- Make the modal draggable ---
    makeModalDraggable(modal, modalContent); // Pass both the main modal and the handle

    // Function to show the modal
    window.showEditModal = (elementToEdit) => { // Use window.showEditModal to make it globally accessible
        targetElement = elementToEdit;
        const isTextArea = targetElement.tagName.toLowerCase() === 'div' || targetElement.dataset.multiline === 'true'; // Example condition

        if (isTextArea) {
            modalInput.value = targetElement.textContent;
            modalInput.style.display = 'block';
            modalInputSingle.style.display = 'none';
        } else {
            modalInputSingle.value = targetElement.textContent;
            modalInputSingle.style.display = 'block';
            modalInput.style.display = 'none';
        }

        modal.classList.remove('modal-hidden');
        modal.classList.add('modal-visible');
        (isTextArea ? modalInput : modalInputSingle).focus(); // Focus the correct input
    };

    // Function to hide the modal
    const hideModal = () => {
        modal.classList.add('modal-hidden');
        modal.classList.remove('modal-visible');
        modalInput.value = ''; // Clear input
        modalInputSingle.value = '';
        targetElement = null;
    };

    // Save action
    saveButton.addEventListener('click', () => {
        if (targetElement) {
            const isTextArea = modalInput.style.display === 'block';
            const newValue = isTextArea ? modalInput.value : modalInputSingle.value;
            targetElement.textContent = newValue;
            applyNumberFormatting(targetElement, newValue);

             // --- START: PTD Recalculation Logic ---

             // Check if the edited element affects PTD calculations
             // This requires identifying which elements are part of the PTD totals.
             // We can check parent IDs or add data attributes to the editable elements.

             // Example: Check if the edited element is a weekly cycle count or scrap value
             const parentCycleTable = targetElement.closest('#cycleCountsWeeklyBody');
             const parentScrapTable = targetElement.closest('#scrapTransactionsWeeklyBody');

             if (parentCycleTable || parentScrapTable) {
                 // Recalculate Inventory Counts (Cycle & Scrap) and Financial Total
                 console.log("Recalculating PTD totals due to modal save...");
                 // Option 1: Re-run the specific loading functions (simpler, might refetch data)
                 // import { loadInventoryCounts, loadFinancialInsights } from './domUpdater.js'; // Make sure these are imported at the top
                 // loadInventoryCounts(); // This will recalculate and update cycle/scrap totals
                 // loadFinancialInsights(); // This will recalculate the grand total

                  // Option 2: Manual Recalculation (more complex, avoids refetching)
                  // This requires getting all relevant sibling values and summing them up.
                  // Example for Cycle Counts:
                  if (parentCycleTable) {
                     let newCycleTotal = 0;
                     parentCycleTable.querySelectorAll('td.editable-text').forEach(cell => {
                        // Extract number from formatted currency if necessary
                        const cellValue = parseFloat(cell.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                        newCycleTotal += cellValue;
                     });
                     const cycleTotalEl = document.getElementById('cycleCountTotal');
                     if (cycleTotalEl) {
                        cycleTotalEl.textContent = formatCurrency(newCycleTotal); // Ensure formatCurrency is accessible
                        applyNumberFormatting(cycleTotalEl, newCycleTotal); // Ensure applyNumberFormatting is accessible
                     }
                  }
                  // Example for Scrap Transactions:
                  if (parentScrapTable) {
                     let newScrapTotal = 0;
                     parentScrapTable.querySelectorAll('td.editable-text').forEach(cell => {
                         const cellValue = parseFloat(cell.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                         newScrapTotal += cellValue;
                     });
                     const scrapTotalEl = document.getElementById('scrapTotal');
                      if (scrapTotalEl) {
                         scrapTotalEl.textContent = formatCurrency(newScrapTotal);
                         applyNumberFormatting(scrapTotalEl, newScrapTotal);
                     }
                  }
                  // After updating Cycle/Scrap totals, recalculate the Financial Grand Total
                  const cycleTotalValue = parseFloat(document.getElementById('cycleCountTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                  const scrapTotalValue = parseFloat(document.getElementById('scrapTotal')?.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                  const grandTotal = cycleTotalValue + scrapTotalValue;
                  const financialTotalEl = document.getElementById('financialTotalPTD');
                  if (financialTotalEl) {
                     financialTotalEl.textContent = formatCurrency(grandTotal);
                     applyNumberFormatting(financialTotalEl, grandTotal);
                  }
              } else {
                  // If the edited element wasn't a direct PTD input, still apply formatting
                  applyNumberFormatting(targetElement, newValue);
             }

             // --- END: PTD Recalculation Logic ---

             console.log(`Updated element (${targetElement.id || targetElement.tagName}) to: ${newValue}`);
        }
        hideModal();
    });

    // Cancel action
    cancelButton.addEventListener('click', hideModal);
    closeButton.addEventListener('click', hideModal);

    // Close modal if clicking outside the content area
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Check if the click was directly on the modal backdrop
            hideModal();
        }
    });

    // Close modal on Escape key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('modal-visible')) {
            hideModal();
        }
    });
}

/**
 * Makes a modal element draggable by its content area.
 * @param {HTMLElement} modalElement - The main modal container (e.g., #editModal).
 * @param {HTMLElement} dragHandle - The element to click and drag (e.g., .modal-content).
 */
function makeModalDraggable(modalElement, dragHandle) {
    // --- Add CSS to prevent text selection during drag ---
    // (You might want to put this CSS in your main CSS file instead of adding it dynamically)
    const styleId = 'drag-no-select-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .no-select-during-drag {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
          }
          /* Optional: Add move cursor to the handle */
          .modal-content { /* Or your specific drag handle selector */
            cursor: move;
          }
        `;
        document.head.appendChild(style);
    }

    // --- Draggable Logic (Copied from previous answer) ---

    let isDragging = false;

    let currentX;
    let currentY;
    let initialX;
    let initialY;
    // Get initial position from style (if any) - assumes translate3d
    const computedStyle = window.getComputedStyle(modalElement);
    const transform = computedStyle.transform;
    let xOffset = 0;
    let yOffset = 0;

    if (transform && transform !== 'none') {
        const matrix = transform.match(/matrix.*\((.+)\)/);
        if (matrix && matrix[1]) {
            const values = matrix[1].split(', ');
            // For translate3d(x, y, z), x is index 12, y is index 13 (older matrix might use 4, 5)
            // For matrix(a, b, c, d, tx, ty), tx is index 4, ty is index 5
            if (values.length === 16) { // matrix3d
                xOffset = parseFloat(values[12]) || 0;
                yOffset = parseFloat(values[13]) || 0;
            } else if (values.length === 6) { // matrix
                xOffset = parseFloat(values[4]) || 0;
                yOffset = parseFloat(values[5]) || 0;
            }
        }
    }

    // --- Mouse Down: Start dragging ---
    dragHandle.addEventListener("mousedown", (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.closest('.modal-close-button')) {
            return; // Don't drag if clicking interactive elements or close button
        }

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        document.body.classList.add('no-select-during-drag');
    });

    // --- Mouse Move: Handle the drag ---
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, modalElement);
    });

    // --- Mouse Up: Stop dragging ---
    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        initialX = currentX; // Store last position offset
        initialY = currentY;
        isDragging = false;
        document.body.classList.remove('no-select-during-drag');
    });

    // Helper function to set the transform style
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}
