/**
 * Samehadaku Helper - Usage Examples
 * 
 * This file demonstrates how to use the samehadakuHelper
 * to fetch data from Samehadaku API
 */

import samehadakuHelper, {
  setCookies,
  getCompleteEpisode,
  getCompleteSeries,
  getLatestEpisodes,
  searchAnime,
  collectAllSeries,
  collectAllEpisodes,
  fetchPosts,
  fetchPostsByCategory,
  fetchCategories,
  fetchAPKLatest,
  parseEpisodeFromPost,
  parseSeriesFromCategory,
  type Episode,
  type AnimeSeries,
  type VideoSource,
  type AnimeImage,
} from "./samehadakuHelper";

// ============================================================================
// SETUP
// ============================================================================

// Set cookies for authentication (required to bypass Cloudflare)
// You need to extract these from browser or cookies.txt file
setCookies("cf_clearance=xxx; wp-settings=xxx");

// ============================================================================
// EXAMPLE 1: Get Latest Episodes with Video Sources
// ============================================================================

async function example1_GetLatestEpisodes() {
  console.log("=== Example 1: Get Latest Episodes ===");
  
  const episodes = await getLatestEpisodes(5);
  
  for (const episode of episodes) {
    console.log(`\nEpisode: ${episode.title}`);
    console.log(`Number: ${episode.episodeNumber}`);
    console.log(`URL: ${episode.url}`);
    
    // Video sources
    console.log("Video Sources:");
    for (const source of episode.videoSources) {
      console.log(`  - ${source.provider} ${source.quality}`);
      console.log(`    Type: ${source.type}`);
      console.log(`    Embed: ${source.embedUrl?.substring(0, 60)}...`);
      if (source.directUrl) {
        console.log(`    Direct: ${source.directUrl.substring(0, 60)}...`);
      }
    }
    
    // Thumbnail
    if (episode.thumbnail) {
      console.log(`Thumbnail: ${episode.thumbnail.cdnUrl || episode.thumbnail.sourceUrl}`);
    }
  }
}

// ============================================================================
// EXAMPLE 2: Get Complete Anime Series with All Episodes
// ============================================================================

async function example2_GetCompleteSeries() {
  console.log("\n=== Example 2: Get Complete Series ===");
  
  // You need the category ID (from WordPress category)
  // You can find this by fetching categories first
  const categoryId = 3086; // Example: Goumon Baito-kun no Nichijou
  
  const series = await getCompleteSeries(categoryId);
  
  if (series) {
    console.log(`\nSeries: ${series.title}`);
    console.log(`Slug: ${series.slug}`);
    console.log(`Episodes: ${series.episodeCount}`);
    console.log(`Type: ${series.type}`);
    console.log(`Status: ${series.status}`);
    console.log(`Score: ${series.score}`);
    console.log(`Genres: ${series.genres?.join(", ")}`);
    
    if (series.coverImage) {
      console.log(`Cover: ${series.coverImage.cdnUrl || series.coverImage.sourceUrl}`);
    }
    
    // Episodes
    if (series.episodes) {
      console.log("\nEpisodes:");
      for (const ep of series.episodes.slice(0, 3)) {
        console.log(`  - EP ${ep.episodeNumber}: ${ep.title}`);
        console.log(`    Video Sources: ${ep.videoSources.length}`);
      }
    }
  }
}

// ============================================================================
// EXAMPLE 3: Search Anime
// ============================================================================

async function example3_SearchAnime() {
  console.log("\n=== Example 3: Search Anime ===");
  
  const query = "naruto";
  const results = await searchAnime(query);
  
  console.log(`\nSearch results for "${query}":`);
  
  // Series (Categories)
  console.log(`\nSeries found: ${results.series.length}`);
  for (const series of results.series) {
    console.log(`  - ${series.title} (${series.episodeCount} episodes)`);
    console.log(`    URL: ${series.url}`);
  }
  
  // Episodes
  console.log(`\nEpisodes found: ${results.episodes.length}`);
  for (const episode of results.episodes) {
    console.log(`  - ${episode.title}`);
    console.log(`    Episode ${episode.episodeNumber}`);
  }
}

// ============================================================================
// EXAMPLE 4: Fetch All Anime Series (Paginated)
// ============================================================================

async function example4_FetchAllSeries() {
  console.log("\n=== Example 4: Fetch All Series ===");
  
  const series = await collectAllSeries((current, total) => {
    console.log(`Progress: ${current}/${total} series collected`);
  });
  
  console.log(`\nTotal series collected: ${series.length}`);
  
  // Show first 5
  console.log("\nFirst 5 series:");
  for (const s of series.slice(0, 5)) {
    console.log(`  - ${s.title} (${s.episodeCount} episodes)`);
  }
}

// ============================================================================
// EXAMPLE 5: Collect All Episodes for a Series
// ============================================================================

async function example5_CollectAllEpisodes() {
  console.log("\n=== Example 5: Collect All Episodes ===");
  
  const categoryId = 3086; // Example category
  
  const episodes = await collectAllEpisodes(categoryId, (current, total) => {
    console.log(`Progress: ${current}/${total} episodes collected`);
  });
  
  console.log(`\nTotal episodes collected: ${episodes.length}`);
  
  // Show video sources for first episode
  if (episodes.length > 0) {
    const firstEp = episodes[0];
    console.log(`\nFirst Episode: ${firstEp.title}`);
    console.log("Video Sources:");
    
    for (const source of firstEp.videoSources) {
      console.log(`  - ${source.provider} ${source.quality} (${source.type})`);
      
      if (source.directUrl) {
        console.log(`    Direct URL: ${source.directUrl}`);
      }
      if (source.embedUrl) {
        console.log(`    Embed URL: ${source.embedUrl.substring(0, 80)}...`);
      }
    }
  }
}

// ============================================================================
// EXAMPLE 6: Raw WordPress API Usage
// ============================================================================

async function example6_RawAPIUsage() {
  console.log("\n=== Example 6: Raw WordPress API Usage ===");
  
  // Fetch raw posts
  const postsResponse = await fetchPosts({
    page: 1,
    orderBy: "date",
    order: "desc",
  });
  
  if (postsResponse.success && Array.isArray(postsResponse.data)) {
    console.log(`\nFetched ${postsResponse.data.length} posts`);
    console.log(`Total available: ${postsResponse.total}`);
    console.log(`Total pages: ${postsResponse.totalPages}`);
    
    for (const post of postsResponse.data.slice(0, 3)) {
      const episode = parseEpisodeFromPost(post);
      console.log(`\n  - ${episode.title}`);
      console.log(`    ID: ${episode.id}`);
      console.log(`    Episode: ${episode.episodeNumber}`);
      console.log(`    Date: ${episode.date}`);
    }
  }
  
  // Fetch raw categories
  const catsResponse = await fetchCategories({
    orderBy: "count",
    order: "desc",
  });
  
  if (catsResponse.success && Array.isArray(catsResponse.data)) {
    console.log(`\n\nTop 5 anime by episode count:`);
    
    for (const cat of catsResponse.data.slice(0, 5)) {
      const series = parseSeriesFromCategory(cat);
      console.log(`  - ${series.title}: ${series.episodeCount} episodes`);
    }
  }
}

// ============================================================================
// EXAMPLE 7: Filter by Date Range
// ============================================================================

async function example7_FilterByDateRange() {
  console.log("\n=== Example 7: Filter by Date Range ===");
  
  // Get episodes from last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const after = sevenDaysAgo.toISOString();
  const before = now.toISOString();
  
  const response = await samehadakuHelper.fetchPostsByDateRange(after, before, {
    orderBy: "date",
    order: "desc",
  });
  
  if (response.success && Array.isArray(response.data)) {
    console.log(`\nEpisodes from last 7 days: ${response.total}`);
    
    for (const post of response.data.slice(0, 5)) {
      const episode = parseEpisodeFromPost(post);
      console.log(`  - ${episode.title} (${episode.date})`);
    }
  }
}

// ============================================================================
// EXAMPLE 8: Get Video Sources with Priority
// ============================================================================

async function example8_GetBestVideoSource() {
  console.log("\n=== Example 8: Get Best Video Source ===");
  
  const episodeId = 48504;
  const episode = await getCompleteEpisode(episodeId);
  
  if (episode) {
    console.log(`\nEpisode: ${episode.title}`);
    
    // Sort by quality (best first)
    const qualityOrder = ["1080p", "720p", "480p", "360p", "unknown"];
    
    const sortedSources = episode.videoSources.sort((a, b) => {
      const aIndex = qualityOrder.indexOf(a.quality);
      const bIndex = qualityOrder.indexOf(b.quality);
      return aIndex - bIndex;
    });
    
    // Prefer direct URLs
    const bestDirect = sortedSources.find(s => s.directUrl);
    const bestEmbed = sortedSources.find(s => s.embedUrl);
    
    if (bestDirect) {
      console.log(`\nBest Direct URL (${bestDirect.quality}):`);
      console.log(`  ${bestDirect.directUrl}`);
      console.log(`  Provider: ${bestDirect.provider}`);
    }
    
    if (bestEmbed) {
      console.log(`\nBest Embed URL (${bestEmbed.quality}):`);
      console.log(`  ${bestEmbed.embedUrl?.substring(0, 80)}...`);
      console.log(`  Provider: ${bestEmbed.provider}`);
    }
    
    // All sources summary
    console.log("\nAll sources:");
    for (const source of sortedSources) {
      const hasDirect = source.directUrl ? "[DIRECT]" : "";
      const hasEmbed = source.embedUrl ? "[EMBED]" : "";
      console.log(`  - ${source.provider} ${source.quality} ${hasDirect} ${hasEmbed}`);
    }
  }
}

// ============================================================================
// EXAMPLE 9: Working with Images
// ============================================================================

async function example9_WorkingWithImages() {
  console.log("\n=== Example 9: Working with Images ===");
  
  const episode = await getCompleteEpisode(48504);
  
  if (episode?.thumbnail) {
    const img: AnimeImage = episode.thumbnail;
    
    console.log("Image Info:");
    console.log(`  Source URL: ${img.sourceUrl}`);
    console.log(`  CDN URL: ${img.cdnUrl}`);
    console.log(`  Attachment ID: ${img.attachmentId}`);
    console.log(`  MIME Type: ${img.mimeType}`);
    console.log(`  Dimensions: ${img.width}x${img.height}`);
    
    if (img.sizes) {
      console.log("\nAvailable sizes:");
      if (img.sizes.thumbnail) console.log(`  - Thumbnail: ${img.sizes.thumbnail}`);
      if (img.sizes.medium) console.log(`  - Medium: ${img.sizes.medium}`);
      if (img.sizes.large) console.log(`  - Large: ${img.sizes.large}`);
      console.log(`  - Full: ${img.sizes.full}`);
    }
  }
}

// ============================================================================
// EXAMPLE 10: APK Endpoints Usage
// ============================================================================

async function example10_APKEndpoints() {
  console.log("\n=== Example 10: APK Endpoints ===");
  
  // Latest episodes
  const latest = await fetchAPKLatest();
  if (latest.success && Array.isArray(latest.data)) {
    console.log("\nLatest Episodes:");
    for (const item of latest.data.slice(0, 3)) {
      console.log(`  - ${item.title}`);
      console.log(`    Episode: ${item.data.episode}`);
      console.log(`    Image: ${item.img}`);
    }
  }
  
  // Ongoing anime
  const ongoing = await samehadakuHelper.fetchAPKOngoing();
  if (ongoing.success && Array.isArray(ongoing.data)) {
    console.log("\nOngoing Anime:");
    for (const item of ongoing.data.slice(0, 3)) {
      console.log(`  - ${item.title} (${item.type}) - Score: ${item.score}`);
    }
  }
  
  // Popular anime
  const popular = await samehadakuHelper.fetchAPKPopular();
  if (popular.success && Array.isArray(popular.data)) {
    console.log("\nPopular Anime:");
    for (const item of popular.data.slice(0, 3)) {
      console.log(`  - ${item.title} (${item.type}) - Score: ${item.score}`);
    }
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
  try {
    // Uncomment the examples you want to run
    
    // await example1_GetLatestEpisodes();
    // await example2_GetCompleteSeries();
    // await example3_SearchAnime();
    // await example4_FetchAllSeries();
    // await example5_CollectAllEpisodes();
    // await example6_RawAPIUsage();
    // await example7_FilterByDateRange();
    // await example8_GetBestVideoSource();
    // await example9_WorkingWithImages();
    // await example10_APKEndpoints();
    
    console.log("\n✅ All examples completed!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Run examples
runAllExamples();

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export {
  example1_GetLatestEpisodes,
  example2_GetCompleteSeries,
  example3_SearchAnime,
  example4_FetchAllSeries,
  example5_CollectAllEpisodes,
  example6_RawAPIUsage,
  example7_FilterByDateRange,
  example8_GetBestVideoSource,
  example9_WorkingWithImages,
  example10_APKEndpoints,
  runAllExamples,
};
