// DDS/js/app.js
import {
    loadIngredientStatus,
    loadMaterialShortages,
    loadRailcars,
    loadInventoryCounts,
    loadCogiErrors,
    loadFinancialInsights,
    loadTopCycleCounts,
    loadTopScrap,
    loadComments
} from './domUpdater.js';
import { updateTimestamp, applyNumberFormatting, setupEditModal } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Initializing...");

    /**
     * Sets up event listeners for the Cogi input fields.
     * Should be called after initialLoad completes.
     */
    function setupCogiInputListeners() {
        const batchingInput = document.getElementById('cogiBatchingCount');
        const packagingInput = document.getElementById('cogiPackagingCount');

        if (batchingInput) {
            batchingInput.addEventListener('change', () => {
                const value = parseInt(batchingInput.value, 10) || 0;
                applyNumberFormatting(batchingInput, value > 0 ? -1 : 0); // Re-apply formatting on change
                console.log(`Batching Cogi count changed to: ${value}`);
            });
        } else {
            console.warn("Batching Cogi input not found.");
        }

        if (packagingInput) {
            packagingInput.addEventListener('change', () => {
                const value = parseInt(packagingInput.value, 10) || 0;
                applyNumberFormatting(packagingInput, value > 0 ? -1 : 0); // Re-apply formatting on change
                console.log(`Packaging Cogi count changed to: ${value}`);
            });
        } else {
            console.warn("Packaging Cogi input not found.");
        }
    }

    /**
     * Loads all dashboard data sections concurrently.
     */
    function initialLoad() {
        updateTimestamp(); // Set initial timestamp
        Promise.all([
            loadIngredientStatus(),
            loadMaterialShortages(),
            loadRailcars(),
            loadInventoryCounts(),
            loadCogiErrors(), // This populates the initial Cogi input values
            loadFinancialInsights(),
            loadTopCycleCounts(),
            loadTopScrap(),
            loadComments()
        ]).then(() => {            
            // Setup listeners AFTER data is loaded and inputs are populated
            setupCogiInputListeners();
            setupEditModal(); // <--- ADD THIS LINE HERE
            console.log("Dashboard data loaded successfully and modal setup.");
        }).catch(error => {
            console.error("Error loading one or more dashboard sections:", error);
            // Optionally display a general error message to the user on the page
        });
    }

    // --- Theme Toggle Setup ---
    const themeToggleButton = document.getElementById('theme-toggle-icon-button');
    if (themeToggleButton) {
        // Apply saved theme preference on load
        const savedTheme = localStorage.getItem('dashboardTheme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } // Removed unnecessary empty else block

        // Add click listener for toggling theme
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            // Save preference in localStorage
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('dashboardTheme', isLight ? 'light' : 'dark');
        });
    } else {
        console.warn("Theme toggle button (#theme-toggle-icon-button) not found.");
    }

    // --- Load Initial Data ---
    initialLoad();

    // --- Optional: Auto-refresh logic ---
    // const refreshInterval = 300000; // 5 minutes (300 * 1000 ms)
    // setInterval(() => {
    //     console.log("Refreshing dashboard data...");
    //     initialLoad(); // Call the main load function again
    // }, refreshInterval);

}); // End DOMContentLoaded
