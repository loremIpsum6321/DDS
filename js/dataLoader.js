// DDS/js/dataLoader.js

/**
 * Fetches CSV data from a given file path and parses it.
 * @param {string} filePath - The path to the CSV file (relative to index.html).
 * @returns {Promise<Array<Array<string>>>} A promise resolving to an array of data rows (arrays of strings).
 */
export async function fetchCSVData(filePath) {
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
/**/
/**
 * Simple CSV Parser (Assumes comma delimiter, handles basic quotes).
 * Skips the header row.
 * @param {string} text - The raw CSV text content.
 * @returns {Array<Array<string>>} An array of data rows (arrays of strings).
 */
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
                if (char === '"' && (j === 0 || line[j - 1] !== '\\')) { // Check for unescaped quote
                   if (inQuotes && line[j+1] === '"') { // Handle double quote inside quotes as single literal quote
                        currentVal += '"';
                        j++; // Skip the second quote
                   } else {
                     inQuotes = !inQuotes;
                   }
                } else if (char === ',' && !inQuotes) {
                    // Trim whitespace and remove surrounding quotes ONLY if they exist
                    values.push(currentVal.trim().replace(/^"|"$/g, ''));
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
             // Add the last value, trim whitespace, and remove surrounding quotes
            values.push(currentVal.trim().replace(/^"|"$/g, ''));
            data.push(values);
        }
    }
    return data;
}