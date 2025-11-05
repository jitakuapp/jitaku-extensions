(() => {
  const BASE_URL = "https://v1.samehadaku.how";

  const SELECTORS = {
    homepage: {
      animeList: ".post-show ul li",
      animeTitle: ".dtla h2.entry-title a",
      animeLink: ".thumb a",
      animeImage: ".thumb img",
      episodeLink: ".dtla span a",
      episodeText: ".dtla span author[itemprop='name']",
    },

    details: {
      title: "h1.entry-title, h2.entry-title",
      image: ".thumb img.anmsa, .thumb img:first, .infoanime img:first",
      metadata: ".spe span",
      metadataLabel: ".spe span",
      metadataValue: ".spe span",
      synopsis: ".entry-content-single p:first, .desc p:first",
      genres: ".genre-info a",
      chapterList: ".lstepsiode.listeps ul li",
    },

    latest: {
      animeList: 'li[itemscope][itemtype="http://schema.org/CreativeWork"]',
      animeTitle: "h2.entry-title a",
      animeLink: "h2.entry-title a",
      animeImage: "img",
      episodeLink: "span:first a",
      episodeText: "span:first author[itemprop='name']",
    },

    popular: {
      animeList: ".topten-animesu ul li",
      animeTitle: ".judul",
      animeLink: "a",
      animeImage: "img",
    },

    search: {
      animeList: "article.animpost",
      animeTitle: ".data .title h2",
      animeLink: ".animposx > a",
      animeImage: ".content-thumb img",
      status: ".data .type",
    },

    video: {
      serverList: "#server ul li",
      serverOption: ".east_player_option",
      iframe: "iframe",
    },
  };

  /**
   * Helper function to extract anime ID from URL
   * @param {string} url - The URL to extract ID from
   * @param {string} fallback - Fallback ID if extraction fails
   * @returns {string} The extracted or fallback ID
   */
  const extractAnimeId = (url, fallback) => {
    const urlMatch = url.match(/\/anime\/([^\/]+)\//);
    return urlMatch ? urlMatch[1] : fallback;
  };

  /**
   * Helper function to extract text content from an element with fallback selectors
   * @param {Object} $ - Cheerio instance
   * @param {string} selector - Primary selector
   * @param {string[]} fallbackSelectors - Array of fallback selectors
   * @returns {string} Extracted text or empty string
   */
  const extractTextWithFallback = ($, selector, fallbackSelectors = []) => {
    let text = $(selector).text().trim();
    if (!text && fallbackSelectors.length > 0) {
      for (const fallbackSelector of fallbackSelectors) {
        text = $(fallbackSelector).text().trim();
        if (text) break;
      }
    }
    return text;
  };

  /**
   * Helper function to extract attribute from an element with fallback selectors
   * @param {Object} $ - Cheerio instance
   * @param {string} attribute - Attribute name to extract
   * @param {string} selector - Primary selector
   * @param {string[]} fallbackSelectors - Array of fallback selectors
   * @returns {string} Extracted attribute value or empty string
   */
  const extractAttributeWithFallback = (
    $,
    attribute,
    selector,
    fallbackSelectors = []
  ) => {
    let value = $(selector).attr(attribute) || "";
    if (!value && fallbackSelectors.length > 0) {
      for (const fallbackSelector of fallbackSelectors) {
        value = $(fallbackSelector).attr(attribute) || "";
        if (value) break;
      }
    }
    return value;
  };

  /**
   * Helper function to extract metadata from detail page
   * @param {Object} $ - Cheerio instance
   * @param {string} searchTerm - The term to search for in metadata
   * @returns {string} Extracted metadata value or empty string
   */
  const extractMetadata = ($, searchTerm) => {
    let result = "";
    $(SELECTORS.details.metadata).each((_, element) => {
      const text = $(element).text().trim();
      if (text.includes(searchTerm)) {
        result = text.replace(searchTerm, "").trim();
        return false; // Break the loop
      }
    });
    return result;
  };

  /**
   * Helper function to extract year from release text
   * @param {string} releaseText - The release text containing year information
   * @returns {string} Extracted year or empty string
   */
  const extractYear = (releaseText) => {
    const yearMatch = releaseText.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : "";
  };

  /**
   * Helper function to clean episode text
   * @param {string} episodeText - Raw episode text
   * @returns {string} Cleaned episode text
   */
  const cleanEpisodeText = (episodeText) => {
    return episodeText.replace(/\[END\]|\s+/g, "").trim();
  };

  /**
   * Creates a wrapper function for fetch operations with error handling
   * @param {string} uri - The URI to fetch
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Promise that resolves with parsed HTML data
   */
  const fetchWithParsing = (uri, options = {}) => {
    return new Promise((resolve, reject) => {
      fetch({
        uri,
        onMessage: (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            resolve(data);
          } catch (error) {
            console.error("Failed to parse message:", error);
            reject(error);
          }
        },
        ...options,
      });
    });
  };

  return {
    /**
     * Fetches anime list from the homepage
     * @returns {Promise<Array>} Promise that resolves to an array of anime objects
     */
    getHomepage: () => {
      return new Promise(async (resolve, reject) => {
        try {
          const data = await fetchWithParsing(`${BASE_URL}/`);
          const $ = load(data.html);
          const animeData = [];

          $(SELECTORS.homepage.animeList).each((_, element) => {
            const $element = $(element);
            const url = extractAttributeWithFallback(
              $,
              "href",
              SELECTORS.homepage.animeLink,
              []
            );
            const urlParts = url.split("/");
            const id = urlParts[urlParts.length - 2] || "";
            const title = extractTextWithFallback(
              $,
              SELECTORS.homepage.animeTitle,
              []
            );
            const imageUrl = extractAttributeWithFallback(
              $,
              "src",
              SELECTORS.homepage.animeImage,
              []
            );
            const episodeFirst = $element
              .find(SELECTORS.homepage.episodeText)
              .first();
            const episodeText =
              episodeFirst.find('author[itemprop="name"]').text().trim() || "";
            const episode = cleanEpisodeText(episodeText);

            if (id && title && url) {
              animeData.push({
                id,
                title,
                imageUrl,
                episode,
                url,
              });
            }
          });

          resolve(animeData);
        } catch (error) {
          console.error("Failed to fetch homepage:", error);
          reject(error);
        }
      });
    },

    /**
     * Fetches detailed information for a specific anime
     * @param {string} url - The URL of the anime detail page
     * @returns {Promise<Object>} Promise that resolves to an anime details object
     */
    getDetails: (url) => {
      return new Promise(async (resolve, reject) => {
        try {
          const data = await fetchWithParsing(url);
          const $ = load(data.html);
          const animeDetails = {};

          animeDetails.title = extractTextWithFallback(
            $,
            SELECTORS.details.title,
            []
          );
          animeDetails.image = extractAttributeWithFallback(
            $,
            "src",
            SELECTORS.details.image.split(", "),
            []
          );
          animeDetails.sinopsis = extractTextWithFallback(
            $,
            SELECTORS.details.synopsis,
            []
          );

          animeDetails.studio = extractMetadata($, "Studio");

          const releaseText = extractMetadata($, "Released:");
          animeDetails.release = extractYear(releaseText);

          animeDetails.status = extractMetadata($, "Status");

          animeDetails.genre = [];
          $(SELECTORS.details.genres).each((_, element) => {
            const genreText = $(element).text().trim();
            if (genreText) {
              animeDetails.genre.push(genreText);
            }
          });

          animeDetails.episodes = [];
          $(SELECTORS.details.chapterList).each((_, element) => {
            const $element = $(element);
            const id = $element.find(".eps a").text().trim();
            const episodeTitle = $element.find(".lchx a").text().trim();
            const episodeUrl = $element.find(".lchx a").attr("href") || "";
            const episodeDate = $element.find(".date").text().trim();

            if (id && episodeTitle) {
              animeDetails.episodes.push({
                id,
                title: episodeTitle,
                url: episodeUrl,
                date: episodeDate,
              });
            }
          });

          resolve(animeDetails);
        } catch (error) {
          console.error("Failed to fetch anime details:", error);
          reject(error);
        }
      });
    },

    /**
     * Fetches the latest anime releases with pagination
     * @param {number} page - The page number to fetch
     * @returns {Promise<Object>} Promise that resolves to an object with anime data and pagination info
     */
    getLatest: (page) => {
      return new Promise(async (resolve, reject) => {
        try {
          const uri = `${BASE_URL}/anime-terbaru/page/${page}/`;
          const responseData = await fetchWithParsing(uri);
          const $ = load(responseData.html);
          const animeList = [];

          $(SELECTORS.latest.animeList).each((index, element) => {
            const $element = $(element);
            const titleElement = $element.find(SELECTORS.latest.animeTitle);
            const title = titleElement.text().trim();
            const url = titleElement.attr("href") || "";
            const imageUrl = extractAttributeWithFallback(
              $,
              "src",
              SELECTORS.latest.animeImage,
              []
            );
            const episode = $element
              .find(SELECTORS.latest.episodeText)
              .text()
              .trim();
            const id = extractAnimeId(url, `anime-${page}-${index}`);

            if (title && url) {
              animeList.push({
                id,
                title,
                imageUrl,
                episode,
                url,
              });
            }
          });

          resolve({
            data: animeList,
            nextPage: animeList.length > 0 ? page + 1 : undefined,
          });
        } catch (error) {
          console.error("Failed to fetch latest anime:", error);
          reject(error);
        }
      });
    },

    /**
     * Fetches popular anime with pagination support
     * Note: Samehadaku only shows popular anime on the homepage
     * @param {number} page - The page number to fetch
     * @returns {Promise<Object>} Promise that resolves to an object with anime data and pagination info
     */
    getPopular: (page) => {
      return new Promise(async (resolve, reject) => {
        try {
          // For samehadaku, popular anime is on the homepage, so we'll use the same URL for all pages
          // but implement pagination logic for consistency
          const uri = `${BASE_URL}/`;
          const data = await fetchWithParsing(uri);
          const $ = load(data.html);
          let animeData = [];

          $(SELECTORS.popular.animeList).each((_, element) => {
            const $element = $(element);
            const url = extractAttributeWithFallback(
              $,
              "href",
              SELECTORS.popular.animeLink,
              []
            );
            const urlParts = url.split("/");
            const id = urlParts[urlParts.length - 2] || "";
            const title = extractTextWithFallback(
              $,
              SELECTORS.popular.animeTitle,
              []
            );
            const imageUrl = extractAttributeWithFallback(
              $,
              "src",
              SELECTORS.popular.animeImage,
              []
            );

            if (id && title && url) {
              animeData.push({
                id,
                title,
                imageUrl,
                episode: "0",
                url,
              });
            }
          });

          // For samehadaku, we only have one page of popular anime
          // Return empty array for pages > 1
          if (page > 1) {
            animeData = [];
          }

          resolve({
            data: animeData,
            nextPage: page === 1 && animeData.length > 0 ? page + 1 : undefined,
          });
        } catch (error) {
          console.error("Failed to fetch popular anime:", error);
          reject(error);
        }
      });
    },

    /**
     * Searches for anime based on a query with pagination
     * @param {string} search - The search query
     * @param {number} page - The page number to fetch
     * @returns {Promise<Object>} Promise that resolves to an object with search results and pagination info
     */
    getSearch: (search, page) => {
      return new Promise(async (resolve, reject) => {
        try {
          const uri = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(
            search
          )}`;
          const responseData = await fetchWithParsing(uri);
          const $ = load(responseData.html);
          const animeList = [];

          $(SELECTORS.search.animeList).each((index, element) => {
            const $element = $(element);
            const title = extractTextWithFallback(
              $,
              SELECTORS.search.animeTitle,
              []
            );
            const url = extractAttributeWithFallback(
              $,
              "href",
              SELECTORS.search.animeLink,
              []
            );
            const imageUrl = extractAttributeWithFallback(
              $,
              "src",
              SELECTORS.search.animeImage,
              []
            );
            const status = extractTextWithFallback(
              $,
              SELECTORS.search.status,
              []
            );
            const id = extractAnimeId(url, `search-${page}-${index}`);

            if (title && url && id) {
              animeList.push({
                id,
                title,
                imageUrl,
                episode: status,
                url,
              });
            }
          });

          resolve({
            data: animeList,
            nextPage: animeList.length > 0 ? page + 1 : undefined,
          });
        } catch (error) {
          console.error("Failed to search anime:", error);
          reject(error);
        }
      });
    },

    /**
     * Fetches available video servers for a specific anime episode
     * @param {string} url - The URL of the anime episode page
     * @returns {Promise<Array>} Promise that resolves to an array of video server options
     */
    getVideoServers: (url) => {
      return new Promise(async (resolve, reject) => {
        try {
          const data = await fetchWithParsing(url);
          const $ = load(data.html);
          const playerOptions = [];

          $(SELECTORS.video.serverList).each((_, element) => {
            const $option = $(element).find(SELECTORS.video.serverOption);
            const id = $option.attr("id") || "";
            const postId = $option.attr("data-post") || "";
            const nume = $option.attr("data-nume") || "";
            const type = $option.attr("data-type") || "";
            const label = $option.find("span").text().trim();
            const isActive = $option.hasClass("on");

            if (
              postId &&
              nume &&
              type &&
              label &&
              (label.includes("Wibufile") || label.includes("Premium")) &&
              !label.includes("480p")
            ) {
              playerOptions.push({
                id,
                url,
                postId: parseInt(postId),
                nume: parseInt(nume),
                type,
                label,
                isActive,
              });
            }
          });

          resolve(playerOptions);
        } catch (error) {
          console.error("Failed to fetch video servers:", error);
          reject(error);
        }
      });
    },

    /**
     * Fetches the actual video URL from a selected server
     * @param {Object} params - Parameters containing server information
     * @param {number} params.postId - The post ID for the video
     * @param {number} params.nume - The episode number
     * @param {string} params.type - The type of video server
     * @returns {Promise<string>} Promise that resolves to the video iframe URL
     */
    getVideoUrl: (params) => {
      return new Promise(async (resolve, reject) => {
        try {
          const formData = new URLSearchParams({
            action: "player_ajax",
            post: params.postId.toString(),
            nume: params.nume.toString(),
            type: params.type,
          }).toString();

          const data = await fetchWithParsing(
            `${BASE_URL}/wp-admin/admin-ajax.php`,
            {
              method: "POST",
              body: formData,
            }
          );

          const $ = load(data.html);
          const iframeSrc = $(SELECTORS.video.iframe).attr("src");

          if (!iframeSrc) {
            reject(new Error("No iframe found in video player response"));
            return;
          }

          resolve(iframeSrc);
        } catch (error) {
          console.error("Failed to fetch video URL:", error);
          reject(error);
        }
      });
    },
  };
})();
