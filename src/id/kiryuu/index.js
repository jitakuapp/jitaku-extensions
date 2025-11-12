(() => {
  const CONFIG = {
    BASE_URL: "https://kiryuu03.com",
    SELECTORS: {
      HOMEPAGE_LIST: "#latest-list > div",
      SEARCH_RESULTS_LIST: "#search-results > div",
      CHAPTER_LIST: "#chapter-list",
      CHAPTER_IMAGES: "div.relative > section > section img",
      TITLE: "h1.text-2xl.font-bold",
      ALT_TITLE: ".block.text-sm.text-text.line-clamp-1",
      IMAGE: '.relative[itemprop="image"] img',
      RATING:
        ".bg-gradient-to-br.from-violet-500.to-accent-2.text-transparent.bg-clip-text",
      SYNOPSIS: 'div[itemprop="description"]',
      GENRE: 'a[itemprop="genre"]',
      METADATA_CONTAINER: ".space-y-2 > div",
    },
    JS_SCRIPTS: {
      WAIT_FOR_ELEMENT: (selector) => `
        (function() {
          let isProcessed = false;
          function checkForData() {
            if (isProcessed) return;
            const element = document.querySelector("${selector}");
            if (element) {
              isProcessed = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'HTML_CONTENT',
                html: document.documentElement.outerHTML
              }));
              return;
            }
            setTimeout(checkForData, 500);
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkForData);
          } else {
            checkForData();
          }
          true;
        })();
      `,
      WAIT_FOR_CHAPTER_LIST: `
        (function() {
          let isProcessed = false;
          function waitForChapterList() {
            if (isProcessed) return;
            const descriptionTab = document.querySelector("#tab-description:nth-child(2)");
            if (descriptionTab) descriptionTab.click();
            
            const chapterListElement = document.querySelector("#chapter-list > div[data-chapter-number]");
            if (chapterListElement) {
              isProcessed = true;
             
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'HTML_CONTENT',
                html: document.documentElement.outerHTML
              }));
              return;
            }
            setTimeout(waitForChapterList, 500);
          }
          if (document.readyState === 'complete') {
            waitForChapterList();
          } else {
            document.addEventListener('readystatechange', () => {
              if (document.readyState === 'complete') waitForChapterList();
            });
          }
          true;
        })();
      `,
    },
  };

  const makeAbsoluteUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : CONFIG.BASE_URL + url;
  };

  const extractIdFromUrl = (url) => {
    if (!url) return "";
    const parts = url.replace(/\/$/, "").split("/");
    return parts[parts.length - 1] || parts[parts.length - 2] || "";
  };

  const cleanRating = (ratingText) => {
    if (!ratingText) return "";
    const match = ratingText.match(/(\d+\.\d+)/);
    return match ? match[1] : "";
  };

  const parseMangaList = (html, listSelector) => {
    const mangaData = [];
    const seenIds = new Set();
    const $ = load(html);

    $(listSelector).each((_, element) => {
      const $element = $(element);

      const title = (
        $element.find("h1").text().trim() ||
        $element.find('a[href*="/manga/"]').first().text().trim()
      )
        .split("\t")[0]
        .trim();
      const mangaUrl =
        $element.find('a[href*="/manga/"]').first().attr("href") || "";
      const imageUrl = $element.find("img").first().attr("src") || "";

      const $chapterLink = $element.find('a[href*="/chapter-"]').first();
      const chapterUrl = $chapterLink.attr("href") || "";
      const chapterText =
        $chapterLink.find("p, .item-center p").text().trim() || "";
      const chapterTime = $chapterLink.find("time").attr("datetime") || "";

      const id = extractIdFromUrl(mangaUrl);

      if (!id || seenIds.has(id) || !title || !mangaUrl) return;

      seenIds.add(id);

      const rating = cleanRating($element.find(".numscore").text().trim());
      const status =
        $element.find(".text-xs.font-normal p").last().text().trim() ||
        $element
          .find(".bg-green-600, .bg-red-600")
          .parent()
          .find("p")
          .text()
          .trim() ||
        "";

      mangaData.push({
        id,
        title,
        imageUrl,
        episode: chapterText,
        url: makeAbsoluteUrl(mangaUrl),
        chapterUrl: makeAbsoluteUrl(chapterUrl),
        chapterTime,
        rating,
        status,
      });
    });

    return mangaData;
  };

  return {
    getHomepage: () => {
      return new Promise((resolve, reject) => {
        fetch({
          uri: CONFIG.BASE_URL + "/",
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const mangaData = parseMangaList(
                data.html,
                CONFIG.SELECTORS.HOMEPAGE_LIST
              );
              resolve(mangaData);
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getDetails: (url) => {
      return new Promise((resolve, reject) => {
        fetch({
          uri: url,
          injectedJavaScript: CONFIG.JS_SCRIPTS.WAIT_FOR_CHAPTER_LIST,
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);
              const details = {};

              details.title = $(CONFIG.SELECTORS.TITLE).first().text().trim();
              details.alternative = $(CONFIG.SELECTORS.ALT_TITLE)
                .first()
                .text()
                .trim();
              details.image =
                $(CONFIG.SELECTORS.IMAGE).first().attr("src") || "";
              details.rating = $(CONFIG.SELECTORS.RATING).first().text().trim();
              details.sinopsis = $(CONFIG.SELECTORS.SYNOPSIS)
                .last()
                .find("p")
                .text()
                .trim();

              $(CONFIG.SELECTORS.METADATA_CONTAINER).each((_, el) => {
                const $el = $(el);
                const label = $el.find("h4.font-semibold").text().trim();
                const value = $el.find("p.font-normal").text().trim();
                if (label.includes("Type")) details.type = value;
                else if (label.includes("Released")) details.release = value;
                else if (label.includes("Author")) details.author = value;
                else if (label.includes("Serialization"))
                  details.studio = value;
                else if (label.includes("Total views")) details.views = value;
                else if (label.includes("Last Updates"))
                  details.createdDate = value;
              });

              details.genre = [];
              $(CONFIG.SELECTORS.GENRE).each((_, el) => {
                const genreText = $(el).find("span").first().text().trim();
                if (genreText) details.genre.push(genreText);
              });

              details.episodes = [];
              $(CONFIG.SELECTORS.CHAPTER_LIST)
                .children()
                .each((_, el) => {
                  const $el = $(el);
                  let chapterData = {};

                  if ($el.is("a")) {
                    // Format <a>
                    chapterData = {
                      id:
                        $el
                          .find("[data-chapter-number]")
                          .attr("data-chapter-number") ||
                        extractIdFromUrl($el.attr("href")),
                      title: $el.find("span").first().text().trim(),
                      url: makeAbsoluteUrl($el.attr("href")),
                      date: $el.find("time").attr("datetime") || "",
                      views: $el
                        .find('svg[data-lucide="eye"]')
                        .parent()
                        .find("p")
                        .first()
                        .text()
                        .trim(),
                      likes: $el
                        .find("#heart-svg")
                        .parent()
                        .find("p")
                        .first()
                        .text()
                        .trim(),
                    };
                  } else if ($el.is("div")) {
                    // Format <div>
                    const $link = $el.find('a[href*="/chapter-"]').first();
                    chapterData = {
                      id:
                        $el.attr("data-chapter-number") ||
                        extractIdFromUrl($link.attr("href")),
                      title: $el.find("span").first().text().trim(),
                      url: makeAbsoluteUrl($link.attr("href")),
                      date: $el.find("time").attr("datetime") || "",
                      downloadUrl: makeAbsoluteUrl(
                        $el.find('a[href*="drive.google.com"]').attr("href") ||
                          ""
                      ),
                      views: $el
                        .find('svg[data-lucide="eye"]')
                        .parent()
                        .find("p")
                        .first()
                        .text()
                        .trim(),
                      likes: $el
                        .find("#heart-svg")
                        .parent()
                        .find("p")
                        .first()
                        .text()
                        .trim(),
                    };
                  }

                  if (chapterData.id && chapterData.url) {
                    details.episodes.push(chapterData);
                  }
                });

              resolve(details);
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getImages: (url) => {
      return new Promise((resolve, reject) => {
        fetch({
          uri: url,
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);
              const images = [];
              $(CONFIG.SELECTORS.CHAPTER_IMAGES).each((_, el) => {
                const src = $(el).attr("src");
                if (src) images.push(src);
              });
              resolve(images);
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getLatest: (page = 1) => {
      return new Promise((resolve, reject) => {
        const uri =
          CONFIG.BASE_URL +
          "/advanced-search/?the_page=" +
          page +
          "&order=desc&orderby=updated";
        fetch({
          uri,
          injectedJavaScript: CONFIG.JS_SCRIPTS.WAIT_FOR_ELEMENT(
            CONFIG.SELECTORS.SEARCH_RESULTS_LIST
          ),
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const mangaData = parseMangaList(
                data.html,
                CONFIG.SELECTORS.SEARCH_RESULTS_LIST
              );
              resolve({
                data: mangaData,
                nextPage: mangaData.length > 0 ? page + 1 : undefined,
              });
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getPopular: (page = 1) => {
      return new Promise((resolve, reject) => {
        const uri =
          CONFIG.BASE_URL +
          "/advanced-search/?the_page=" +
          page +
          "&order=desc&orderby=popular";
        fetch({
          uri,
          injectedJavaScript: CONFIG.JS_SCRIPTS.WAIT_FOR_ELEMENT(
            CONFIG.SELECTORS.SEARCH_RESULTS_LIST
          ),
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const mangaData = parseMangaList(
                data.html,
                CONFIG.SELECTORS.SEARCH_RESULTS_LIST
              );
              resolve({
                data: mangaData,
                nextPage: mangaData.length > 0 ? page + 1 : undefined,
              });
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getSearch: (query, page = 1) => {
      return new Promise((resolve, reject) => {
        const uri =
          CONFIG.BASE_URL +
          "/advanced-search/?the_page=" +
          page +
          "&search_term=" +
          encodeURIComponent(query) +
          "&order=desc&orderby=updated";
        fetch({
          uri,
          injectedJavaScript: CONFIG.JS_SCRIPTS.WAIT_FOR_ELEMENT(
            CONFIG.SELECTORS.SEARCH_RESULTS_LIST
          ),
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const mangaData = parseMangaList(
                data.html,
                CONFIG.SELECTORS.SEARCH_RESULTS_LIST
              );
              resolve({
                data: mangaData,
                nextPage: mangaData.length > 0 ? page + 1 : undefined,
              });
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },
  };
})();
