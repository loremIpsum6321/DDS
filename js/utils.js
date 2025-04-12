// DDS/js/utils.js

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