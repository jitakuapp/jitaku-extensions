/**
 * Kiryuu Manga Scraper
 *
 * A comprehensive scraper for the Kiryuu manga website (kiryuu03.com)
 * This module provides methods to extract manga information including:
 * - Homepage listings with latest updates
 * - Detailed manga information including chapters
 * - Chapter images for reading
 * - Search functionality
 * - Popular and latest manga listings
 *
 * @author Jitaku
 * @version 1.0.0
 * @license MIT
 */

(() => {
  const BASE_URL = "https://kiryuu03.com";

  const SELECTORS = {
    homepage: {
      mangaList: "#latest-list > div",
      mangaTitle: "h1",
      mangaLink: 'a[href*="/manga/"]',
      mangaImage: "img",
      chapterLink: 'a[href*="/chapter-"]',
      chapterText: "p, .item-center p",
      chapterTime: "time",
      rating: ".numscore",
      status: ".text-xs.font-normal p, .bg-green-600, .bg-red-600",
    },

    details: {
      title: "h1.text-2xl.font-bold",
      alternative: ".block.text-sm.text-text.line-clamp-1",
      image: '.relative[itemprop="image"] img',
      metadata: ".space-y-2 > div",
      metadataLabel: "h4.font-semibold",
      metadataValue: "p.font-normal",
      rating:
        ".bg-gradient-to-br.from-violet-500.to-accent-2.text-transparent.bg-clip-text",
      synopsis: 'div[itemprop="description"] p',
      genres: 'a[itemprop="genre"] span',
      chapterList: "#chapter-list",
    },

    chapter: {
      images: "div.relative > section > section img",
    },

    search: {
      results: "#search-results > div",
    },
  };

  /**
   * Creates a standardized manga object from parsed HTML elements
   * @param {Object} $ - Cheerio instance for DOM manipulation
   * @param {Object} element - The DOM element to parse
   * @param {Set} seenIds - Set to track already processed manga IDs
   * @returns {Object|null} - Standardized manga object or null if invalid
   */
  const parseMangaEntry = ($, element, seenIds = new Set()) => {
    const $element = $(element);

    let title =
      $element.find(SELECTORS.homepage.mangaTitle).text().trim() ||
      $element.find(SELECTORS.homepage.mangaLink).first().text().trim() ||
      "";

    if (title) {
      title = title.split("\t")[0].trim();
    }

    const mangaUrl =
      $element.find(SELECTORS.homepage.mangaLink).first().attr("href") || "";

    const imageUrl =
      $element.find(SELECTORS.homepage.mangaImage).first().attr("src") || "";

    let chapterUrl = "";
    let chapterText = "";
    let chapterTime = "";

    const $horizontalChapter = $element
      .find(SELECTORS.homepage.chapterLink)
      .first();
    if ($horizontalChapter.length > 0) {
      chapterUrl = $horizontalChapter.attr("href") || "";
      chapterText =
        $horizontalChapter.find(SELECTORS.homepage.chapterText).text().trim() ||
        "";
      chapterTime =
        $horizontalChapter
          .find(SELECTORS.homepage.chapterTime)
          .attr("datetime") || "";
    }

    if (!chapterUrl) {
      const $verticalChapter = $element
        .find(SELECTORS.homepage.chapterLink)
        .first();
      if ($verticalChapter.length > 0) {
        chapterUrl = $verticalChapter.attr("href") || "";
        chapterText =
          $verticalChapter.find(".item-center p").text().trim() || "";
        chapterTime = $verticalChapter.find("time").attr("datetime") || "";
      }
    }

    const urlParts = mangaUrl.split("/");
    const id =
      urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1] || "";

    if (seenIds.has(id)) {
      return null;
    }
    seenIds.add(id);

    let rating = $element.find(SELECTORS.homepage.rating).text().trim() || "";
    if (rating) {
      const ratingMatch = rating.match(/(\d+\.\d+)/);
      rating = ratingMatch ? ratingMatch[1] : "";
    }

    const status =
      $element.find(".text-xs.font-normal p").last().text().trim() ||
      $element
        .find(".bg-green-600, .bg-red-600")
        .parent()
        .find("p")
        .text()
        .trim() ||
      "";

    if (!id || !title || !mangaUrl) {
      return null;
    }

    return {
      id,
      title,
      imageUrl,
      episode: chapterText,
      url: mangaUrl.startsWith("http") ? mangaUrl : `${BASE_URL}${mangaUrl}`,
      chapterUrl: chapterUrl.startsWith("http")
        ? chapterUrl
        : `${BASE_URL}${chapterUrl}`,
      chapterTime,
      rating,
      status,
    };
  };

  /**
   * Creates a fetch configuration object for web requests
   * @param {string} uri - The URI to fetch
   * @param {Function} onMessage - Callback for handling messages
   * @param {string} injectedJavaScript - Optional JavaScript to inject
   * @returns {Object} - Fetch configuration object
   */
  const createFetchConfig = (uri, onMessage, injectedJavaScript = "") => ({
    uri,
    ...(injectedJavaScript && { injectedJavaScript }),
    onMessage,
  });

  /**
   * Handles common error patterns in fetch operations
   * @param {Error} error - The error to handle
   * @param {Function} reject - Promise reject function
   */
  const handleFetchError = (error, reject) => {
    console.error("Failed to fetch or parse data:", error);
    reject(error);
  };

  /**
   * Fetches and parses the homepage to get latest manga updates
   * @returns {Promise<Array>} - Array of manga objects from homepage
   */
  const getHomepage = () => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(`${BASE_URL}/`, (event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          const $ = load(data.html);
          const mangaData = [];
          const seenIds = new Set();

          $(SELECTORS.homepage.mangaList).each((_, element) => {
            const manga = parseMangaEntry($, element, seenIds);
            if (manga) {
              mangaData.push(manga);
            }
          });

          resolve(mangaData);
        } catch (error) {
          handleFetchError(error, reject);
        }
      });

      fetch(config);
    });
  };

  /**
   * JavaScript injection script for detail pages to handle dynamic content loading
   * This script waits for the chapter list to load via AJAX before extracting HTML
   */
  const DETAIL_PAGE_INJECTION = `(function() {
    // Function to wait for chapter list element to load via AJAX
    function waitForChapterList() {
      const chapterListElement = document.querySelector("#chapter-list > a:nth-child(1)");
      if (chapterListElement) {
        const fullHTML = document.documentElement.outerHTML;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'HTML_CONTENT',
          html: fullHTML
        }));
      } else {
        // Check again after 500ms
        setTimeout(waitForChapterList, 500);
      }
    }
    
    // Start process when document is complete
    if (document.readyState === 'complete') {
      // Click on the description tab
      const descriptionTab = document.querySelector("#tab-description:nth-child(2)");
      if (descriptionTab) {
        descriptionTab.click();
      }
      // Start waiting for chapter list
      waitForChapterList();
    } else {
      // Wait for document to complete
      document.addEventListener('readystatechange', function() {
        if (document.readyState === 'complete') {
          // Click on the description tab
          const descriptionTab = document.querySelector("#tab-description:nth-child(2)");
          if (descriptionTab) {
            descriptionTab.click();
          }
          // Start waiting for chapter list
          waitForChapterList();
        }
      });
    }
    
    true; // Required for WebView
  })();`;

  /**
   * Fetches detailed information about a specific manga including chapters
   * @param {string} url - The URL of the manga detail page
   * @returns {Promise<Object>} - Detailed manga information object
   */
  const getDetails = (url) => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(
        url,
        (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const $ = load(data.html);
            const mangaDetails = {};

            mangaDetails.title =
              $(SELECTORS.details.title).first().text().trim() || "";
            mangaDetails.alternative =
              $(SELECTORS.details.alternative).first().text().trim() || "";
            mangaDetails.image =
              $(SELECTORS.details.image).first().attr("src") || "";

            mangaDetails.status = "";
            mangaDetails.type = "";
            mangaDetails.author = "";
            mangaDetails.serialization = "";
            mangaDetails.rating = "";
            mangaDetails.createdDate = "";
            mangaDetails.released = "";
            mangaDetails.views = "";

            $(SELECTORS.details.metadata).each((_, element) => {
              const $element = $(element);
              const label = $element
                .find(SELECTORS.details.metadataLabel)
                .first()
                .text()
                .trim();
              const value = $element
                .find(SELECTORS.details.metadataValue)
                .first()
                .text()
                .trim();

              if (label.includes("Type")) mangaDetails.type = value;
              else if (label.includes("Released"))
                mangaDetails.released = value;
              else if (label.includes("Serialization"))
                mangaDetails.serialization = value;
              else if (label.includes("Total views"))
                mangaDetails.views = value;
              else if (label.includes("Last Updates"))
                mangaDetails.createdDate = value;
            });

            const ratingValue = $(SELECTORS.details.rating)
              .first()
              .text()
              .trim();
            mangaDetails.rating = ratingValue || "";

            mangaDetails.sinopsis =
              $(SELECTORS.details.synopsis).text().trim() || "";

            mangaDetails.genre = [];
            $(SELECTORS.details.genres).each((_, element) => {
              const genreText = $(element).text().trim();
              if (genreText) {
                mangaDetails.genre.push(genreText);
              }
            });

            mangaDetails.episodes = [];
            $(SELECTORS.details.chapterList)
              .children()
              .each((_, element) => {
                const $element = $(element);
                let chapterData = null;

                // Handle first format: <a ...>
                if ($element.is("a")) {
                  const chapterUrl = $element.attr("href") || "";
                  const chapterNumber =
                    $element
                      .find("[data-chapter-number]")
                      .first()
                      .attr("data-chapter-number") || "";
                  const chapterTitle =
                    $element.find("span").first().text().trim() ||
                    `Chapter ${chapterNumber}`;
                  const chapterDate =
                    $element.find("time").attr("datetime") || "";

                  let viewCount = "";
                  const $viewElement = $element
                    .find('svg[data-lucide="eye"]')
                    .parent()
                    .find("p")
                    .first();
                  if ($viewElement.length > 0) {
                    viewCount = $viewElement.text().trim();
                  }

                  let likeCount = "";
                  const $likeElement = $element
                    .find("#heart-svg")
                    .parent()
                    .find("p")
                    .first();
                  if ($likeElement.length > 0) {
                    likeCount = $likeElement.text().trim();
                  }

                  if (chapterUrl && chapterNumber) {
                    chapterData = {
                      id: chapterNumber,
                      title: chapterTitle,
                      url: chapterUrl.startsWith("http")
                        ? chapterUrl
                        : `${BASE_URL}${chapterUrl}`,
                      date: chapterDate,
                      downloadUrl: "",
                      views: viewCount,
                      likes: likeCount,
                    };
                  }
                }
                // Handle second format: <div ...>
                else if ($element.is("div")) {
                  const chapterNumber =
                    $element.attr("data-chapter-number") || "";
                  const $chapterLink = $element
                    .find('a[href*="/chapter-"]')
                    .first();
                  const chapterUrl = $chapterLink.attr("href") || "";
                  const chapterTitle =
                    $element.find("span").first().text().trim() ||
                    `Chapter ${chapterNumber}`;
                  const chapterDate =
                    $element.find("time").attr("datetime") || "";

                  const downloadUrl =
                    $element
                      .find('a[href*="drive.google.com"]')
                      .first()
                      .attr("href") || "";

                  let viewCount = "";
                  const $viewElement = $element
                    .find('svg[data-lucide="eye"]')
                    .parent()
                    .find("p")
                    .first();
                  if ($viewElement.length > 0) {
                    viewCount = $viewElement.text().trim();
                  }

                  let likeCount = "";
                  const $likeElement = $element
                    .find("#heart-svg")
                    .parent()
                    .find("p")
                    .first();
                  if ($likeElement.length > 0) {
                    likeCount = $likeElement.text().trim();
                  }

                  if (chapterUrl && chapterNumber) {
                    chapterData = {
                      id: chapterNumber,
                      title: chapterTitle,
                      url: chapterUrl.startsWith("http")
                        ? chapterUrl
                        : `${BASE_URL}${chapterUrl}`,
                      date: chapterDate,
                      downloadUrl: downloadUrl.startsWith("http")
                        ? downloadUrl
                        : `${BASE_URL}${downloadUrl}`,
                      views: viewCount,
                      likes: likeCount,
                    };
                  }
                }

                if (chapterData) {
                  mangaDetails.episodes.push(chapterData);
                }
              });

            resolve(mangaDetails);
          } catch (error) {
            handleFetchError(error, reject);
          }
        },
        DETAIL_PAGE_INJECTION
      );

      fetch(config);
    });
  };

  /**
   * Fetches images from a chapter page for reading
   * @param {string} url - The URL of the chapter page
   * @returns {Promise<Array>} - Array of image URLs
   */
  const getImages = (url) => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(url, (event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          const $ = load(data.html);
          const imageData = [];

          $(SELECTORS.chapter.images).each((_, element) => {
            const imageUrl = $(element).attr("src") || "";
            if (imageUrl) {
              imageData.push(imageUrl);
            }
          });

          resolve(imageData);
        } catch (error) {
          handleFetchError(error, reject);
        }
      });

      fetch(config);
    });
  };

  /**
   * JavaScript injection script for search results pages
   * This script waits for dynamic content to load before extracting HTML
   */
  const SEARCH_RESULTS_INJECTION = `(function() {
    // Flag to prevent multiple executions
    let isProcessed = false;
    
    // Function to check if data is available
    function checkForData() {
      if (isProcessed) return;
      
      // Check if the search results container has at least one child with data
      const firstResult = document.querySelector("#search-results > div:nth-child(1)");
      if (firstResult) {
        // Check if the first result has meaningful content (title, image, or link)
        const hasTitle = firstResult.querySelector('h1') || firstResult.querySelector('a[href*="/manga/"]');
        const hasImage = firstResult.querySelector('img');
        
        if (hasTitle || hasImage) {
          isProcessed = true;
          const fullHTML = document.documentElement.outerHTML;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'HTML_CONTENT',
            html: fullHTML
          }));
          return;
        }
      }
      
      // If data is not ready, check again after a delay
      setTimeout(checkForData, 500);
    }
    
    // Start checking for data
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkForData);
    } else {
      checkForData();
    }
    
    true; // Required for WebView
  })();`;

  /**
   * Builds a search URL with the specified parameters
   * @param {number} page - Page number
   * @param {string} orderBy - Sort order ('updated', 'popular')
   * @param {string} searchTerm - Optional search term
   * @returns {string} - Complete search URL
   */
  const buildSearchUrl = (page, orderBy, searchTerm = "") => {
    const baseUrl = `${BASE_URL}/advanced-search/`;
    const params = new URLSearchParams({
      the_page: page.toString(),
      the_genre: "",
      the_author: "",
      the_artist: "",
      the_exclude: "",
      the_type: "",
      the_status: "",
      search_term: searchTerm,
      project: "0",
      order: "desc",
      orderby: orderBy,
    });

    return `${baseUrl}?${params.toString()}`;
  };

  /**
   * Processes search results from the page HTML
   * @param {string} html - The HTML content to parse
   * @param {number} page - Current page number
   * @returns {Object} - Object containing manga data array and next page info
   */
  const processSearchResults = (html, page) => {
    const $ = load(html);
    const mangaData = [];
    const seenIds = new Set();

    $(SELECTORS.search.results).each((_, element) => {
      const manga = parseMangaEntry($, element, seenIds);
      if (manga) {
        mangaData.push(manga);
      }
    });

    return {
      data: mangaData,
      nextPage: mangaData.length > 0 ? page + 1 : undefined,
    };
  };

  /**
   * Fetches the latest manga updates with pagination
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<Object>} - Object containing manga data array and next page info
   */
  const getLatest = (page = 1) => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(
        buildSearchUrl(page, "updated"),
        (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const result = processSearchResults(data.html, page);
            resolve(result);
          } catch (error) {
            handleFetchError(error, reject);
          }
        },
        SEARCH_RESULTS_INJECTION
      );

      fetch(config);
    });
  };

  /**
   * Fetches popular manga with pagination
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<Object>} - Object containing manga data array and next page info
   */
  const getPopular = (page = 1) => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(
        buildSearchUrl(page, "popular"),
        (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const result = processSearchResults(data.html, page);
            resolve(result);
          } catch (error) {
            handleFetchError(error, reject);
          }
        },
        SEARCH_RESULTS_INJECTION
      );

      fetch(config);
    });
  };

  /**
   * Searches for manga by query with pagination
   * @param {string} query - Search query string
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<Object>} - Object containing manga data array and next page info
   */
  const getSearch = (query, page = 1) => {
    return new Promise((resolve, reject) => {
      const config = createFetchConfig(
        buildSearchUrl(page, "updated", encodeURIComponent(query)),
        (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const result = processSearchResults(data.html, page);
            resolve(result);
          } catch (error) {
            handleFetchError(error, reject);
          }
        },
        SEARCH_RESULTS_INJECTION
      );

      fetch(config);
    });
  };

  return {
    getHomepage,
    getDetails,
    getImages,
    getLatest,
    getPopular,
    getSearch,
  };
})();
