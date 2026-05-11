# Kol Hayom Sefaria Offline Data

This repository hosts the zipped offline data packages for the Kol Hayom application.

## Structure
- `/zips/`: Contains all ZIP packages.
  - `packages.json`: Metadata for available packages.
  - `torah_base.zip`: Base text for Torah.
  - `torah_rashi.zip`: Rashi commentary for Torah.
  - ... and more.

## Usage
The Kol Hayom app fetches `packages.json` to discover available content and downloads ZIPs as needed.
Data is extracted into the app's internal cache, matching the Sefaria API response format.
