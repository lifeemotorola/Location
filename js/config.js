/* ============================================================
   Site configuration
   ------------------------------------------------------------
   Leave apiBaseUrl empty to run the app purely locally (data in
   this browser only). Set it to your Cloudflare Worker URL to
   enable accounts, shared records and offline sync.

   The value can also be changed per device without editing this
   file:
       localStorage.setItem('liberiaLocator.apiBaseUrl', '<url>')
   ============================================================ */

window.LOCATOR_CONFIG = {
    // Example: 'https://liberia-locator-api.your-subdomain.workers.dev'
    apiBaseUrl: '',
    appName: 'Liberia Community Locator',
    // Seconds between automatic sync attempts while online
    syncIntervalSeconds: 60
};
