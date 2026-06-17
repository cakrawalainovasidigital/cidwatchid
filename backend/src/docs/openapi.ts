import type { EndpointSpec, ParamSpec } from "./metadata"
import { CATEGORY_SECTIONS, ENDPOINTS, GROUPS } from "./metadata"

type HttpMethod = "get" | "post" | "delete" | "put"
const DEFAULT_SECURITY = [{ ApiToken: [], ApiUsername: [], ApiPassword: [] }]

const groupTitles = new Map(GROUPS.map((group) => [group.key, group.title]))
const groupDescriptions = new Map(GROUPS.map((group) => [group.key, group.description]))
const groupBasePaths = new Map(GROUPS.map((group) => [group.key, group.basePath]))

const orderedGroups = CATEGORY_SECTIONS.flatMap((category) => category.groupKeys)
  .map((key) => GROUPS.find((group) => group.key === key))
  .filter((group): group is (typeof GROUPS)[number] => Boolean(group))

const tagsInOrder = orderedGroups.length
  ? orderedGroups
  : GROUPS

const tagGroups = CATEGORY_SECTIONS.map((category) => ({
  name: category.title,
  tags: category.groupKeys
    .map((key) => groupTitles.get(key))
    .filter((name): name is string => Boolean(name)),
})).concat([{ name: "System", tags: ["System"] }])

const parseBodyExample = (raw: string) => {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const buildParameter = (item: ParamSpec, location: "path" | "query") => ({
  in: location,
  name: item.name,
  required: location === "path" ? true : Boolean(item.required),
  description: item.hint,
  schema: { type: "string" },
  example: item.value ?? item.example,
})

const buildRequestBody = (endpoint: EndpointSpec) => {
  if (!endpoint.body) return undefined
  const example = parseBodyExample(endpoint.body.example)
  const schema = typeof example === "object" && example !== null ? inferSchema(example) : { type: "object" }
  return {
    required: Boolean(endpoint.body.required),
    content: {
      "application/json": {
        schema,
        example,
        examples: {
          default: {
            summary: "Sample body",
            value: example,
          },
        },
      },
    },
  }
}

const inferSchema = (value: unknown): any => {
  if (value === null) return { type: "null" }
  if (Array.isArray(value)) {
    const first = value[0]
    return { type: "array", items: first !== undefined ? inferSchema(first) : {} }
  }
  if (typeof value === "object") {
    const props: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      props[key] = inferSchema(val)
    })
    return { type: "object", properties: props }
  }
  if (typeof value === "number") return { type: "number" }
  if (typeof value === "boolean") return { type: "boolean" }
  if (typeof value === "string") return { type: "string" }
  return {}
}

const buildCatalogSuccessExample = (endpoint: EndpointSpec) => {
  const basePath = endpoint.path.startsWith("/api") ? endpoint.path.slice(4) : endpoint.path
  const timestamp = new Date().toISOString()

  // Categories
  if (endpoint.group === "catalog-categories") {
    const categoryExample = {
      id: "clxxx123abc",
      key: "k-drama",
      name: "K-Drama",
      isActive: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    if (endpoint.id === "catalog-category-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          categoryExample,
          {
            id: "clxxx456def",
            key: "anime",
            name: "Anime",
            isActive: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }
    }

    if (endpoint.id === "catalog-category-create") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: categoryExample,
      }
    }

    if (endpoint.id === "catalog-category-update") {
      return {
        message: "Category updated successfully",
        updatedData: categoryExample,
      }
    }

    if (endpoint.id === "catalog-category-delete") {
      return {
        message: "Category deleted successfully",
        deletedData: categoryExample,
      }
    }
  }

  // Content Items
  if (endpoint.group === "catalog-content-items") {
    const contentItemExample = {
      id: "clxxx789ghi",
      categoryId: "clxxx123abc",
      providerKey: "dramabox",
      sourceId: "12345",
      isActive: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      category: {
        id: "clxxx123abc",
        key: "k-drama",
        name: "K-Drama",
        isActive: 1,
      },
      units: [
        {
          id: "clxxx001unt",
          contentItemId: "clxxx789ghi",
          unitType: "episode",
          seasonNumber: 1,
          unitNumber: 1,
          title: "Pilot Episode",
          durationSeconds: 3600,
          streamUrl: "https://cdn.example.com/s1e1.m3u8",
          publishedAt: timestamp,
        },
        {
          id: "clxxx002unt",
          contentItemId: "clxxx789ghi",
          unitType: "episode",
          seasonNumber: 1,
          unitNumber: 2,
          title: "Episode 2",
          durationSeconds: 3720,
          streamUrl: "https://cdn.example.com/s1e2.m3u8",
          publishedAt: timestamp,
        },
      ],
    }

    if (endpoint.id === "catalog-content-item-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          contentItemExample,
          {
            id: "clxxx790ghi",
            categoryId: "clxxx456def",
            providerKey: "melolo",
            sourceId: "67890",
            isActive: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            category: {
              id: "clxxx456def",
              key: "anime",
              name: "Anime",
              isActive: 1,
            },
            units: [],
          },
        ],
      }
    }

    if (endpoint.id === "catalog-content-item-get") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: contentItemExample,
      }
    }

    if (endpoint.id === "catalog-content-item-create") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx789ghi",
          categoryId: "clxxx123abc",
          providerKey: "dramabox",
          sourceId: "12345",
          isActive: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-content-item-update") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx789ghi",
          categoryId: "clxxx123abc",
          providerKey: "dramabox",
          sourceId: "12345",
          isActive: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-content-item-delete") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        deletedId: "clxxx789ghi",
      }
    }
  }

  // Content Units
  if (endpoint.group === "catalog-content-units") {
    const contentUnitExample = {
      id: "clxxx001unt",
      contentItemId: "clxxx789ghi",
      unitType: "episode",
      seasonNumber: 1,
      unitNumber: 1,
      title: "Pilot Episode",
      durationSeconds: 3600,
      streamUrl: "https://cdn.example.com/s1e1.m3u8",
      publishedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      contentItem: {
        id: "clxxx789ghi",
        categoryId: "clxxx123abc",
        providerKey: "dramabox",
        sourceId: "12345",
        isActive: 1,
        category: {
          id: "clxxx123abc",
          key: "k-drama",
          name: "K-Drama",
        },
      },
    }

    if (endpoint.id === "catalog-content-unit-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          contentUnitExample,
          {
            id: "clxxx002unt",
            contentItemId: "clxxx789ghi",
            unitType: "episode",
            seasonNumber: 1,
            unitNumber: 2,
            title: "Episode 2",
            durationSeconds: 3720,
            streamUrl: "https://cdn.example.com/s1e2.m3u8",
            publishedAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
            contentItem: contentUnitExample.contentItem,
          },
        ],
      }
    }

    if (endpoint.id === "catalog-content-unit-create") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx001unt",
          contentItemId: "clxxx789ghi",
          unitType: "episode",
          seasonNumber: 1,
          unitNumber: 1,
          title: "Pilot Episode",
          durationSeconds: 3600,
          streamUrl: "https://cdn.example.com/s1e1.m3u8",
          publishedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-content-unit-update") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx001unt",
          contentItemId: "clxxx789ghi",
          unitType: "episode",
          seasonNumber: 1,
          unitNumber: 2,
          title: "Episode 2 - Updated",
          durationSeconds: 3720,
          streamUrl: "https://cdn.example.com/s1e2-updated.m3u8",
          publishedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-content-unit-delete") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        deletedId: "clxxx001unt",
      }
    }
  }

  // Comments
  if (endpoint.group === "catalog-comments") {
    const userExample = {
      id: "clxxx111usr",
      username: "john_doe",
      email: "john@example.com",
    }

    const commentExample = {
      id: "clxxx222cmt",
      userId: "clxxx111usr",
      contentItemId: "clxxx789ghi",
      parentCommentId: null,
      body: "Great episode! Loved the plot twist.",
      isDeleted: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      user: userExample,
      children: [
        {
          id: "clxxx223cmt",
          userId: "clxxx112usr",
          contentItemId: "clxxx789ghi",
          parentCommentId: "clxxx222cmt",
          body: "I agree! Can't wait for the next one.",
          isDeleted: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          user: {
            id: "clxxx112usr",
            username: "jane_smith",
            email: "jane@example.com",
          },
          children: [],
        },
      ],
    }

    if (endpoint.id === "catalog-comment-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          {
            ...commentExample,
            contentItem: {
              id: "clxxx789ghi",
              categoryId: "clxxx123abc",
              providerKey: "dramabox",
              sourceId: "12345",
            },
          },
          {
            id: "clxxx224cmt",
            userId: "clxxx113usr",
            contentItemId: "clxxx789ghi",
            parentCommentId: null,
            body: "The acting was superb!",
            isDeleted: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
            user: {
              id: "clxxx113usr",
              username: "bob_wilson",
              email: "bob@example.com",
            },
            children: [],
            contentItem: {
              id: "clxxx789ghi",
              categoryId: "clxxx123abc",
              providerKey: "dramabox",
              sourceId: "12345",
            },
          },
        ],
      }
    }

    if (endpoint.id === "catalog-comment-create" || endpoint.id === "catalog-comment-create-reply") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        ...(endpoint.id === "catalog-comment-create-reply" && { parentCommentId: "clxxx222cmt" }),
        data: {
          id: "clxxx222cmt",
          userId: "clxxx111usr",
          contentItemId: "clxxx789ghi",
          parentCommentId: endpoint.id === "catalog-comment-create-reply" ? "clxxx222cmt" : null,
          body: "Great episode! Loved the plot twist.",
          isDeleted: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-comment-update") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx222cmt",
          userId: "clxxx111usr",
          contentItemId: "clxxx789ghi",
          parentCommentId: null,
          body: "Updated comment text - even better after rewatching!",
          isDeleted: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-comment-delete") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        deletedId: "clxxx222cmt",
        data: {
          id: "clxxx222cmt",
          isDeleted: 1,
        },
      }
    }

    if (endpoint.id === "catalog-comment-get-replies") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        parentCommentId: "clxxx222cmt",
        count: 2,
        data: [
          {
            id: "clxxx223cmt",
            userId: "clxxx112usr",
            contentItemId: "clxxx789ghi",
            parentCommentId: "clxxx222cmt",
            body: "I agree! Can't wait for the next one.",
            isDeleted: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
            user: {
              id: "clxxx112usr",
              username: "jane_smith",
              email: "jane@example.com",
            },
            children: [],
          },
          {
            id: "clxxx225cmt",
            userId: "clxxx114usr",
            contentItemId: "clxxx789ghi",
            parentCommentId: "clxxx222cmt",
            body: "Totally! The ending was unexpected.",
            isDeleted: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
            user: {
              id: "clxxx114usr",
              username: "alice_jones",
              email: "alice@example.com",
            },
            children: [],
          },
        ],
      }
    }
  }

  // Favorites
  if (endpoint.group === "catalog-favorites") {
    const favoriteExample = {
      id: "clxxx333fav",
      userId: "clxxx111usr",
      contentItemId: "clxxx789ghi",
      createdAt: timestamp,
      user: {
        id: "clxxx111usr",
        username: "john_doe",
        email: "john@example.com",
      },
      contentItem: {
        id: "clxxx789ghi",
        categoryId: "clxxx123abc",
        providerKey: "dramabox",
        sourceId: "12345",
        isActive: 1,
        category: {
          id: "clxxx123abc",
          key: "k-drama",
          name: "K-Drama",
        },
      },
    }

    if (endpoint.id === "catalog-favorite-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          favoriteExample,
          {
            id: "clxxx334fav",
            userId: "clxxx111usr",
            contentItemId: "clxxx790ghi",
            createdAt: timestamp,
            user: favoriteExample.user,
            contentItem: {
              id: "clxxx790ghi",
              categoryId: "clxxx456def",
              providerKey: "melolo",
              sourceId: "67890",
              isActive: 1,
              category: {
                id: "clxxx456def",
                key: "anime",
                name: "Anime",
              },
            },
          },
        ],
      }
    }

    if (endpoint.id === "catalog-favorite-create") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx333fav",
          userId: "clxxx111usr",
          contentItemId: "clxxx789ghi",
          createdAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-favorite-update") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx333fav",
          userId: "clxxx111usr",
          contentItemId: "clxxx790ghi",
          createdAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-favorite-delete") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        deletedId: "clxxx333fav",
      }
    }
  }

  // Whitelist
  if (endpoint.group === "catalog-whitelist") {
    const whitelistExample = {
      id: "clxxx444wht",
      userId: "clxxx111usr",
      categoryId: "clxxx123abc",
      createdAt: timestamp,
      user: {
        id: "clxxx111usr",
        username: "john_doe",
        email: "john@example.com",
      },
      category: {
        id: "clxxx123abc",
        key: "k-drama",
        name: "K-Drama",
        isActive: 1,
      },
    }

    if (endpoint.id === "catalog-whitelist-list") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        count: 2,
        data: [
          whitelistExample,
          {
            id: "clxxx445wht",
            userId: "clxxx111usr",
            categoryId: "clxxx456def",
            createdAt: timestamp,
            user: whitelistExample.user,
            category: {
              id: "clxxx456def",
              key: "anime",
              name: "Anime",
              isActive: 1,
            },
          },
        ],
      }
    }

    if (endpoint.id === "catalog-whitelist-create") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx444wht",
          userId: "clxxx111usr",
          categoryId: "clxxx123abc",
          createdAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-whitelist-update") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        data: {
          id: "clxxx444wht",
          userId: "clxxx111usr",
          categoryId: "clxxx456def",
          createdAt: timestamp,
        },
      }
    }

    if (endpoint.id === "catalog-whitelist-delete") {
      return {
        success: true,
        source: "catalog",
        path: basePath,
        deletedId: "clxxx444wht",
      }
    }
  }

  // Fallback for non-catalog endpoints
  return {
    success: true,
    source: endpoint.group,
    path: basePath,
    data: { message: "Response data" },
  }
}

const buildSuccessExample = (endpoint: EndpointSpec) => {
  // Use dedicated catalog builder for catalog endpoints
  if (endpoint.group.startsWith("catalog-")) {
    return buildCatalogSuccessExample(endpoint)
  }

  // Original logic for other endpoints
  const basePath = endpoint.path.startsWith("/api") ? endpoint.path.slice(4) : endpoint.path

  if (endpoint.group === "animein") {
    if (endpoint.id === "animein-stream") {
      return {
        success: true,
        source: "animein",
        path: basePath,
        data: {
          id: "episode-123",
          coverImage: null,
          streamUrl: "https://cdn.example/playlist.m3u8",
          servers: [
            { name: "Server 1", quality: "1080p", streamUrl: "https://cdn.example/1080p.m3u8" },
            { name: "Server 2", quality: "720p", streamUrl: "https://cdn.example/720p.m3u8" },
          ],
        },
      }
    }

    if (endpoint.id === "animein-detail") {
      return {
        success: true,
        source: "animein",
        path: basePath,
        chapterCount: 3,
        data: {
          id: "movie-123",
          title: "Sample Animein Title",
          description: "Synopsis text...",
          coverImage: "https://cdn.example/poster.jpg",
          playCount: 12345,
          chapterCount: 3,
          chapters: [
            { chapterId: "ep-1", chapterIndex: 1 },
            { chapterId: "ep-2", chapterIndex: 2 },
            { chapterId: "ep-3", chapterIndex: 3 },
          ],
        },
      }
    }

    return {
      success: true,
      source: "animein",
      path: basePath,
      count: 2,
      data: [
        {
          id: "an-1",
          title: "Sample Animein",
          description: "Synopsis text...",
          coverImage: "https://cdn.example/poster.jpg",
        },
        {
          id: "an-2",
          title: "Another Animein",
          description: "Synopsis text...",
          coverImage: "https://cdn.example/poster2.jpg",
        },
      ],
    }
  }

  if (endpoint.group === "rebahin") {
    const listExample = {
      success: true,
      source: "rebahin",
      path: basePath,
      count: 2,
      data: [
        {
          id: 101,
          title: "Sample Rebahin Movie",
          coverImage: "https://cdn.example/rebahin/poster.jpg",
          duration: null,
          type: "movie",
        },
        {
          id: 102,
          title: "Another Rebahin Movie",
          coverImage: "https://cdn.example/rebahin/poster2.jpg",
          duration: null,
          type: "movie",
        },
      ],
    }

    if (endpoint.id === "rebahin-genre") {
      return {
        success: true,
        source: "rebahin",
        path: basePath,
        data: [
          { genreId: 1, genre: "Action", lang: null },
          { genreId: 2, genre: "Romance", lang: null },
        ],
      }
    }

    if (endpoint.id === "rebahin-country") {
      return {
        success: true,
        source: "rebahin",
        path: basePath,
        data: [
          { countryId: 99, country: "Indonesia", lang: null },
          { countryId: 100, country: "Korea", lang: null },
        ],
      }
    }

    if (endpoint.id === "rebahin-detail") {
      return {
        success: true,
        source: "rebahin",
        path: basePath,
        data: {
          id: 101,
          title: "Sample Rebahin Movie",
          description: "Plot summary without HTML tags.",
          image: "https://cdn.example/rebahin/thumb.jpg",
          coverImage: "https://cdn.example/rebahin/cover-medium.jpg",
          type: "movie",
          country: "Indonesia",
          casts: [{ name: "Lead Actor" }],
          episodes: [
            { chapterId: 101, chapterIndex: 1 },
            { chapterId: 101, chapterIndex: 2 },
          ],
          genre: "Action",
          duration: "120m",
        },
      }
    }

    if (endpoint.id === "rebahin-stream") {
      return {
        success: true,
        source: "rebahin",
        path: basePath,
        data: [
          {
            src: "https://cdn.example/rebahin/embed1",
            iframe: '<iframe src="https://cdn.example/rebahin/embed1" />',
            source: "page",
          },
          {
            src: "https://cdn.example/rebahin/embed2",
            iframe: '<iframe src="https://cdn.example/rebahin/embed2" />',
            source: "content",
          },
        ],
      }
    }

    return listExample
  }

  if (endpoint.id === "home-aggregate") {
    return {
      success: true,
      source: "Homepage",
      path: basePath,
      data: {
        drama: {
          source: "dramabox",
          path: "/dramabox/recommendations",
          data: [{ id: "db-1", title: "Drama Title", coverImage: "https://cdn.example/drama.jpg" }],
        },
        anime: {
          source: "animein",
          path: "/anime/animein/recommendations",
          data: [{ id: "an-1", title: "Anime Title", coverImage: "https://cdn.example/anime.jpg" }],
        },
        movies: {
          source: "rebahin",
          path: "/movies/rebahin/recommendations",
          data: [{ id: "rb-101", title: "Movie Title", coverImage: "https://cdn.example/movie.jpg" }],
        },
        manga: {
          source: "komikku",
          path: "/manga/komikku/recommendations",
          data: [{ id: "mg-1", title: "Manga Title", coverImage: "https://cdn.example/manga.jpg" }],
        },
      },
    }
  }

  if (endpoint.group === "auth") {
    if (endpoint.id === "auth-login") {
      return {
        message: "Login successful",
        data: { user: { id: "user-id", username: "demo", email: "demo@example.com" } },
      }
    }
    if (endpoint.id === "auth-get-token") {
      return {
        token: "abcdef1234567890",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    }
    if (endpoint.id === "auth-logout") {
      return {
        message: "Logged out"
      }
    }
    return {
      message: "Registration successful",
      data: { user: { id: "user-id", username: "demo", email: "demo@example.com" } },
    }
  }

  if (endpoint.group === "user") {
    const timestamp = new Date().toISOString()

    if (endpoint.id === "user-get") {
      return {
        success: true,
        source: "user",
        path: basePath,
        count: 2,
        data: [
          {
            id: "clxxx123usr",
            username: "john_doe",
            email: "john@example.com",
            displayName: "John Doe",
            avatarUrl: "https://example.com/avatar.jpg",
            isActive: 1,
            isFree: true,
            subscriptionType: null,
            subscriptionStart: null,
            subscriptionEnd: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: "clxxx456usr",
            username: "premium_user",
            email: "premium@example.com",
            displayName: "Premium User",
            avatarUrl: "https://example.com/avatar2.jpg",
            isActive: 1,
            isFree: false,
            subscriptionType: "premium",
            subscriptionStart: "2025-01-01T00:00:00.000Z",
            subscriptionEnd: "2025-12-31T23:59:59.000Z",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }
    }
    if (endpoint.id === "user-me") {
      return {
        message: "Success",
        data: {
          id: "clxxx123usr",
          username: "john_doe",
          email: "john@example.com",
          displayName: "John Doe",
          avatarUrl: "https://themindfulaimanifesto.org/wp-content/uploads/2020/09/male-placeholder-image.jpeg",
          isActive: 1,
          isFree: true,
          subscriptionType: null,
          subscriptionStart: null,
          subscriptionEnd: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }
    if (endpoint.id === "user-update") {
      return {
        message: "User updated!",
        data: {
          id: "clxxx123usr",
          username: "new_username",
          email: "new@example.com",
          displayName: "New Display Name",
          avatarUrl: "https://example.com/new-avatar.jpg",
          isActive: 1,
          isFree: false,
          subscriptionType: "premium",
          subscriptionStart: "2025-02-25T00:00:00.000Z",
          subscriptionEnd: "2025-03-25T00:00:00.000Z",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }
    }
    if (endpoint.id === "user-update-password") {
      return {
        message: "Password changed!",
      }
    }
    if (endpoint.id === "user-subscription-status") {
      return {
        message: "Success",
        data: {
          isFree: false,
          isSubscribed: true,
          subscriptionType: "premium",
          subscriptionStart: "2025-02-01T00:00:00.000Z",
          subscriptionEnd: "2025-03-01T00:00:00.000Z",
          daysRemaining: 5,
        },
      }
    }
    if (endpoint.id === "user-subscription-update") {
      return {
        message: "Subscription updated!",
        data: {
          id: "clxxx123usr",
          isFree: false,
          subscriptionType: "premium",
          subscriptionStart: "2025-02-25T00:00:00.000Z",
          subscriptionEnd: "2025-03-25T00:00:00.000Z",
        },
      }
    }
    return {
      success: true,
      source: "user",
      path: basePath,
      count: 1,
      data: { id: "user-id", username: "demo", email: "demo@example.com" },
    }
  }

  // User Feedback endpoints
  if (endpoint.group === "user-feedback") {
    const timestamp = new Date().toISOString()
    const userExample = {
      id: "clxxx123usr",
      username: "john_doe",
      displayName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    }

    const feedbackExample = {
      id: "clxxx999fdb",
      userId: "clxxx123usr",
      title: "Bug Report: Video Not Playing",
      content: "When I try to play episode 5 of Drama X, the video keeps buffering...",
      category: "bug",
      rating: 4,
      status: "pending",
      adminReply: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
      user: userExample,
    }

    if (endpoint.id === "feedback-create") {
      return {
        message: "Feedback submitted successfully",
        data: feedbackExample,
      }
    }

    if (endpoint.id === "feedback-list") {
      return {
        message: "Success",
        data: [
          feedbackExample,
          {
            id: "clxxx998fdb",
            userId: "clxxx456usr",
            title: "Feature Request: Dark Mode",
            content: "It would be great to have a dark mode option for the app...",
            category: "feature",
            rating: 5,
            status: "in_progress",
            adminReply: "Thanks! We're working on it.",
            createdAt: timestamp,
            updatedAt: timestamp,
            resolvedAt: null,
            user: {
              id: "clxxx456usr",
              username: "jane_doe",
              displayName: "Jane Doe",
              avatarUrl: "https://example.com/avatar2.jpg",
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasMore: false,
        },
      }
    }

    if (endpoint.id === "feedback-my") {
      return {
        message: "Success",
        data: [
          feedbackExample,
          {
            id: "clxxx997fdb",
            userId: "clxxx123usr",
            title: "General Feedback",
            content: "Great app! Love the content selection.",
            category: "general",
            rating: 5,
            status: "resolved",
            adminReply: "Thank you for your feedback!",
            createdAt: timestamp,
            updatedAt: timestamp,
            resolvedAt: timestamp,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasMore: false,
        },
      }
    }

    if (endpoint.id === "feedback-get") {
      return {
        message: "Success",
        data: {
          ...feedbackExample,
          adminReply: "Thanks for reporting! We'll look into this.",
        },
      }
    }

    if (endpoint.id === "feedback-update") {
      return {
        message: "Feedback updated successfully",
        data: {
          ...feedbackExample,
          title: "Updated: Bug Report Details",
          content: "Updated content with more details and screenshots...",
          rating: 5,
        },
      }
    }

    if (endpoint.id === "feedback-delete") {
      return {
        message: "Feedback deleted successfully",
      }
    }

    if (endpoint.id === "feedback-admin-update") {
      return {
        message: "Feedback updated successfully",
        data: {
          ...feedbackExample,
          status: "resolved",
          adminReply: "Thank you for your feedback! The issue has been fixed.",
          resolvedAt: timestamp,
        },
      }
    }

    if (endpoint.id === "feedback-stats") {
      return {
        message: "Success",
        data: {
          total: 150,
          byStatus: {
            pending: 20,
            inProgress: 15,
            resolved: 100,
            rejected: 15,
          },
          byCategory: [
            { category: "general", count: 50 },
            { category: "bug", count: 60 },
            { category: "feature", count: 30 },
            { category: "improvement", count: 10 },
          ],
          resolutionRate: 67,
        },
      }
    }
  }

  if (endpoint.id === "dramabox-all-chapters") {
    return {
      success: true,
      source: "dramabox",
      path: basePath,
      count: 2,
      data: [
        {
          chapterId: "ch-1",
          chapterIndex: 1,
          chapterName: "Episode 1",
          streamUrl: "https://cdn.example/episode1.m3u8",
        },
        {
          chapterId: "ch-2",
          chapterIndex: 2,
          chapterName: "Episode 2",
          streamUrl: "https://cdn.example/episode2.m3u8",
        },
      ],
    }
  }

  // Google OAuth endpoints
  if (endpoint.group === "google-oauth") {
    const timestamp = new Date().toISOString()

    if (endpoint.id === "google-oauth-login") {
      return {
        message: "Google OAuth initiated (Backend Callback Mode)",
        data: {
          authUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=20586705890-xxx.apps.googleusercontent.com&redirect_uri=http://localhost:8787/api/auth/google/callback&response_type=code&scope=openid%20email%20profile&state=eyJ0...&access_type=offline&prompt=consent",
          mode: "backend",
          redirectAfterLogin: "http://localhost:3000/dashboard",
        },
      }
    }

    if (endpoint.id === "google-oauth-callback") {
      return {
        message: "Google login successful",
        data: {
          user: {
            id: "clxxx123usr",
            username: "john_doe",
            email: "john.doe@gmail.com",
            displayName: "John Doe",
            avatarUrl: "https://lh3.googleusercontent.com/a/xxx",
          },
          redirectTo: "http://localhost:3000/dashboard",
        },
      }
    }

    if (endpoint.id === "google-oauth-frontend") {
      return {
        message: "Google OAuth initiated (Frontend Callback Mode)",
        data: {
          authUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=20586705890-xxx.apps.googleusercontent.com&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid%20email%20profile&state=eyJ0...&access_type=offline&prompt=consent",
          mode: "frontend",
          callbackUrl: "http://localhost:3000/auth/callback",
        },
      }
    }

    if (endpoint.id === "google-oauth-exchange") {
      return {
        message: "Google login successful",
        data: {
          user: {
            id: "clxxx123usr",
            username: "john_doe",
            email: "john.doe@gmail.com",
            displayName: "John Doe",
            avatarUrl: "https://lh3.googleusercontent.com/a/xxx",
          },
        },
      }
    }

    if (endpoint.id === "google-oauth-me") {
      return {
        message: "User info retrieved",
        data: {
          user: {
            id: "clxxx123usr",
            username: "john_doe",
            email: "john.doe@gmail.com",
            displayName: "John Doe",
            avatarUrl: "https://lh3.googleusercontent.com/a/xxx",
            isActive: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
      }
    }

    if (endpoint.id === "google-oauth-logout") {
      return {
        message: "Logged out successfully",
      }
    }
  }

  // Samehadaku endpoints
  if (endpoint.group === "samehadaku") {
    const listExample = {
      success: true,
      source: "samehadaku",
      path: basePath,
      count: 2,
      data: [
        {
          id: "3086",
          title: "One Piece",
          coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/one-piece.jpg",
          chapterCount: 1095,
        },
        {
          id: "3090",
          title: "Jujutsu Kaisen",
          coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/jujutsu-kaisen.jpg",
          chapterCount: 24,
        },
      ],
    }

    if (endpoint.id === "samehadaku-recommendations" || endpoint.id === "samehadaku-new-release" || endpoint.id === "samehadaku-ongoing") {
      return listExample
    }

    if (endpoint.id === "samehadaku-search") {
      return {
        ...listExample,
        query: "naruto",
        data: [
          {
            id: "1520",
            title: "Naruto Shippuden",
            coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2023/01/naruto-shippuden.jpg",
          },
          {
            id: "1521",
            title: "Boruto: Naruto Next Generations",
            coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2023/01/boruto.jpg",
          },
        ],
      }
    }

    if (endpoint.id === "samehadaku-genre") {
      return {
        success: true,
        source: "samehadaku",
        path: basePath,
        count: 20,
        data: [
          { genreId: "action", genre: "Action", slug: "action", count: 150 },
          { genreId: "adventure", genre: "Adventure", slug: "adventure", count: 120 },
          { genreId: "comedy", genre: "Comedy", slug: "comedy", count: 200 },
          { genreId: "drama", genre: "Drama", slug: "drama", count: 180 },
          { genreId: "fantasy", genre: "Fantasy", slug: "fantasy", count: 140 },
        ],
      }
    }

    if (endpoint.id === "samehadaku-genre-detail") {
      return {
        success: true,
        source: "samehadaku",
        path: basePath,
        count: 2,
        data: [
          {
            id: "3086",
            title: "One Piece",
            coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/one-piece.jpg",
          },
          {
            id: "3150",
            title: "Demon Slayer",
            coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/demon-slayer.jpg",
          },
        ],
      }
    }

    if (endpoint.id === "samehadaku-detail") {
      return {
        success: true,
        source: "samehadaku",
        path: basePath,
        resolvedBy: "category",
        episodeCount: 24,
        data: {
          id: "3086",
          title: "Jujutsu Kaisen",
          description: "Yuji Itadori adalah seorang siswa SMA yang memiliki kemampuan fisik luar biasa...",
          coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/jujutsu-kaisen.jpg",
          chapterCount: 24,
          chapters: [
            { episodeId: "48504", chapterIndex: 1 },
            { episodeId: "48505", chapterIndex: 2 },
            { episodeId: "48506", chapterIndex: 3 },
          ],
        },
      }
    }

    if (endpoint.id === "samehadaku-stream") {
      return {
        success: true,
        source: "samehadaku",
        path: basePath,
        data: {
          id: "48504",
          title: "Jujutsu Kaisen Episode 1",
          coverImage: "https://i2.wp.com/v1.samehadaku.how/wp-content/uploads/2024/01/jujutsu-kaisen-ep1.jpg",
          streamUrl: "https://pixeldrain.com/api/file/xyz123",
          servers: [
            { name: "PixelDrain", quality: "1080p", streamUrl: "https://pixeldrain.com/api/file/xyz1080" },
            { name: "PixelDrain", quality: "720p", streamUrl: "https://pixeldrain.com/api/file/xyz720" },
            { name: "Blogger", quality: "480p", streamUrl: "https://www.googleapis.com/blogger/..." },
          ],
        },
      }
    }
  }

  // Drama V2 endpoints
  if (endpoint.group === "drama-v2") {
    if (endpoint.id === "drama-v2-recommendations" || endpoint.id === "drama-v2-new-release") {
      return {
        success: true,
        source: "dramabox/melolo",
        path: basePath,
        count: 15,
        data: [
          {
            id: "42000000651",
            title: "Suami untuk Tiga Tahun (Sulih Suara)",
            description: "Ezra yang sudah hidup ribuan tahun menepati janji pada istrinya...",
            coverImage: "https://hwztchapter.dramaboxdb.com/data/cppartner/4x2/...",
            playCount: "102M",
            chapterCount: 65,
            type: 1,
          },
          {
            id: "7599702002796334133",
            title: "Sekali Lihat, Jadi Sultan",
            description: "Sebuah kemampuan misterius mengubah hidup Riky Hidayat...",
            coverImage: "https://api.tmtreader.com/...",
            playCount: "45M",
            chapterCount: 80,
            type: 2,
          },
        ],
      }
    }

    if (endpoint.id === "drama-v2-search") {
      return {
        success: true,
        source: "dramabox/melolo",
        path: basePath,
        query: "love",
        count: 30,
        data: [
          {
            id: "12345",
            title: "Love Story",
            description: "A love story drama...",
            coverImage: "https://cdn.example/cover.jpg",
            playCount: 500000,
            chapterCount: null,
            type: 1,
          },
        ],
      }
    }

    if (endpoint.id === "drama-v2-vip") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        type: 1,
        count: 5,
        data: [
          {
            tabTitle: "Hot Dramas",
            items: [
              {
                id: "42000000651",
                title: "VIP Drama Title",
                description: "VIP content description...",
                coverImage: "https://cdn.example/cover.jpg",
                playCount: "2000000",
                chapterCount: 100,
              },
            ],
          },
        ],
      }
    }

    if (endpoint.id === "drama-v2-genre") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        count: 20,
        data: [
          { genreId: 1, genreName: "Romance", lang: "in" },
          { genreId: 2, genreName: "Action", lang: "in" },
        ],
      }
    }

    if (endpoint.id === "drama-v2-genre-detail") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        type: 1,
        count: 15,
        data: [
          {
            id: "12345",
            title: "Romance Drama",
            description: "A romance story...",
            coverImage: "https://cdn.example/cover.jpg",
            playCount: "1000000",
            chapterCount: 50,
          },
        ],
      }
    }

    if (endpoint.id === "drama-v2-detail") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        type: 1,
        chapterCount: 50,
        data: {
          id: "12345",
          title: "Drama Title",
          description: "Full description...",
          coverImage: "https://cdn.example/cover.jpg",
          playCount: "1000000",
          chapterCount: 50,
          chapters: [
            { chapterId: "ch001", chapterIndex: 0 },
            { chapterId: "ch002", chapterIndex: 1 },
          ],
        },
      }
    }

    if (endpoint.id === "drama-v2-stream") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        type: 1,
        data: {
          id: "12345",
          coverImage: "https://cdn.example/chapter.jpg",
          chapterId: "ch001",
          streamUrl: "https://cdn.example.com/video.mp4",
          qualities: [
            { quality: 720, streamUrl: "https://cdn.example.com/video_720.mp4" },
            { quality: 480, streamUrl: "https://cdn.example.com/video_480.mp4" },
          ],
        },
      }
    }

    if (endpoint.id === "drama-v2-batch-download") {
      return {
        success: true,
        source: "dramabox",
        path: basePath,
        type: 1,
        count: 50,
        data: [
          {
            chapterId: "ch001",
            chapterIndex: 0,
            chapterName: "Episode 1",
            streamUrl: "https://cdn.example.com/ep1.mp4",
          },
          {
            chapterId: "ch002",
            chapterIndex: 1,
            chapterName: "Episode 2",
            streamUrl: "https://cdn.example.com/ep2.mp4",
          },
        ],
      }
    }
  }

  const providersExample = {
    success: true,
    source: endpoint.group,
    path: basePath,
    data: [{ name: "provider-name" }],
  }

  const genresExample = {
    success: true,
    source: endpoint.group,
    path: basePath,
    count: 2,
    data: [
      { genreId: "action", genre: "Action", lang: null },
      { genreId: "romance", genre: "Romance", lang: null },
    ],
  }

  const listExample = {
    success: true,
    source: endpoint.group,
    path: basePath,
    count: 1,
    data: [
      {
        id: "item-1",
        title: "Sample Title",
        description: "Example description",
        coverImage: "https://cdn.example/cover.jpg",
        duration: "120m",
        releaseDate: "2024",
        type: "movie",
        playCount: 123,
        chapterCount: 12,
      },
    ],
  }

  const detailExample = {
    success: true,
    source: endpoint.group,
    path: basePath,
    data: {
      id: "item-1",
      title: "Sample Title",
      description: "Example description",
      coverImage: "https://cdn.example/cover.jpg",
      playCount: 123,
      chapterCount: 12,
      chapters: [
        { chapterId: "chapter-1", chapterIndex: 1, title: "Episode 1" },
        { chapterId: "chapter-2", chapterIndex: 2, title: "Episode 2" },
      ],
    },
  }

  const streamExample = {
    success: true,
    source: endpoint.group,
    path: basePath,
    data: {
      id: "episode-1",
      sources: [
        { url: "https://cdn.example/video.m3u8", quality: "1080p" },
        { url: "https://cdn.example/video-720p.m3u8", quality: "720p" },
      ],
      subtitles: [{ url: "https://cdn.example/sub.vtt", lang: "en" }],
    },
  }

  if (endpoint.path.includes("/providers")) return providersExample
  if (endpoint.path.includes("/genre") && !endpoint.path.includes("/:")) return genresExample
  if (endpoint.path.includes("/stream")) return streamExample
  if (endpoint.path.includes("/detail")) return detailExample

  return listExample
}

const buildResponses = (endpoint: EndpointSpec) => ({
  200: {
    description: endpoint.description,
    content: {
      "application/json": {
        schema: inferSchema(buildSuccessExample(endpoint)),
        example: buildSuccessExample(endpoint),
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        example: { message: "Data not found!" },
      },
    },
  },
  500: {
    description: "Server error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: ["object", "string"] },
          },
        },
        example: { message: "Error from server!" },
      },
    },
  },
})

const toOpenApiPath = (path: string) => path.replace(/:([^/]+)/g, '{$1}')

const buildPaths = () => {
  const paths: Record<string, unknown> = {}

  ENDPOINTS.forEach((endpoint) => {
    const method = endpoint.method.toLowerCase() as HttpMethod
    const specPath = toOpenApiPath(endpoint.path)
    const currentPath = (paths[specPath] as Record<string, unknown>) ?? {}
    const parameters = [
      ...(endpoint.params?.map((item) => buildParameter(item, "path")) ?? []),
      ...(endpoint.query?.map((item) => buildParameter(item, "query")) ?? []),
    ]

    const description = endpoint.notes?.length
      ? `${endpoint.description}\n\n**Notes:**\n${endpoint.notes.map(n => `- ${n}`).join('\n')}`
      : endpoint.description

    currentPath[method] = {
      tags: [groupTitles.get(endpoint.group) ?? endpoint.group],
      summary: endpoint.title,
      description,
      parameters: parameters.length ? parameters : undefined,
      requestBody: buildRequestBody(endpoint),
      responses: buildResponses(endpoint),
      security: endpoint.public ? undefined : DEFAULT_SECURITY,
      'x-ui-hidden': endpoint.uiHidden,
    }

    paths[specPath] = currentPath
  })

  paths["/health"] = {
    get: {
      tags: ["System"],
      summary: "Health check",
      description: "Basic health probe.",
      responses: {
        200: {
          description: "Service is healthy",
          content: { "application/json": { example: { message: "OK!", version: "1.0.0", date: new Date().toISOString() } } },
        },
      },
    },
  }

  return paths
}

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "CID Watch API",
    version: "1.0.0",
    description:
      "CID Watch adalah layanan agregasi konten (drama, anime, film, manga) di Hono + Bun (Cloudflare Workers). " +
      "Sebagian besar endpoint memerlukan tiga header auth: x-api-token, x-api-username, x-api-password. " +
      "Gunakan spesifikasi ini untuk eksplorasi, try-it, serta integrasi client.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      ApiToken: { type: "apiKey", in: "header", name: "x-api-token" },
      ApiUsername: { type: "apiKey", in: "header", name: "x-api-username" },
      ApiPassword: { type: "apiKey", in: "header", name: "x-api-password" },
    },
  },
  tags: tagsInOrder
    .map((group) => ({
      name: group.title,
      description: `${group.description} (Base ${group.basePath})`,
    }))
    .concat([{ name: "System", description: "System endpoints" }]),
  "x-tagGroups": tagGroups,
  paths: buildPaths(),
}