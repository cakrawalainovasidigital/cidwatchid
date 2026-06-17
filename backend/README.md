# Bun Drama API

A lightning-fast web application crafted with Hono, running on Cloudflare Workers, and built using Bun for max performance.

## Getting Started

### Installation

Install the dependencies using Bun:

```bash
bun install
```

### Development

Start the local development server:

```bash
bun run dev
```

or

```bash
bun dev
```

### Type Generation

To synchronize types based on your Worker configuration (wrangler.toml), run:

```bash
bun run cf-typegen
```

### API Docs

Interactive OpenAPI docs are served via Scalar at `/docs` (backed by `/docs/openapi.json`). The previous DocsPage UI has been removed to keep the bundle light; use the Scalar UI instead for exploring and trying endpoints.

## API Summary

The application exposes several API endpoints categorized by their feature set. The base URL for all endpoints is `/api`.

### Routes & Controllers

#### Authentication (`/auth`)
Controller: `src/controllers/auth.controller.ts`

- **POST** `/login`
    - **Body**: `{ "username": "your_username", "password": "your_password" }`
    - **Example**: `curl -X POST -H "Content-Type: application/json" -d '{ "username": "user1", "password": "password123" }' https://api.example.com/api/auth/login`

- **POST** `/register`
    - **Body**: `{ "username": "your_username", "email": "email@example.com", "password": "your_password" }`
    - **Example**: `curl -X POST -H "Content-Type: application/json" -d '{ "username": "user1", "email": "user1@example.com", "password": "password123" }' https://api.example.com/api/auth/register`

#### Drama (`/drama`)
Controllers: `src/controllers/drama/dramaProviders.controller.ts`, `src/controllers/drama/dramabox.controller.ts`, `src/controllers/drama/melolo.controller.ts`

- **GET** `/providers`
    - Lists available drama providers.

##### Dramabox (`/drama/dramabox`)
Controller: `src/controllers/drama/dramabox.controller.ts`
*Includes caching middleware. Default `lang` is `in`.*

- **GET** `/recommendations`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/recommendations?lang=en`

- **GET** `/new-release`
    - **Query**: `lang` (optional), `pageSize` (optional, default: 20)
    - **Example**: `/api/drama/dramabox/new-release?lang=en&pageSize=20`

- **GET** `/rank`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/rank?lang=en`

- **GET** `/search`
    - **Query**: `query` (required), `lang` (optional)
    - **Example**: `/api/drama/dramabox/search?query=love&lang=en`

- **GET** `/search-suggest`
    - **Query**: `query` (required), `lang` (optional)
    - **Example**: `/api/drama/dramabox/search-suggest?query=boss`

- **GET** `/genre`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/genre?lang=en`

- **GET** `/genre/:id`
    - **Params**: `id` (Genre ID)
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/genre/1?lang=en`

- **GET** `/detail/:id`
    - **Params**: `id` (Book ID)
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/detail/12345?lang=en`

- **GET** `/stream/:id`
    - **Params**: `id` (Book ID)
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/stream/12345`

- **GET** `/stream/:id/:chapterIndex`
    - **Params**: `id` (Book ID), `chapterIndex`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/dramabox/stream/12345/1`

- **GET** `/languages`
    - **Example**: `/api/drama/dramabox/languages`

- **GET** `/vip`
    - **Example**: `/api/drama/dramabox/vip`

##### Melolo (`/drama/melolo`)
Controller: `src/controllers/drama/melolo.controller.ts`
*Includes caching middleware.*

- **GET** `/recommendations`
    - **Example**: `/api/drama/melolo/recommendations`

- **GET** `/new-release`
    - **Example**: `/api/drama/melolo/new-release`

- **GET** `/rank`
    - **Example**: `/api/drama/melolo/rank`

- **GET** `/search`
    - **Query**: `query` (required)
    - **Example**: `/api/drama/melolo/search?query=ceo`

- **GET** `/search-suggest`
    - **Query**: `query` (required)
    - **Example**: `/api/drama/melolo/search-suggest?query=ceo`

- **GET** `/detail/:id`
    - **Params**: `id` (Series ID)
    - **Example**: `/api/drama/melolo/detail/1001`

- **GET** `/stream/:id`
    - **Params**: `id` (Video ID)
    - **Example**: `/api/drama/melolo/stream/1001`

- **GET** `/stream/:id/:chapterIndex`
    - **Params**: `id` (Video ID), `chapterIndex`
    - **Example**: `/api/drama/melolo/stream/1001/1`

#### Movies (`/movies`)
Controllers: `src/controllers/movies/movieProviders.controller.ts`, `src/controllers/movies/flixhq.controller.ts`, `src/controllers/movies/rebahin.controller.ts`

- **GET** `/providers`
    - Lists available movie providers.

FlixHQ (`/movies/flixhq`)
- **GET** `/recommendations`
- **GET** `/new-release`
- **GET** `/genre`
- **GET** `/genre/:id`
    - **Query**: `page` (optional)
- **GET** `/country`
- **GET** `/country/:id`
    - **Query**: `page` (optional)
- **GET** `/detail`
    - **Query**: `id` (required)
- **GET** `/stream`
    - **Query**: `id` (required), `chapterId` (required)

Rebahin (`/movies/rebahin`)
- Route file: `src/routes/movies/rebahin.route.ts`
- Controller: `src/controllers/movies/rebahin.controller.ts`
- **GET** `/recommendations`
    - **Query**: `page` (optional), `limit` (optional, default: 30)
- **GET** `/new-release`
    - **Query**: `page` (optional), `limit` (optional, default: 30)
- **GET** `/genre`
- **GET** `/country`
- **GET** `/genre/:id`
    - **Params**: `id` (Genre ID)
    - **Query**: `page` (optional), `limit` (optional, default: 30)
- **GET** `/country/:id`
    - **Params**: `id` (Country ID)
    - **Query**: `page` (optional), `limit` (optional, default: 30)
- **GET** `/detail/:id`
    - **Params**: `id` (Movie ID)
- **GET** `/stream/:id`
    - **Params**: `id` (Movie ID)
- **GET** `/search`
    - **Query**: `query` (required), `page` (optional), `limit` (optional, default: 30)

#### Manga (`/manga`)
Controllers: `src/controllers/manga/mangaProvider.controller.ts`, `src/controllers/manga/mangahere.controller.ts`, `src/controllers/manga/komikku.controller.ts`

- **GET** `/providers`
    - Lists available manga providers.

MangaHere (`/manga/mangahere`)
- **GET** `/recommendations`
- **GET** `/rank`
- **GET** `/new-release`
    - **Query**: `page` (optional)
- **GET** `/detail/:id`
    - **Params**: `id` (Manga ID)
- **GET** `/search`
    - **Query**: `query` (required)
- **GET** `/chapters`
    - **Query**: `id` (required, Chapter ID)

Komikku (`/manga/komikku`)
- **GET** `/recommendations`
- **GET** `/rank`
- **GET** `/new-release`
- **GET** `/detail/:id`
    - **Params**: `id` (Manga ID)
- **GET** `/search`
    - **Query**: `query` (required), `page` (optional)
- **GET** `/chapters`
    - **Query**: `id` (required, Chapter ID)
- **GET** `/genre`
    - List available genres.

#### Animein (`/anime/animein`)
Controller: `src/controllers/anime/animein.controller.ts` (uses Animein helper)

- **GET** `/recommendations`
    - **Query**: `limit` (optional, default: 50)
    - **Example**: `/api/anime/animein/recommendations?limit=50`

- **GET** `/new-release`
    - **Query**: `limit` (optional, default: 50)
    - **Example**: `/api/anime/animein/new-release?limit=50`

- **GET** `/rank`
    - **Query**: `limit` (optional, default: 50)
    - **Example**: `/api/anime/animein/rank?limit=50`

- **GET** `/search`
    - **Query**: `query` (required), `page` (optional, default: 1)
    - **Example**: `/api/anime/animein/search?query=naruto&page=1`

- **GET** `/detail/:id`
    - **Params**: `id` (Anime ID)
    - **Example**: `/api/anime/animein/detail/123`

- **GET** `/stream/:episodeId`
    - **Params**: `episodeId` (Episode ID)
    - **Example**: `/api/anime/animein/stream/456`

- **GET** `/genre`
    - **Example**: `/api/anime/animein/genre`

- **GET** `/genre/:id`
    - **Params**: `id` (Genre ID)
    - **Query**: `page` (optional, default: 1)
    - **Example**: `/api/anime/animein/genre/12?page=1`

#### Anime v1 (`/anime/v1`)

Controller (providers): `src/controllers/anime/v1/animeProviders.controller.ts`

- **GET** `/providers`
    - **Example**: `/api/anime/v1/providers`

#### Anime v2 (`/anime/v2`)
Controller: `src/controllers/anime/v2/animev2.controller.ts`

- **GET** `/recommendations`
    - **Query**: `page` (optional)
    - **Example**: `/api/anime/v2/recommendations?page=1`

- **GET** `/new-release`
    - **Query**: `page` (optional)
    - **Example**: `/api/anime/v2/new-release?page=1`

- **GET** `/rank`
    - **Query**: `page` (optional)
    - **Example**: `/api/anime/v2/rank?page=1`

- **GET** `/search`
    - **Query**: `query` (required)
    - **Example**: `/api/anime/v2/search?query=naruto`

- **GET** `/genre`
    - **Example**: `/api/anime/v2/genre`

- **GET** `/genre/:id`
    - **Params**: `id` (Genre)
    - **Query**: `page` (optional)
    - **Example**: `/api/anime/v2/genre/action?page=1`

- **GET** `/detail/:id`
    - **Params**: `id` (Anime ID)
    - **Example**: `/api/anime/v2/detail/one-piece`

- **GET** `/stream/:id`
    - **Params**: `id` (Episode ID)
    - **Example**: `/api/anime/v2/stream/one-piece-episode-1`

#### Starshort (`/drama/starshort`) *(not mounted by default)*
Controller: `src/controllers/drama/starshort.controller.ts`
*Routes live under the drama namespace but are not currently registered in `src/routes/drama/index.ts`. Default `lang` is `4` (English usually), or `3` depending on endpoint.*

- **GET** `/recommendations`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/recommendations?lang=4`

- **GET** `/new-release`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/new-release?lang=4`

- **GET** `/rank`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/rank?lang=3`

- **GET** `/search`
    - **Query**: `query` (required), `lang` (optional)
    - **Example**: `/api/drama/starshort/search?query=love&lang=3`

- **GET** `/search-suggest`
    - **Query**: `query` (required), `lang` (optional)
    - **Example**: `/api/drama/starshort/search-suggest?query=love&lang=3`

- **GET** `/genre`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/genre?lang=4` *(Currently returns Unsupported)*

- **GET** `/genre/:id`
    - **Params**: `id`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/genre/1?lang=4` *(Currently returns Unsupported)*

- **GET** `/detail/:id`
    - **Params**: `id` (Drama ID)
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/detail/2002?lang=4`

- **GET** `/stream/:id`
    - **Params**: `id` (Drama ID)
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/stream/2002?lang=3`

- **GET** `/stream/:id/:episode`
    - **Params**: `id` (Drama ID), `episode`
    - **Query**: `lang` (optional)
    - **Example**: `/api/drama/starshort/stream/2002/1?lang=3`

- **GET** `/languages`
    - **Example**: `/api/drama/starshort/languages`

#### User (`/user`)
Controller: `src/controllers/user.controller.ts`

- **GET** `/get`
    - *Requires Auth Session & Cache*
    - **Example**: `/api/user/get` (with Cookie)

- **DELETE** `/delete/:id`
    - **Params**: `id` (User ID)
    - **Example**: `/api/user/delete/user_id_123`
