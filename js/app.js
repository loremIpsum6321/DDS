// DDS/js/app.js
import {
    loadIngredientStatus,
    loadMaterialShortages,
    loadRailcars,
    loadInventoryCounts,
    loadCogiErrors,
    // --- Add these new imports ---
    loadFinancialInsights,
    loadTopCycleCounts,
    loadTopScrap,
    loadComments
    // --- End of new imports ---
} from './domUpdater.js';
import { updateTimestamp } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Initializing...");

    /**
     * Loads all dashboard data sections concurrently.
     */
// Inside the initialLoad function in app.js
function initialLoad() {
    updateTimestamp(); // Set initial timestamp
    Promise.all([
        loadIngredientStatus(),
        loadMaterialShortages(),
        loadRailcars(),
        loadInventoryCounts(), // This needs to run ideally before financial insights if it exposes totals globally, but our refetch approach avoids this dependency.
        loadCogiErrors(),
        // --- Add these new function calls ---
        loadFinancialInsights(),
        loadTopCycleCounts(),
        loadTopScrap(),
        loadComments()
        // --- End of new function calls ---
    ]).then(() => {
        console.log("Dashboard data loaded successfully.");
    }).catch(error => {
        console.error("Error loading one or more dashboard sections:", error);
        // Optionally display a general error message to the user on the page
    });
}

    // --- Theme Toggle Button Listener ---
    // 1. Make sure you have a button in index.html with id="theme-toggle-icon-button"
    const themeToggleButton = document.getElementById('theme-toggle-icon-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            // Save preference in localStorage
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('dashboardTheme', isLight ? 'light' : 'dark');
        });

        // Check localStorage on load to apply saved theme
        const savedTheme = localStorage.getItem('dashboardTheme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else { 
        }

    } else {
        console.warn("Theme toggle button (#theme-toggle-button) not found.");
    }

    // Load initial data when the page is ready
    initialLoad();

    // --- Optional: Auto-refresh logic ---
    // const refreshInterval = 300000; // 5 minutes (300 * 1000 ms)
    // setInterval(() => {
    //     console.log("Refreshing dashboard data...");
    //     initialLoad(); // Call the main load function again
    // }, refreshInterval);

}); // End DOMContentLoaded
