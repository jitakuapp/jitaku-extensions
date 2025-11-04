(() => {
  return {
    getHomepage: () => {
      return new Promise((resolve, reject) => {
        fetch({
          uri: "https://v1.samehadaku.how/",
          onMessage: (event) => {
            try {
              let animeData = [];
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);

              $(".post-show ul li").each((_, element) => {
                const $element = $(element);
                const url = $element.find(".thumb a").attr("href") || "";
                const urlParts = url.split("/");
                const id = urlParts[urlParts.length - 2] || "";
                const title =
                  $element.find(".dtla h2.entry-title a").text().trim() || "";
                const imageUrl = $element.find(".thumb img").attr("src") || "";
                const episodeFirst = $element.find(".dtla span").first();
                const episodeText =
                  episodeFirst.find('author[itemprop="name"]').text().trim() ||
                  "";
                const episode = episodeText
                  .replace(/\\[END\\]|\\s+/g, "")
                  .trim();

                if (id && title && url) {
                  animeData.push({
                    id: id,
                    title: title,
                    imageUrl: imageUrl,
                    episode: episode,
                    url: url,
                  });
                }
              });

              resolve(animeData);
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
          onMessage: (event) => {
            try {
              let animeDetails = {};
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);

              // Get title
              animeDetails.title =
                $("h1.entry-title").text().trim() ||
                $("h2.entry-title").text().trim() ||
                "";

              // Get image
              animeDetails.image =
                $(".thumb img.anmsa").attr("src") ||
                $(".thumb img").first().attr("src") ||
                $(".infoanime img").first().attr("src") ||
                "";

              // Get synopsis
              animeDetails.sinopsis =
                $(".entry-content-single p").first().text().trim() ||
                $(".desc p").first().text().trim() ||
                "";

              // Get studio
              animeDetails.studio = "";
              $(".spe span").each((_, element) => {
                const text = $(element).text().trim();
                if (text.includes("Studio")) {
                  animeDetails.studio = text.replace("Studio", "").trim();
                }
              });

              // Get release info
              animeDetails.release = "";
              $(".spe span").each((_, element) => {
                const text = $(element).text().trim();
                if (text.includes("Released:")) {
                  const releaseText = text.replace("Released:", "").trim();
                  const yearMatch = releaseText.match(/\\d{4}/);
                  if (yearMatch) {
                    animeDetails.release = yearMatch[0];
                  }
                }
              });

              // Get status
              animeDetails.status = "";
              $(".spe span").each((_, element) => {
                const text = $(element).text().trim();
                if (text.includes("Status")) {
                  const statusText = text.replace("Status", "").trim();
                  animeDetails.status = statusText;
                }
              });

              // Get genres
              animeDetails.genre = [];
              $(".genre-info a").each((_, element) => {
                const genreText = $(element).text().trim();
                if (genreText) {
                  animeDetails.genre.push(genreText);
                }
              });

              // Get episodes list
              animeDetails.episodes = [];
              $(".lstepsiode.listeps ul li").each((_, element) => {
                const $element = $(element);
                const id = $element.find(".eps a").text().trim();
                const episodeTitle = $element.find(".lchx a").text().trim();
                const episodeUrl = $element.find(".lchx a").attr("href") || "";
                const episodeDate = $element.find(".date").text().trim();

                if (id && episodeTitle) {
                  animeDetails.episodes.push({
                    id: id,
                    title: episodeTitle,
                    url: episodeUrl,
                    date: episodeDate,
                  });
                }
              });

              resolve(animeDetails);
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getLatest: (page) => {
      return new Promise((resolve, reject) => {
        const uri = `https://v1.samehadaku.how/anime-terbaru/page/${page}/`;

        fetch({
          uri,
          onMessage: (event) => {
            try {
              let animeList = [];
              const responseData = JSON.parse(event.nativeEvent.data);
              const $ = load(responseData.html);

              $(
                'li[itemscope][itemtype="http://schema.org/CreativeWork"]'
              ).each((index, element) => {
                const $element = $(element);
                const titleElement = $element.find("h2.entry-title a");
                const title = titleElement.text().trim();
                const url = titleElement.attr("href") || "";
                const imageElement = $element.find("img");
                const imageUrl = imageElement.attr("src") || "";
                const episodeElement = $element
                  .find("span")
                  .first()
                  .find('author[itemprop="name"]');
                const episode = episodeElement.text().trim();
                //   const urlMatch = url.match(/\\/anime\\/([^\\/]+)\\//);
                const urlMatch = url.match(/\/anime\/([^\/]+)\//);
                const id = urlMatch ? urlMatch[1] : `anime-${page}-${index}`;

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
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getPopular: (page) => {
      return new Promise((resolve, reject) => {
        // For samehadaku, popular anime is on the homepage, so we'll use the same URL for all pages
        // but implement pagination logic for consistency
        const uri =
          page === 1
            ? "https://v1.samehadaku.how/"
            : "https://v1.samehadaku.how/";

        fetch({
          uri,
          onMessage: (event) => {
            try {
              let animeData = [];
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);

              $(".topten-animesu ul li").each((_, element) => {
                const $element = $(element);
                const url = $element.find("a").attr("href") || "";
                const urlParts = url.split("/");
                const id = urlParts[urlParts.length - 2] || "";
                const title = $element.find(".judul").text().trim() || "";
                const imageUrl = $element.find("img").attr("src") || "";

                if (id && title && url) {
                  animeData.push({
                    id: id,
                    title: title,
                    imageUrl: imageUrl,
                    episode: "0",
                    url: url,
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
                nextPage:
                  page === 1 && animeData.length > 0 ? page + 1 : undefined,
              });
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getSearch: (search, page) => {
      return new Promise((resolve, reject) => {
        const uri = `https://v1.samehadaku.how/page/${page}/?s=${search}`;

        fetch({
          uri,
          onMessage: (event) => {
            try {
              let animeList = [];
              const responseData = JSON.parse(event.nativeEvent.data);
              const $ = load(responseData.html);

              $("article.animpost").each((index, element) => {
                const $element = $(element);
                const title = $element.find(".data .title h2").text().trim();
                const url = $element.find(".animposx > a").attr("href") || "";
                const imageUrl =
                  $element.find(".content-thumb img").attr("src") || "";
                const status = $element.find(".data .type").text().trim();
                const urlMatch = url.match(/\/anime\/([^\/]+)\//);
                const id = urlMatch ? urlMatch[1] : `search-${page}-${index}`;

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
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getVideoServers: (url) => {
      return new Promise((resolve, reject) => {
        fetch({
          uri: url,
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);
              const playerOptions = [];

              // Extract all player options from #server
              $("#server ul li").each((_, element) => {
                const $option = $(element).find(".east_player_option");
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
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
        });
      });
    },

    getVideoUrl: (params) => {
      return new Promise((resolve, reject) => {
        const formData = new URLSearchParams({
          action: "player_ajax",
          post: params.postId.toString(),
          nume: params.nume.toString(),
          type: params.type,
        }).toString();

        fetch({
          uri: "https://v1.samehadaku.how/wp-admin/admin-ajax.php",
          onMessage: (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              const $ = load(data.html);
              const iframeSrc = $("iframe").attr("src");

              if (!iframeSrc) {
                reject(new Error("No iframe found"));
                return;
              }

              resolve(iframeSrc);
            } catch (error) {
              console.error("Failed to parse message:", error);
              reject(error);
            }
          },
          method: "POST",
          body: formData,
        });
      });
    },
  };
})();
