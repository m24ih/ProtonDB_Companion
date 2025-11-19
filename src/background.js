chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchProtonData") {
    const appId = request.appId;
    fetch(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No data found
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => sendResponse({ success: true, data: data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.action === "fetchSteamId") {
    const term = encodeURIComponent(request.title);
    fetch(`https://store.steampowered.com/api/storesearch/?term=${term}&l=english&cc=US`)
      .then(response => response.json())
      .then(data => {
        if (data.total > 0 && data.items && data.items.length > 0) {
          // Return the first match's ID
          sendResponse({ success: true, appId: data.items[0].id });
        } else {
          sendResponse({ success: false, error: "No game found" });
        }
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
