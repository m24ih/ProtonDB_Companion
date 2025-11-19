# ProtonDB Companion Extension 🎮

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

A browser extension that integrates **ProtonDB** compatibility tiers directly into **Steam** and **Epic Games Store** pages. Perfect for Linux and Steam Deck users!


## Features ✨

* **Steam Integration:** Displays ProtonDB badges (Native, Platinum, Gold, etc.) on game store pages and search results.
* **Epic Games Support (Experimental):** Matches Epic Games titles with Steam AppIDs to show compatibility info.
* **Performance Focused:** Uses caching and request batching to minimize API usage.
* **Visual Clarity:** Color-coded badges matching the official ProtonDB theme.

## Installation 📦

### From Store (Coming Soon)
* [Chrome Web Store](#)
* [Firefox Add-ons](#)

### Manual Installation (For Developers)
1.  Clone this repository:
    ```bash
    git clone https://github.com/m24ih/ProtonDB_Companion.git
    ```
2.  Open your browser's extension manager:
    * **Chrome/Brave/Edge:** Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the project folder.
    * **Firefox:** Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json`.

## How It Works 

1.  **Steam:** Extracts the AppID from the URL or data attributes and queries the ProtonDB API.
2.  **Epic Games:** Since Epic doesn't expose Steam AppIDs, the extension searches for the game title on Steam API to find the corresponding ID, then queries ProtonDB. *Note: This may occasionally result in mismatches.*

## Disclaimer ⚠️

This project is not affiliated with Valve, Steam, Epic Games, or ProtonDB. It is a community-made tool.

## License 📄

Distributed under the MIT License. See `LICENSE` for more information.