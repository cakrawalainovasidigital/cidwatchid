// Helper tunggal untuk seluruh endpoint AnimeIn (tanpa ketergantungan file lain).
// Flow umum:
// 1) Pilih endpoint key di `endpoints` (mis. 'homeData', 'movieDetail').
// 2) Isi params/form/multipart + pathParams sesuai jenis body.
// 3) Jika perlu payload terenkripsi, bungkus dengan encryptPayload => kirim sebagai { data: <base64> } via form.
// 4) Panggil callJson/callEndpoint/fetchPublicContent; jika respons string terenkripsi, decryptPayload untuk baca.
// Enkripsi/dekripsi payload mengikuti skema JsonEncryptor (AES-256-CBC, PBKDF2 HMAC-SHA256, salt+IV).
// Tip tipe: pakai EndpointOptions<'homeData'> atau EndpointRequirements['movieDetail'] untuk melihat kebutuhan path/query.
// Tipe params query: QueryParamsFor<'homeData'> -> Record<string, Primitive> (string | number | boolean).

declare const require: any;
const { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } = require('crypto');

export type Primitive = string | number | boolean;
export type QueryParams = Record<string, Primitive>;
type BodyKind = 'query' | 'form' | 'multipart' | 'json';
type HttpMethod = 'GET' | 'POST';

// Ambil nama path param langsung dari template path, mis. "3/2/movie/detail/{idMovie}" -> "idMovie".
type ExtractPathParams<Path extends string> =
  Path extends `${string}{${infer Param}}${infer Rest}` ? Param | ExtractPathParams<Rest> : never;

interface EndpointSpec<Path extends string = string, Body extends BodyKind = BodyKind> {
  path: Path;
  method: HttpMethod;
  body: Body;
  absolute?: boolean;
  extraHeaders?: Record<string, string>;
  // Optional explicit query keys for stronger typing; if omitted, query params fall back to Record<string, Primitive>.
  queryKeys?: readonly string[];
  requiredQueryKeys?: readonly string[];
  // Opsional jika ingin override; default-nya diambil otomatis dari path template.
  pathParams?: string[];
}

export interface CommonParams {
  id_user?: Primitive;
  key_client?: Primitive;
  apk_ver?: Primitive;
}

interface BaseCallOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  commonParams?: CommonParams;
  skipBaseRewrite?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

type AnyCallOptions = BaseCallOptions & {
  params?: QueryParams;
  form?: Record<string, Primitive>;
  json?: unknown;
  multipart?: FormData;
  pathParams?: Record<string, Primitive>;
};

const baseUrl = 'https://gate.nextanimelist.com/';

const endpoints = {
  // AuthApi
  authLogin: { path: 'auth/login', method: 'POST', body: 'form' },
  authRegister: { path: 'auth/register', method: 'POST', body: 'form' },
  authGoogle: { path: 'auth/google', method: 'POST', body: 'form' },
  authToken: { path: 'auth/token', method: 'POST', body: 'form' },
  authForget: { path: 'auth/forget', method: 'POST', body: 'form' },
  authDevice: { path: '3/2/user/auth/device', method: 'POST', body: 'form' },

  // SetupApi
  setupData: { path: 'data/setup/data', method: 'GET', body: 'query' },
  setupDataAbs: {
    path: '',
    method: 'GET',
    body: 'query',
    absolute: true,
    extraHeaders: { 'X-No-Base-Rewrite': '1' },
  },

  // ApkApi
  apkUpdate: { path: 'data/apk/update', method: 'GET', body: 'query' },

  // HomeApi
  homeData: { path: '3/2/home/data', method: 'GET', body: 'query' },
  homeFyp: { path: 'data/home/fyp', method: 'GET', body: 'query' },
  homeHot: { path: '3/2/home/hot', method: 'GET', body: 'query' },
  homeNew: { path: '3/2/home/new', method: 'GET', body: 'query' },
  homePopular: { path: '3/2/home/popular', method: 'GET', body: 'query' },
  homeRandom: { path: '3/2/home/random', method: 'GET', body: 'query' },
  homeTrailerList: { path: 'data/trailer/list', method: 'GET', body: 'query' },

  // ChatApi
  chatData: { path: '3/2/chat/data', method: 'GET', body: 'query' },
  chatDo: { path: '3/2/chat/do', method: 'POST', body: 'multipart' },
  chatReport: { path: '3/2/chat/report', method: 'POST', body: 'form' },

  // MovieApi
  movieContributorList: { path: 'data/movie/contributor/list', method: 'GET', body: 'query' },
  movieCoverAction: { path: '3/2/movie_cover/action', method: 'POST', body: 'form' },
  movieCoverData: { path: '3/2/movie_cover/data', method: 'GET', body: 'query' },
  movieCoverDelete: { path: '3/2/movie_cover/delete', method: 'POST', body: 'form' },
  movieCoverDo: { path: '3/2/movie_cover/do', method: 'POST', body: 'multipart' },
  movieCoverReport: { path: '3/2/movie_cover/report', method: 'POST', body: 'form' },
  movieDetail: {
    path: '3/2/movie/detail/{idMovie}',
    method: 'GET',
    body: 'query',
    pathParams: ['idMovie'],
  },
  movieDiscussionDo: { path: 'data/movie/discussion/do', method: 'POST', body: 'multipart' },
  movieDiscussionList: { path: 'data/movie/discussion/list', method: 'GET', body: 'query' },
  movieDiscussionReport: { path: 'data/movie/discussion/report', method: 'POST', body: 'form' },
  movieEpisode: {
    path: '3/2/movie/episode/{idMovie}',
    method: 'GET',
    body: 'query',
    pathParams: ['idMovie'],
  },
  movieFind: { path: 'data/movie/find', method: 'GET', body: 'query', queryKeys: ['title'], requiredQueryKeys: ['title'] },
  movieFypList: { path: 'data/movie/fyp/list_new', method: 'GET', body: 'query' },
  moviePosterAction: { path: '3/2/movie_poster/action', method: 'POST', body: 'form' },
  moviePosterData: { path: '3/2/movie_poster/data', method: 'GET', body: 'query' },
  moviePosterDelete: { path: '3/2/movie_poster/delete', method: 'POST', body: 'form' },
  moviePosterDo: { path: '3/2/movie_poster/do', method: 'POST', body: 'multipart' },
  moviePosterReport: { path: '3/2/movie_poster/report', method: 'POST', body: 'form' },
  movieStreamUseServerUser: { path: '3/2/movie_poster/action', method: 'POST', body: 'form' },
  movieTrailerList: { path: 'data/movie/trailer/list', method: 'GET', body: 'query' },

  // EpisodeApi
  episodeReport: { path: '3/2/episode/report', method: 'POST', body: 'form' },
  episodeStreamNew: {
    path: '3/2/episode/streamnew/{idEpisode}',
    method: 'GET',
    body: 'query',
    pathParams: ['idEpisode'],
  },
  episodeUpdater: { path: '3/2/episode/updater', method: 'GET', body: 'query' },

  // CommentApi
  commentAction: { path: '3/2/comment/action', method: 'POST', body: 'form' },
  commentData: { path: '3/2/comment/data', method: 'GET', body: 'query' },
  commentDo: { path: '3/2/comment/do', method: 'POST', body: 'multipart' },
  commentReplayAction: { path: 'data/comment_replay/action', method: 'POST', body: 'form' },
  commentReplayData: { path: 'data/comment_replay/data', method: 'GET', body: 'query' },
  commentReplayDo: { path: 'data/comment_replay/do', method: 'POST', body: 'multipart' },
  commentReplayReport: { path: 'data/comment_replay/report', method: 'POST', body: 'form' },
  commentReport: { path: '3/2/comment/report', method: 'POST', body: 'form' },

  // AdminApi
  adminBannedAdd: { path: 'data/admin/banned/add', method: 'POST', body: 'form' },
  adminBannedCancel: { path: 'data/admin/banned/cancel', method: 'POST', body: 'form' },
  adminBannedList: { path: 'data/admin/banned/list', method: 'GET', body: 'query' },
  adminChatReject: { path: 'data/admin/chat/reject', method: 'POST', body: 'form' },
  adminChatReport: { path: 'data/admin/chat/report', method: 'GET', body: 'query' },
  adminChatSave: { path: 'data/admin/chat/save', method: 'POST', body: 'form' },
  adminCommentReject: { path: 'data/admin/comment/reject', method: 'POST', body: 'form' },
  adminCommentReport: { path: 'data/admin/comment/report', method: 'GET', body: 'query' },
  adminCommentSave: { path: 'data/admin/comment/save', method: 'POST', body: 'form' },
  adminEpisodeRequest: { path: 'data/admin/episode_request', method: 'GET', body: 'query' },
  adminEpisodeRequestReject: { path: 'data/admin/episode_request/reject', method: 'POST', body: 'form' },
  adminEpisodeRequestSave: { path: 'data/admin/episode_request/save', method: 'POST', body: 'form' },
  adminFypDelete: { path: 'data/admin/fyp/delete', method: 'POST', body: 'form' },
  adminGalleryActive: { path: '3/2/admin/gallery/active', method: 'POST', body: 'form' },
  adminGalleryChoice: { path: 'data/admin/gallery/choice', method: 'POST', body: 'form' },
  adminGalleryData: { path: '3/2/admin/gallery/data', method: 'GET', body: 'query' },
  adminGalleryDelete: { path: 'data/admin/gallery/delete', method: 'POST', body: 'form' },
  adminGalleryReject: { path: '3/2/admin/gallery/reject', method: 'POST', body: 'form' },
  adminMovieDiscussionReject: { path: 'data/admin/movie_discussion/reject', method: 'POST', body: 'form' },
  adminMovieDiscussionReport: { path: 'data/admin/movie_discussion/report', method: 'GET', body: 'query' },
  adminMovieDiscussionSave: { path: 'data/admin/movie_discussion/save', method: 'POST', body: 'form' },
  adminMovieRequest: { path: 'data/admin/movie_request', method: 'GET', body: 'query' },
  adminMovieRequestReject: { path: 'data/admin/movie_request/reject', method: 'POST', body: 'form' },
  adminMovieRequestSave: { path: 'data/admin/movie_request/save', method: 'POST', body: 'form' },

  // ExploreApi
  exploreData: { path: '3/2/explore/data', method: 'GET', body: 'query' },
  exploreGenre: { path: '3/2/explore/genre', method: 'GET', body: 'query' },
  exploreMovie: { path: '3/2/explore/movie', method: 'GET', body: 'query' },
  exploreMovieGenre: { path: '3/2/explore/movie_genre', method: 'GET', body: 'query' },
  exploreMovieStudio: { path: '3/2/explore/movie_studio', method: 'GET', body: 'query' },
  exploreMovieType: { path: '3/2/explore/movie_type', method: 'GET', body: 'query' },
  exploreMovieYear: { path: '3/2/explore/movie_year', method: 'GET', body: 'query' },
  exploreYear: { path: '3/2/explore/year', method: 'GET', body: 'query' },

  // ProfileApi
  profileGallery: { path: '3/2/profile/gallery', method: 'GET', body: 'query' },
  profileMedal: { path: '3/2/profile/medal', method: 'GET', body: 'query' },
  profileMovie: { path: '3/2/profile/movie', method: 'GET', body: 'query' },
  profileOther: { path: '3/2/profile/other', method: 'GET', body: 'query' },
  profilePokemon: { path: 'data/profile/pokemon', method: 'GET', body: 'query' },

  // ProApi
  proList: { path: 'data/pro/list', method: 'GET', body: 'query' },

  // CoinApi
  coinList: { path: 'data/coin/list', method: 'GET', body: 'query' },

  // BattleApi
  sliderListBattle: { path: 'data/slider/list/battle', method: 'GET', body: 'query' },
  userBattleBannedDo: { path: 'data/user/battle/banned/do', method: 'POST', body: 'form' },
  userBattleBannedInfoNext: { path: 'data/user/battle/banned/info/next', method: 'GET', body: 'query' },
  userBattleBannedInfoNow: { path: 'data/user/battle/banned/info/now', method: 'GET', body: 'query' },
  userBattleBannedList: { path: 'data/user/battle/banned/list', method: 'GET', body: 'query' },
  userBattleDataInfo: { path: 'data/user/battle/data/info', method: 'GET', body: 'query' },
  userBattleDataSlotSave: { path: 'data/user/battle/data/slot_save', method: 'POST', body: 'form' },
  userBattleHistory: { path: '3/2/user/battle/history', method: 'GET', body: 'query' },
  userBattlePokemonList: { path: 'data/user/battle/pokemon/list', method: 'GET', body: 'query' },
  userBattlePokemonStatusReset: { path: 'data/user/battle/pokemon/status_reset', method: 'POST', body: 'form' },
  userBattlePokemonStatusUp: { path: 'data/user/battle/pokemon/status_up', method: 'POST', body: 'form' },
  userBattlePokemonStatusUpgrade: { path: 'data/user/battle/pokemon/status_upgrade', method: 'POST', body: 'form' },
  userBattleRankList: { path: '3/2/user/battle/rank_list', method: 'GET', body: 'query' },
  userBattleRealtimeRank: { path: 'data/user/battle/realtime/rank', method: 'POST', body: 'form' },
  userBattleRealtimeRoomInfo: { path: 'data/user/battle/realtime/room_info', method: 'GET', body: 'query' },
  userBattleRealtimeVS: { path: 'data/user/battle/realtime/vs', method: 'POST', body: 'form' },

  // TransactionExternalApi
  transactionExternalCreate: { path: 'transaction_external/create', method: 'GET', body: 'query' },

  // ScheduleApi
  scheduleData: { path: '3/2/schedule/data', method: 'GET', body: 'query' },

  // FypApi
  fypComment: { path: 'data/fyp/comment', method: 'GET', body: 'query' },
  fypCommentDo: { path: 'data/fyp/comment', method: 'POST', body: 'form' },
  fypCommentReport: { path: 'data/fyp/comment_report', method: 'POST', body: 'form' },
  fypListScroll: { path: 'data/fyp/list_scroll', method: 'GET', body: 'query' },
  fypServer: { path: 'data/fyp/server', method: 'GET', body: 'query' },
  fypView: { path: 'data/fyp/view', method: 'POST', body: 'form' },

  // UserApi
  userBagEvo: { path: '3/2/user/bag/evo', method: 'POST', body: 'form' },
  userBagPokemonRev: { path: '3/2/user/bag/pokemon_rev', method: 'GET', body: 'query' },
  userBagUse: { path: '3/2/user/bag/use', method: 'POST', body: 'form' },
  userEpisodeUserEditImage: { path: 'data/user/episode_user_edit/image', method: 'POST', body: 'multipart' },
  userFavoriteBook: { path: '3/2/user/favorite/book', method: 'POST', body: 'form' },
  userFavoriteDo: { path: '3/2/user/favorite/do', method: 'POST', body: 'form' },
  userFavoriteMovie: { path: '3/2/user/favorite/movie', method: 'GET', body: 'query' },
  userFavoriteShare: { path: '3/2/user/favorite/share', method: 'POST', body: 'form' },
  userFavoriteUn: { path: '3/2/user/favorite/un', method: 'POST', body: 'form' },
  userFind: { path: 'data/user/find', method: 'GET', body: 'query' },
  userFypBooked: { path: 'data/user/fyp/booked', method: 'GET', body: 'query' },
  userFypDelete: { path: 'data/user/fyp/delete', method: 'POST', body: 'form' },
  userFypLike: { path: 'data/user/fyp/like', method: 'POST', body: 'form' },
  userFypSave: { path: 'data/user/fyp/save', method: 'POST', body: 'multipart' },
  userHistoryAnime: { path: '3/2/user/history/movie', method: 'GET', body: 'query' },
  userHistoryDo: { path: '3/2/user/history/do', method: 'POST', body: 'form' },
  userHistoryEpisode: { path: '3/2/user/history/episode', method: 'GET', body: 'query' },
  userHistoryRemove: { path: '3/2/user/history/remove', method: 'POST', body: 'form' },
  userLoveLopers: { path: '3/2/user/love/lopers', method: 'GET', body: 'query' },
  userLoveLoping: { path: '3/2/user/love/loping', method: 'GET', body: 'query' },
  userMedalCalculate: { path: '3/2/user/medal/calculate', method: 'POST', body: 'form' },
  userMovieUserEdit: { path: 'data/user/movie_user_edit', method: 'POST', body: 'form' },
  userNotificationClaim: { path: 'data/user/notification/claim', method: 'POST', body: 'form' },
  userNotificationClaimAll: { path: 'data/user/notification/claim_all', method: 'POST', body: 'form' },
  userNotificationList: { path: 'data/user/notification/list', method: 'GET', body: 'query' },
  userProCatch: { path: '3/2/user/pro/catch', method: 'POST', body: 'form' },
  userProCoin: { path: '3/2/user/pro/coin', method: 'POST', body: 'form' },
  userProData: { path: 'data/user/pro/data', method: 'GET', body: 'query' },
  userProImage: { path: '3/2/user/pro/image', method: 'POST', body: 'multipart' },
  userProfileData: { path: '3/2/user/profile/data', method: 'GET', body: 'query' },
  userProfileEmail: { path: '3/2/user/profile/email', method: 'POST', body: 'form' },
  userProfileLike: { path: '3/2/user/profile/like', method: 'POST', body: 'form' },
  userProfileMedal: { path: '3/2/user/profile/medal', method: 'GET', body: 'query' },
  userProfileMoney: { path: '3/2/user/profile/money', method: 'POST', body: 'form' },
  userProfilePassword: { path: '3/2/user/profile/password', method: 'POST', body: 'form' },
  userProfileUsername: { path: '3/2/user/profile/username', method: 'POST', body: 'form' },
  userProfileView: { path: '3/2/user/profile/view', method: 'POST', body: 'form' },
  userReportDo: { path: 'data/user/report/do', method: 'POST', body: 'form' },
  userReportUn: { path: 'data/user/report/un', method: 'POST', body: 'form' },
  userShopBuy: { path: '3/2/user/shop/buy', method: 'POST', body: 'form' },
  userShopPokemon: { path: '3/2/user/shop/pokemon', method: 'GET', body: 'query' },
  userStreamDo: { path: '3/2/user/stream/do', method: 'POST', body: 'form' },
  userTaskComplete: { path: 'data/user/task/complete', method: 'POST', body: 'form' },
  userTaskData: { path: 'data/user/task/data', method: 'GET', body: 'query' },
} as const satisfies Record<string, EndpointSpec>;

/*
Quick usage cheat sheet (exclude UserApi block at bottom on purpose):
- Auth: callJson('authLogin' | 'authRegister' | 'authGoogle' | 'authToken' | 'authForget' | 'authDevice', { form: {...} })
- Setup: fetchPublicContent('setupData', { params: {...} }); setupDataAbs requires baseUrl override + params.
- Apk: fetchPublicContent('apkUpdate', { params: {...} })
- Home: fetchPublicContent('homeData' | 'homeFyp' | 'homeHot' | 'homeNew' | 'homePopular' | 'homeRandom' | 'homeTrailerList', { params: {...} })
- Chat: fetchPublicContent('chatData', { params }); callJson('chatDo', { multipart: FormData }); callJson('chatReport', { form })
- Movie (pathParams when listed):
  - fetchPublicContent('movieContributorList' | 'movieCoverData' | 'movieDiscussionList' | 'movieFind' | 'movieFypList' | 'moviePosterData' | 'movieTrailerList' | 'movieStreamUseServerUser', { params })
  - callJson('movieCoverAction' | 'movieCoverDelete' | 'movieCoverReport', { form })
  - callJson('movieCoverDo', { multipart: FormData })
  - fetchPublicContent('movieDetail', { pathParams: { idMovie }, params })
  - fetchPublicContent('movieEpisode', { pathParams: { idMovie }, params })
  - callJson('movieDiscussionDo' | 'moviePosterAction' | 'moviePosterDelete' | 'moviePosterDo' | 'moviePosterReport', { form })
- Episode:
  - callJson('episodeReport', { form })
  - fetchPublicContent('episodeStreamNew', { pathParams: { idEpisode }, params })
  - fetchPublicContent('episodeUpdater', { params })
- Comment:
  - callJson('commentAction' | 'commentDo' | 'commentReplayAction' | 'commentReplayDo' | 'commentReplayReport' | 'commentReport', { form })
  - fetchPublicContent('commentData' | 'commentReplayData', { params })
- Admin:
  - callJson('adminBannedAdd' | 'adminBannedCancel' | 'adminChatReject' | 'adminChatSave' | 'adminCommentReject' | 'adminCommentSave' | 'adminEpisodeRequestReject' | 'adminEpisodeRequestSave' | 'adminGalleryActive' | 'adminGalleryChoice' | 'adminGalleryDelete' | 'adminGalleryReject' | 'adminMovieDiscussionReject' | 'adminMovieDiscussionSave' | 'adminMovieRequestReject' | 'adminMovieRequestSave', { form })
  - fetchPublicContent('adminBannedList' | 'adminChatReport' | 'adminCommentReport' | 'adminEpisodeRequest' | 'adminGalleryData' | 'adminMovieDiscussionReport' | 'adminMovieRequest', { params })
  - callJson('adminFypDelete', { form })
- Explore: fetchPublicContent('exploreData' | 'exploreGenre' | 'exploreMovie' | 'exploreMovieGenre' | 'exploreMovieStudio' | 'exploreMovieType' | 'exploreMovieYear' | 'exploreYear', { params })
- Profile: fetchPublicContent('profileGallery' | 'profileMedal' | 'profileMovie' | 'profileOther' | 'profilePokemon', { params })
- Pro: fetchPublicContent('proList', { params })
- Coin: fetchPublicContent('coinList', { params })
- Battle:
  - fetchPublicContent('sliderListBattle', { params })
  - callJson('userBattleBannedDo', { form })
  - fetchPublicContent('userBattleBannedInfoNext' | 'userBattleBannedInfoNow' | 'userBattleBannedList' | 'userBattleDataInfo' | 'userBattleHistory' | 'userBattlePokemonList' | 'userBattleRankList', { params })
  - callJson('userBattleDataSlotSave' | 'userBattleRealtimeRank' | 'userBattleRealtimeVS', { form })
  - callJson('userBattlePokemonStatusReset' | 'userBattlePokemonStatusUp' | 'userBattlePokemonStatusUpgrade', { form })
  - fetchPublicContent('userBattleRealtimeRoomInfo', { params })
- TransactionExternal: fetchPublicContent('transactionExternalCreate', { params })
- Schedule: fetchPublicContent('scheduleData', { params })
- Fyp:
  - fetchPublicContent('fypComment', { params })
  - callJson('fypCommentDo' | 'fypCommentReport' | 'fypView', { form })
  - fetchPublicContent('fypListScroll' | 'fypServer', { params })

Notes:
- Use fetchPublicContent for GET endpoints; callJson for POST/form/multipart.
- Supply pathParams only when the path includes {id...} (see movieDetail, movieEpisode, episodeStreamNew).
- UserApi endpoints (userBagEvo ... userTaskData) intentionally omitted here.
*/

type RawEndpointMap = typeof endpoints;
// Attach EndpointSpec fields (queryKeys, requiredQueryKeys, etc.) to every entry so indexed access works on unions.
type EndpointMap = { [K in keyof RawEndpointMap]: EndpointSpec & RawEndpointMap[K] };
export type EndpointKey = keyof EndpointMap;
type PathParamKeys<K extends EndpointKey> = ExtractPathParams<EndpointMap[K]['path']>;
type PathParamsShape<K extends EndpointKey> = [PathParamKeys<K>] extends [never]
  ? Record<string, never>
  : Record<PathParamKeys<K>, Primitive>;
export type PathParamsFor<K extends EndpointKey> = PathParamsShape<K>;

type BuildQueryShape<
  Keys extends readonly string[] | undefined,
  RequiredKeys extends readonly string[] | undefined
> =
  Keys extends readonly string[]
    ? RequiredKeys extends readonly string[]
      ? { [K in RequiredKeys[number]]: Primitive } & { [K in Exclude<Keys[number], RequiredKeys[number]>]?: Primitive }
      : { [K in Keys[number]]?: Primitive }
    : QueryParams;

type QueryParamsShape<K extends EndpointKey> = EndpointMap[K]['body'] extends 'query'
  ? BuildQueryShape<EndpointMap[K]['queryKeys'], EndpointMap[K]['requiredQueryKeys']>
  : Record<string, never>;
export type QueryParamsFor<K extends EndpointKey> = QueryParamsShape<K>;

const DEFAULT_HEADERS: Record<string, string> = { Accept: 'application/json' };
const DEFAULT_CLIENT_CONFIG: BaseCallOptions = {
  baseUrl,
  headers: DEFAULT_HEADERS,
};

export type AnimeinClientConfig = BaseCallOptions;
export type AnimeinClientOptions = Partial<AnimeinClientConfig>;

type PayloadShape<K extends EndpointKey> =
  EndpointMap[K]['body'] extends 'json'
    ? unknown
    : EndpointMap[K]['body'] extends 'multipart'
      ? FormData | Record<string, Primitive>
      : EndpointMap[K]['body'] extends 'query'
        ? QueryParams
        : Record<string, Primitive>;
export type PayloadFor<K extends EndpointKey> = PayloadShape<K>;

type BodyOptions<K extends EndpointKey> =
  EndpointMap[K]['body'] extends 'query'
    ? { params?: QueryParams; form?: Record<string, Primitive>; json?: never; multipart?: never; }
    : EndpointMap[K]['body'] extends 'form'
      ? { form?: Record<string, Primitive>; params?: QueryParams; json?: never; multipart?: never; }
      : EndpointMap[K]['body'] extends 'json'
        ? { json?: unknown; params?: never; form?: never; multipart?: never; }
        : { multipart?: FormData; form?: Record<string, Primitive>; params?: QueryParams; json?: never; };

type PathOptions<K extends EndpointKey> = [PathParamKeys<K>] extends [never]
  ? { pathParams?: Record<string, never> }
  : { pathParams: PathParamsShape<K> };

// Gunakan EndpointOptions<'movieDetail'> untuk melihat kebutuhan path/query di editor.
export type EndpointOptions<K extends EndpointKey> =
  BaseCallOptions & PathOptions<K> & BodyOptions<K>;

type CallOptions = EndpointOptions<EndpointKey>;

type EndpointMeta<K extends EndpointKey> = EndpointSpec & EndpointMap[K];

// Ringkasan tipe per endpoint (termasuk path param yang wajib).
export type EndpointRequirements = {
  [K in EndpointKey]: {
    path: EndpointMap[K]['path'];
    method: EndpointMap[K]['method'];
    body: EndpointMap[K]['body'];
    pathParams: PathParamsShape<K>;
    queryParams: QueryParamsShape<K>;
    payload: PayloadShape<K>;
    absolute?: EndpointMeta<K>['absolute'];
  };
};

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function mergeHeaders(
  baseHeaders?: Record<string, string>,
  override?: Record<string, string>,
): Record<string, string> | undefined {
  if (!baseHeaders && !override) return undefined;
  return { ...(baseHeaders ?? {}), ...(override ?? {}) };
}

function resolveClientConfig(config: AnimeinClientOptions = DEFAULT_CLIENT_CONFIG): AnimeinClientConfig {
  return {
    ...DEFAULT_CLIENT_CONFIG,
    ...config,
    headers: mergeHeaders(DEFAULT_HEADERS, config.headers ?? {}) ?? DEFAULT_HEADERS,
    commonParams: config.commonParams ?? DEFAULT_CLIENT_CONFIG.commonParams,
  };
}

function mergeEndpointOptions<K extends EndpointKey>(
  config: AnimeinClientConfig,
  options: EndpointOptions<K>,
): EndpointOptions<K> {
  const headers = mergeHeaders(config.headers, options.headers);
  const commonParams = { ...(config.commonParams ?? {}), ...(options.commonParams ?? {}) };
  return {
    ...(config as EndpointOptions<K>),
    ...(options ?? {}),
    baseUrl: options.baseUrl ?? config.baseUrl ?? baseUrl,
    headers,
    commonParams,
    skipBaseRewrite: options.skipBaseRewrite ?? config.skipBaseRewrite,
    signal: options.signal ?? config.signal,
    fetchImpl: options.fetchImpl ?? config.fetchImpl,
  };
}

function extractPathParamsFromTemplate(path: string): string[] {
  const matches = path.matchAll(/\{([^}]+)\}/g);
  return Array.from(matches, (match) => match[1]);
}

function materializePath(path: string, pathParams: Record<string, Primitive> | undefined, required: string[]): string {
  if (required.length === 0) return path;
  if (!pathParams) {
    throw new Error(`Missing path params: ${required.join(', ')}`);
  }
  return required.reduce((acc, key) => {
    if (pathParams[key] === undefined) {
      throw new Error(`Missing path param: ${key}`);
    }
    return acc.replace(`{${key}}`, encodeURIComponent(String(pathParams[key])));
  }, path);
}

function applyCommon<T extends Record<string, unknown>>(target: T, common?: CommonParams): T {
  if (!common) return target;
  const next = { ...target } as T;
  if (common.id_user !== undefined) (next as Record<string, unknown>).id_user = common.id_user;
  if (common.key_client !== undefined) (next as Record<string, unknown>).key_client = common.key_client;
  if (common.apk_ver !== undefined) (next as Record<string, unknown>).apk_ver = common.apk_ver;
  return next;
}

function buildUrl(baseUrl: string, path: string, params?: QueryParams): string {
  const url = new URL(path, ensureTrailingSlash(baseUrl));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

export function buildEndpointUrl<K extends EndpointKey>(key: K, opts: EndpointOptions<K>): string {
  const spec: EndpointSpec = endpoints[key];
  const requiredPathParams = spec.pathParams ?? extractPathParamsFromTemplate(spec.path);
  const path = materializePath(spec.path, (opts as AnyCallOptions).pathParams, requiredPathParams);
  const base = spec.absolute ? opts.baseUrl : opts.baseUrl ?? baseUrl;
  if (spec.absolute && !base) {
    throw new Error(`Endpoint ${key} requires an absolute baseUrl`);
  }

  const queryParams = spec.body === 'query'
    ? applyCommon((opts as AnyCallOptions).params ?? {}, opts.commonParams)
    : undefined;

  return buildUrl(base ?? baseUrl, path, queryParams);
}

function buildBody(spec: EndpointSpec, opts: AnyCallOptions): { body?: unknown; headers?: Record<string, string> } {
  switch (spec.body) {
    case 'query':
      return {};
    case 'form': {
      const raw = applyCommon(opts.form ?? opts.params ?? {}, opts.commonParams);
      const search = new URLSearchParams();
      Object.entries(raw).forEach(([key, value]) => search.append(key, String(value)));
      return { body: search, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
    }
    case 'json': {
      const payload = opts.json ?? opts.form ?? opts.params ?? {};
      return { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } };
    }
    case 'multipart': {
      if (opts.multipart) {
        return { body: opts.multipart };
      }
      const fd = new FormData();
      const data = applyCommon(opts.form ?? opts.params ?? {}, opts.commonParams);
      Object.entries(data).forEach(([key, value]) => fd.append(key, String(value)));
      return { body: fd };
    }
    default:
      return {};
  }
}

export async function callEndpoint<K extends EndpointKey>(key: K, opts: EndpointOptions<K> = {} as EndpointOptions<K>): Promise<Response> {
  const spec: EndpointSpec = endpoints[key];
  const url = buildEndpointUrl(key, opts);
  const normalizedOpts = opts as AnyCallOptions;
  const { body, headers: bodyHeaders } = buildBody(spec, normalizedOpts);
  const fetchImpl = opts.fetchImpl ?? fetch;

  const headers = {
    ...(spec.extraHeaders ?? {}),
    ...(opts.skipBaseRewrite ? { 'X-No-Base-Rewrite': '1' } : {}),
    ...(bodyHeaders ?? {}),
    ...(opts.headers ?? {}),
  };

  return fetchImpl(url, {
    method: spec.method,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: body as any,
    headers,
    signal: opts.signal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

export async function callJson<K extends EndpointKey, T = unknown>(key: K, opts: EndpointOptions<K> = {} as EndpointOptions<K>): Promise<T> {
  const res = await callEndpoint(key, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

// Encryption helpers (AES-256-CBC with PBKDF2/HMAC-SHA256; salt + IV prefixed, Base64 encoded)
const AES_PASSWORD = 'okEkoFUNANIMEINaja';
const SALT_LEN = 16;
const IV_LEN = 16;
const ITERATIONS = 0x10000;
const KEY_LEN = 32;
const DIGEST = 'sha256';
const AES_ALGO = 'aes-256-cbc';

export function encryptPayload(data: string | Record<string, unknown>): string {
  const plain = typeof data === 'string' ? data : JSON.stringify(data);
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = pbkdf2Sync(AES_PASSWORD, salt, ITERATIONS, KEY_LEN, DIGEST);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([salt, iv, encrypted]).toString('base64');
}

export function decryptPayload(base64: string): string {
  const raw = Buffer.from(base64, 'base64');
  const salt = raw.subarray(0, SALT_LEN);
  const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = raw.subarray(SALT_LEN + IV_LEN);
  const key = pbkdf2Sync(AES_PASSWORD, salt, ITERATIONS, KEY_LEN, DIGEST);
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export type PublicFetchOptions<K extends EndpointKey> = EndpointOptions<K> & {
  useEncryption?: boolean;
};

// Helper praktis: panggil konten publik
export async function fetchPublicContent<K extends EndpointKey, T = unknown>(
  endpoint: K,
  options: PublicFetchOptions<K>,
): Promise<T> {
  const { useEncryption } = options;
  const callOptions: EndpointOptions<K> = options;

  if (useEncryption) {
    const cipher = encryptPayload(callOptions.params ?? {});
    return callJson<K, T>(endpoint, {
      ...callOptions,
      params: undefined,
      form: { data: cipher },
    });
  }

  return callJson<K, T>(endpoint, callOptions);
}

export interface AnimeinClient {
  baseUrl?: string;
  headers?: Record<string, string>;
  url: <K extends EndpointKey>(key: K, opts?: EndpointOptions<K>) => string;
  call: <K extends EndpointKey>(key: K, opts?: EndpointOptions<K>) => Promise<Response>;
  json: <K extends EndpointKey, T = unknown>(key: K, opts?: EndpointOptions<K>) => Promise<T>;
  public: <K extends EndpointKey, T = unknown>(key: K, opts: PublicFetchOptions<K>) => Promise<T>;
  encrypt: typeof encryptPayload;
  decrypt: typeof decryptPayload;
}

export function createAnimeinClient(config: AnimeinClientOptions = DEFAULT_CLIENT_CONFIG): AnimeinClient {
  const resolved = resolveClientConfig(config);
  const withDefaults = <K extends EndpointKey>(opts?: EndpointOptions<K>): EndpointOptions<K> =>
    mergeEndpointOptions(resolved, (opts ?? {}) as EndpointOptions<K>);

  return {
    baseUrl: resolved.baseUrl,
    headers: resolved.headers,
    url: <K extends EndpointKey>(key: K, opts?: EndpointOptions<K>) => buildEndpointUrl(key, withDefaults(opts)),
    call: <K extends EndpointKey>(key: K, opts?: EndpointOptions<K>) => callEndpoint(key, withDefaults(opts)),
    json: <K extends EndpointKey, T = unknown>(key: K, opts?: EndpointOptions<K>) =>
      callJson<K, T>(key, withDefaults(opts)),
    public: <K extends EndpointKey, T = unknown>(key: K, opts: PublicFetchOptions<K>) =>
      fetchPublicContent<K, T>(key, withDefaults(opts) as PublicFetchOptions<K>),
    encrypt: encryptPayload,
    decrypt: decryptPayload,
  };
}

// // Contoh pemakaian cepat (bisa dihapus jika tidak perlu dieksekusi langsung)
// async function demo() {
//   const sample = await fetchPublicContent('homeData', { params: { page: 1 } });
//   console.log('Home data sample:', JSON.stringify(sample, null, 2));
// }

// if (require.main === module) {
//   demo().catch((err: Error) => {
//     console.error('Demo fetch failed:', err);
//     process.exitCode = 1;
//   });
// }

export const Animein = {
  endpoints,
  baseUrl,
  callEndpoint,
  callJson,
  encryptPayload,
  decryptPayload,
  fetchPublicContent,
  buildEndpointUrl,
  createClient: createAnimeinClient,
  defaultHeaders: DEFAULT_HEADERS,
};


// // GET homeData
// const home = await fetchPublicContent('homeData', { params: { page: 1 } });

// // GET movie detail dengan path param
// const detail = await callJson('movieDetail', {
//   pathParams: { idMovie: 123 },
//   params: { lang: 'en' },
// });

// // POST terenkripsi (payload dibungkus di field data)
// const secured = await fetchPublicContent('userReportDo', {
//   useEncryption: true,
//   params: { reason: 'spam', target: 42 },
// });

// // Dekripsi respons terenkripsi
// const plaintext = decryptPayload(secured as unknown as string);
