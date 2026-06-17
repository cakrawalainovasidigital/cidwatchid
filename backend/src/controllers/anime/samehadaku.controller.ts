import { Context } from "hono";
import { serializeError } from "../../lib/errorHelper";
import samehadakuHelper, { 
  APIResponse, 
  WPPost,
  WPCategory,
  APKLatestEpisode
} from "../../lib/utils/samehadakuHelper";


const buildCdnUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  
  if (imageUrl.includes("i2.wp.com") || imageUrl.includes("i0.wp.com")) {
    return imageUrl;
  }
  
  if (imageUrl.includes("v1.samehadaku.how")) {
    return imageUrl.replace(
      "https://v1.samehadaku.how",
      "https://i2.wp.com/v1.samehadaku.how"
    );
  }
  
  return imageUrl;
};


const extractIdFromUrl = (url: string): string => {
  const match = url.match(/id=(\d+)/);
  return match ? match[1] : "";
};


const extractImageFromPost = (post: WPPost): string | null => {
  const embedded = (post as any)._embedded;
  if (embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    return buildCdnUrl(embedded["wp:featuredmedia"][0].source_url);
  }
  
  
  if (post.yoast_head) {
    const match = post.yoast_head.match(/<meta property="og:image" content="([^"]+)"/);
    if (match) return buildCdnUrl(match[1]);
  }
  

  const contentMatch = post.content?.rendered?.match(/<img[^>]+src=["']([^"']+)["']/);
  if (contentMatch) return buildCdnUrl(contentMatch[1]);
  
  return null;
};

export const getSamehadakuRecommendations = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;

  try {
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        success: false,
        message: "Invalid pagination params. Page must be >= 1, limit between 1-100"
      }, 400);
    }

    
    const catResponse: APIResponse<WPCategory[]> = await samehadakuHelper.fetchCategories({
      page: page,
      perPage: limit,
      orderBy: "count",
      order: "desc"
    });

    if (!catResponse.success || !catResponse.data || catResponse.data.length === 0) {
      return c.json({
        success: false,
        message: "Data not found!"
      }, 404);
    }

    
    const animeList: any[] = [];
    
    for (const cat of catResponse.data) {
      let coverImage: string | null = null;
      
      try {
        
        const postsResponse: APIResponse<WPPost[]> = await samehadakuHelper.fetchPostsByCategory(cat.id, {
          perPage: 1,
          orderBy: "date",
          order: "desc",
          embed: true
        });
        
        if (postsResponse.success && postsResponse.data && postsResponse.data.length > 0) {
          coverImage = extractImageFromPost(postsResponse.data[0]);
        }
      } catch {
        
      }
      
      animeList.push({
        id: cat.id.toString(),
        title: cat.name,
        coverImage: coverImage,
        chapterCount: cat.count
      });
    }

    const data = {
      success: true,
      source: "samehadaku",
      path: c.req.path,
      count: animeList.length,
      data: animeList
    };

    return c.json(data, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};


export const getSamehadakuNewRelease = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;

  try {
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        success: false,
        message: "Invalid pagination params. Page must be >= 1, limit between 1-100"
      }, 400);
    }

    
    const postsResponse: APIResponse<WPPost[]> = await samehadakuHelper.fetchPosts({
      perPage: limit * 2,
      orderBy: "date",
      order: "desc",
      embed: true
    });

    if (postsResponse.success && postsResponse.data && postsResponse.data.length > 0) {
      
      const seenCategories = new Set<number>();
      const animeList: any[] = [];

      for (const post of postsResponse.data) {
        const categoryId = post.categories?.[0];
        if (!categoryId || seenCategories.has(categoryId)) continue;
        
        seenCategories.add(categoryId);
        
        
        const catResponse = await samehadakuHelper.fetchCategoryById(categoryId);
        if (catResponse.success && catResponse.data && !Array.isArray(catResponse.data)) {
          const cat = catResponse.data as WPCategory;
          animeList.push({
            id: cat.id.toString(),
            title: cat.name,
            coverImage: extractImageFromPost(post),
            chapterCount: cat.count,
            // lastUpdate: post.date
            // type: null,
            // score: null,
            // genre: [],
            // slug: cat.slug,
          });
        }

        if (animeList.length >= limit) break;
      }

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        count: animeList.length,
        data: animeList
      };

      return c.json(data, 200);
    } else {
      return c.json({
        success: false,
        message: "Data not found!"
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};


export const getSamehadakuSearch = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  const query = (c.req.query("query") || "").toString().trim();

  try {
    if (!query) {
      return c.json({ 
        success: false,
        message: "Query is required" 
      }, 400);
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        success: false,
        message: "Invalid pagination params. Page must be >= 1, limit between 1-100"
      }, 400);
    }

    const searchResponse: APIResponse<APKLatestEpisode[]> = await samehadakuHelper.fetchAPKSearch(query, page);

    if (searchResponse.success && searchResponse.data && searchResponse.data.length > 0) {
      const animeResults = searchResponse.data.map((item) => ({
        id: extractIdFromUrl(item.url),
        title: item.title,
        coverImage: buildCdnUrl(item.img),
        // type: item.type || null,
        // score: item.score || null,
        // genre: item.genre || [],
        // slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        count: animeResults.length,
        query: query,
        data: animeResults
      };

      return c.json(data, 200);
    } else {
      return c.json({
        success: false,
        message: `No anime found matching "${query}". Try different keywords.`
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

export const getSamehadakuOngoing = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;

  try {
    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        success: false,
        message: "Invalid pagination params. Page must be >= 1, limit between 1-100"
      }, 400);
    }

    
    const postsResponse: APIResponse<WPPost[]> = await samehadakuHelper.fetchPosts({
      perPage: limit * 3,
      orderBy: "date",
      order: "desc",
      embed: true
    });

    if (postsResponse.success && postsResponse.data && postsResponse.data.length > 0) {
      
      const seenCategories = new Set<number>();
      const animeList: any[] = [];

      for (const post of postsResponse.data) {
        const categoryId = post.categories?.[0];
        if (!categoryId || seenCategories.has(categoryId)) continue;
        
        seenCategories.add(categoryId);
        
       
        const catResponse = await samehadakuHelper.fetchCategoryById(categoryId);
        if (catResponse.success && catResponse.data && !Array.isArray(catResponse.data)) {
          const cat = catResponse.data as WPCategory;
          animeList.push({
            id: cat.id.toString(),
            title: cat.name,
            coverImage: extractImageFromPost(post), // Use post image as cover
            chapterCount: cat.count,
            // type: null,
            // score: null,
            // genre: [],
            // slug: cat.slug,
            // lastUpdate: post.date
          });
        }

        if (animeList.length >= limit) break;
      }

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        count: animeList.length,
        data: animeList
      };

      return c.json(data, 200);
    } else {
      return c.json({
        success: false,
        message: "Data not found!"
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};


export const getSamehadakuDetail = async (c: Context) => {
  const { id } = c.req.param();

  try {
    if (!id) {
      return c.json({
        success: false,
        message: "Anime ID or slug is required"
      }, 400);
    }

    let category: WPCategory | null = null;
    let animeId: number | null = null;
    let sourceType = "";

    if (!isNaN(Number(id))) {
      const numericId = Number(id);
      
      const apkDetail = await samehadakuHelper.fetchAPKAnimeDetail(numericId);
      
      if (apkDetail) {
        animeId = numericId;
        sourceType = "anime";
      }
    }

    
    if (!animeId && !isNaN(Number(id))) {
      const postId = Number(id);
      const postResponse = await samehadakuHelper.fetchPostById(postId, true);
      
      if (postResponse.success && postResponse.data && !Array.isArray(postResponse.data)) {
        const post = postResponse.data as WPPost;
        
        
        if (post.categories && post.categories.length > 0) {
          const catId = post.categories[0];
          const catResponse = await samehadakuHelper.fetchCategoryById(catId);
          
          if (catResponse.success && catResponse.data && !Array.isArray(catResponse.data)) {
            category = catResponse.data as WPCategory;
            sourceType = "post";
          }
        }
      }
    }

    
    if (!animeId && !category && !isNaN(Number(id))) {
      const catId = Number(id);
      const catResponse = await samehadakuHelper.fetchCategoryById(catId);
      
      if (catResponse.success && catResponse.data && !Array.isArray(catResponse.data)) {
        category = catResponse.data as WPCategory;
        sourceType = "category";
      }
    }

    
    if (!animeId && !category && isNaN(Number(id))) {
      const catResponse = await samehadakuHelper.fetchCategoryBySlug(id);
      
      if (catResponse.success && catResponse.data && Array.isArray(catResponse.data) && catResponse.data.length > 0) {
        category = catResponse.data[0] as WPCategory;
        sourceType = "slug";
      }
    }

    
    let synopsis: string | null = null;
    let coverImage: string | null = null;
    let animeType: string | null = null;
    let status: string | null = null;
    let score: string | null = null;
    let genres: string[] = [];
    let released: string | null = null;
    let season: string | null = null;

    if (animeId) {
      const apkDetail = await samehadakuHelper.fetchAPKAnimeDetail(animeId);
      if (apkDetail) {
        synopsis = apkDetail.synopsis || null;
        coverImage = buildCdnUrl(apkDetail.cover || apkDetail.img);
        animeType = apkDetail.type || null;
        status = apkDetail.status || null;
        score = apkDetail.score || null;
        released = apkDetail.released || null;
        season = apkDetail.season?.[0]?.name || null;
        if (apkDetail.genre) {
          genres = apkDetail.genre.map((g: any) => g.name);
        }
      }
    }

    
    if (!animeId && !category) {
      return c.json({
        
        message: "Anime not found! Try using the slug from the URL or a valid ID."
      }, 404);
    }

    // Fetch episodes (posts) for this category with embedded media
    const categoryId = category?.id || animeId!;
    const episodesResponse: APIResponse<WPPost[]> = await samehadakuHelper.fetchPostsByCategory(categoryId, {
      perPage: 100,
      orderBy: "date",
      order: "desc",
      embed: true
    });

    const episodes = episodesResponse.success && episodesResponse.data
      ? episodesResponse.data.map((post) => {
          const title = post.title?.rendered || "";
          const episodeMatch = title.match(/Episode\s*(\d+)/i);
          const chapterIndex = episodeMatch ? parseInt(episodeMatch[1], 10) : 0;
          
          return {
            episodeId: post.id.toString(),
            chapterIndex: chapterIndex,
            // title: title,
            // slug: post.slug,
            // date: post.date,
            // coverImage: extractImageFromPost(post)
          };
        })
      : [];

    const data = {
      success: true,
      source: "samehadaku",
      path: c.req.path,
      resolvedBy: sourceType,
      episodeCount: episodes.length,
      data: {
        id: animeId?.toString() || category?.id.toString() || id,
        title: category?.name || "",
        description: synopsis,
        coverImage: coverImage,
        chapterCount: category?.count || episodes.length,
        chapters: episodes
      }
    };

    return c.json(data, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};


export const getSamehadakuGenre = async (c: Context) => {
  try {
    
    const response: APIResponse<any[]> = await samehadakuHelper.fetchAPKGenres();

    if (response.success && response.data && response.data.length > 0) {
      const genres = response.data.map((item) => ({
        genreId: item.id?.toString() || item.slug,
        genre: item.name,
        slug: item.slug,
        count: item.count || null
      }));

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        count: genres.length,
        data: genres
      };

      return c.json(data, 200);
    } else {
      
      const fallbackResponse: APIResponse<APKLatestEpisode[]> = await samehadakuHelper.fetchAPKOngoing();
      
      if (fallbackResponse.success && fallbackResponse.data) {
        const genreSet = new Map<string, any>();
        
        for (const anime of fallbackResponse.data) {
          if (anime.genre) {
            for (const g of anime.genre) {
              if (!genreSet.has(g)) {
                genreSet.set(g, {
                  genreId: g.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  genre: g,
                });
              }
            }
          }
        }

        const genres = Array.from(genreSet.values());
        
        const data = {
          success: true,
          source: "samehadaku",
          path: c.req.path,
          count: genres.length,
          data: genres
        };

        return c.json(data, 200);
      }

      return c.json({
        success: false,
        message: "Genre data not found!"
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};


export const getSamehadakuGenreDetail = async (c: Context) => {
  const { genreId } = c.req.param();
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;

  try {
    if (!genreId) {
      return c.json({
        success: false,
        message: "Genre ID or slug is required"
      }, 400);
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return c.json({
        success: false,
        message: "Invalid pagination params. Page must be >= 1, limit between 1-100"
      }, 400);
    }

    
    const response: APIResponse<APKLatestEpisode[]> = await samehadakuHelper.fetchAPKAnimeByGenre(genreId, page);

    if (response.success && response.data && response.data.length > 0) {
      const animeList = response.data.map((item) => ({
        id: extractIdFromUrl(item.url),
        title: item.title,
        coverImage: buildCdnUrl(item.img),
        
      }));

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        count: animeList.length,
        data: animeList
      };

      return c.json(data, 200);
    } else {
      return c.json({
        success: false,
        message: `No anime found for genre "${genreId}"`
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

export const getSamehadakuStream = async (c: Context) => {
  const { episodeId } = c.req.param();

  try {
    if (!episodeId || isNaN(Number(episodeId))) {
      return c.json({
        success: false,
        message: "Valid episode ID is required"
      }, 400);
    }

    
    const episodeDetail = await samehadakuHelper.fetchAPKEpisodeDetail(Number(episodeId));

    if (episodeDetail) {
      const players = episodeDetail.player || [];
      
      const videoSources = samehadakuHelper.parseVideoSources(players);

      const data = {
        success: true,
        source: "samehadaku",
        path: c.req.path,
        data: {
          id: episodeId,
          title: episodeDetail.title,
          coverImage: buildCdnUrl(episodeDetail.thumb),
          // episode: episodeDetail.episode,
          streamUrl: videoSources[0]?.embedUrl || videoSources[0]?.directUrl || null,
          servers: videoSources.map((source) => ({
            name: source.provider,
            quality: source.quality,
            streamUrl: source.embedUrl || source.directUrl,
            // type: source.type
          })),
          // downloadUrl: episodeDetail.download || null,
          // prevEpisodeUrl: episodeDetail.prev || null
        }
      };

      return c.json(data, 200);
    } else {
      return c.json({
        success: false,
        message: "Episode not found or no video sources available!"
      }, 404);
    }
  } catch (error) {
    return c.json({
      success: false,
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};
