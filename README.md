# Jitaku Extensions

Extensions and integrations for the Jitaku streaming and manga platform, providing programmatic access to anime content including episodes, details, and streaming links from Indonesian anime websites.

## API Reference

Each scraper provides the following methods:

### `getHomepage()`

Returns a list of anime featured on the homepage.

**Returns:** Array of anime objects with id, title, imageUrl, episode, and url properties.

### `getDetails(url)`

Fetches detailed information about a specific anime, including:

- Title and image
- Synopsis
- Studio and release year
- Status and genres
- Episode list with URLs

**Parameters:**

- `url` (string): The URL of the anime page

**Returns:** Object containing anime details and episodes array.

### `getLatest(page)`

Gets the latest anime releases with pagination support.

**Parameters:**

- `page` (number): Page number for pagination

**Returns:** Object with data array and nextPage property.

### `getPopular(page)`

Retrieves popular anime from the site.

**Parameters:**

- `page` (number): Page number for pagination

**Returns:** Object with data array and nextPage property.

### `getSearch(query, page)`

Searches for anime by title with pagination support.

**Parameters:**

- `query` (string): Search term
- `page` (number): Page number for pagination

**Returns:** Object with data array and nextPage property.

### `getVideoServers(url)`

Gets available video streaming servers for an episode.

**Parameters:**

- `url` (string): The URL of the episode page

**Returns:** Array of server objects with id, postId, nume, type, and label properties.

### `getVideoUrl(params)`

Extracts the actual streaming URL from a video server.

**Parameters:**

- `postId` (number): Post ID from the video server
- `nume` (number): Episode number from the video server
- `type` (string): Video type from the video server

**Returns:** String containing the direct video URL.

## Project Structure

```
├── src/
│   ├── extensions.json      # Registry of available scrapers
│   └── id/
│       └── samehadaku/
│           ├── index.js     # Samehadaku scraper implementation
│           └── icon.png     # Site icon
├── package.json
├── README.md
└── tsconfig.json
```

## Adding a New Scraper

1. Create a new directory under `src/` with the country code (e.g., `src/us/`)
2. Create a subdirectory with the site name (e.g., `src/us/crunchyroll/`)
3. Implement the required methods in `index.js`:
   - `getHomepage()`
   - `getDetails(url)`
   - `getLatest(page)`
   - `getPopular(page)`
   - `getSearch(query, page)`
   - `getVideoServers(url)`
   - `getVideoUrl(params)`
4. Add an icon.png file (recommended size: 64x64px)
5. Update `src/extensions.json` with the new scraper information following this format:
   ```json
   {
     "country": "Country Name",
     "data": [
       {
         "id": "country-sitename",
         "name": "Site Name",
         "description": "Site description",
         "version": "1.0.0",
         "country": "Country Name",
         "imageUrl": "",
         "baseUrl": "https://example.com",
         "type": "video",
         "content": ""
       }
     ]
   }
   ```

## Contributing

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Disclaimer

This project is for educational purposes only. Please respect the terms of service of the websites being scraped and consider supporting official anime streaming platforms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
