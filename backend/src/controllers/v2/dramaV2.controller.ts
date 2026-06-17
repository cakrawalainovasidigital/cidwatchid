import { Context } from "hono";
import createDramaboxClient from "../../lib/utils/dramaboxHelper";
import { MeloloHelper } from "../../lib/utils/meloloHelper";
import { fetcher } from "../../lib/fetcher";
import {
	parsePaginationParams,
	paginateDramaboxData,
	transformDramaboxListResponse,
	// transformDramaboxItem,
	transformMeloloItem,
	sliceMeloloBooks,
	calculateNeededFromMelolo,
	calculateMeloloFetchLimit,
	calculateMeloloOffset,
	combineAndShuffle,
	limitArray,
	buildCombinedResponse,
	DramaItem,
	ProviderType,
} from "../../lib/utils/dramaPagination";
import { serializeError } from "../../lib/errorHelper";

export const getDramaV2Recommendations = async (c: Context) => {
	const lang = c.req.query("lang") || "in";

	const { page, limit } = parsePaginationParams(
		c.req.query("page"),
		c.req.query("limit"),
		15
	);

	const dramaboxClient = createDramaboxClient({ lang });

	try {
		const [dramaboxRes, meloloRes] = await Promise.all([
			dramaboxClient.getRecommendedBooks(),
			MeloloHelper.meloloBookmallTrending(
				String(calculateMeloloFetchLimit(limit, 3)),
				String(calculateMeloloOffset(page, limit))
			),
		]);

		const dramaboxData = paginateDramaboxData(dramaboxRes, page, limit);
		const neededFromMelolo = calculateNeededFromMelolo(dramaboxData.length, limit);
		const meloloBooks = meloloRes.data?.data?.cell?.books ?? [];
		const meloloData = sliceMeloloBooks(meloloBooks, neededFromMelolo);

		const combinedData = limitArray(
			combineAndShuffle(dramaboxData, meloloData),
			limit
		);

		const result = buildCombinedResponse(combinedData, c.req.path);
		return c.json(result, 200);
	} catch (error) {
		console.error("[DramaV2] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2NewRelease = async (c: Context) => {
	const lang = c.req.query("lang") || "in";

	const { page, limit } = parsePaginationParams(
		c.req.query("page"),
		c.req.query("limit"),
		15
	);

	const dramaboxClient = createDramaboxClient({ lang });

	try {
		const [dramaboxRes, meloloRes] = await Promise.all([
			dramaboxClient.getDramaList(page, limit),
			MeloloHelper.meloloBookmallLatest(
				String(calculateMeloloFetchLimit(limit, 3)),
				String(calculateMeloloOffset(page, limit))
			),
		]);

		const dramaboxData = transformDramaboxListResponse(dramaboxRes);
		const neededFromMelolo = calculateNeededFromMelolo(dramaboxData.length, limit);
		const meloloBooks = meloloRes.data?.data?.cell?.books ?? [];
		const meloloData = sliceMeloloBooks(meloloBooks, neededFromMelolo);

		const combinedData = limitArray(
			combineAndShuffle(dramaboxData, meloloData),
			limit
		);

		const result = buildCombinedResponse(combinedData, c.req.path);
		return c.json(result, 200);
	} catch (error) {
		console.error("[DramaV2] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2Search = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const query = c.req.query("query") || "";

	const { page, limit } = parsePaginationParams(
		c.req.query("page"),
		c.req.query("limit"),
		15
	);

	try {
		const dramaboxClient = createDramaboxClient({ lang });

		const [dramaboxRes, meloloRes] = await Promise.all([
			dramaboxClient.searchDrama(query, page, limit),
			MeloloHelper.meloloSearch(query, String(calculateMeloloOffset(page, limit)), String(limit * 2)),
		]);

		const dramaboxData: DramaItem[] = [];
		if (dramaboxRes?.book && Array.isArray(dramaboxRes.book)) {
			for (const item of dramaboxRes.book) {
				dramaboxData.push({
					id: item.id,
					title: item.name,
					description: item.introduction,
					coverImage: item.cover,
					playCount: item.playCount,
					chapterCount: null,
					type: ProviderType.DRAMABOX,
				});
			}
		}

		const meloloData: DramaItem[] = [];
		const searchData = meloloRes.data?.data?.search_data ?? [];
		const meloloBooks = searchData.flatMap((item: any) =>
			Array.isArray(item?.books) ? item.books : []
		);

		for (const item of meloloBooks.slice(0, limit)) {
			meloloData.push(transformMeloloItem(item));
		}

		const combinedData = [...dramaboxData, ...meloloData];

		const result = {
			success: true,
			source: "dramabox/melolo",
			path: c.req.path,
			query,
			count: combinedData.length,
			data: combinedData,
		};

		return c.json(result, 200);
	} catch (error) {
		console.error("[DramaV2 Search] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2Stream = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const type = Number(c.req.query("type"));
	const { id, chapterId } = c.req.param();

	if (!type || (type !== 1 && type !== 2)) {
		return c.json({ message: "Invalid type! Use 1 for Dramabox, 2 for Melolo" }, 400);
	}

	try {
		if (type === ProviderType.DRAMABOX) {

			// Original code - commented for reference
			const dramaboxClient = createDramaboxClient({ lang });

			const detailRes: any = await dramaboxClient.getDramaDetail(id);
			const chapterList = detailRes?.data?.list || [];

			if (!chapterList.length) {
				return c.json({ message: "Chapter list not found!" }, 404);
			}

			const targetChapter = chapterList.find(
				(ch: any) => String(ch.chapterId ?? ch.id) === String(chapterId)
			);

			if (!targetChapter) {
				return c.json({ message: "Chapter not found!" }, 404);
			}

			const chapterIndex = targetChapter.chapterIndex ?? targetChapter.index ?? 0;

			const response: any = await dramaboxClient.getStreamUrl(id, String(chapterIndex + 1));

			if (!response?.data?.chapterList?.length) {
				return c.json({ message: "Stream data not found!" }, 404);
			}

			const streamChapter = response.data.chapterList.find(
				(item: any) => String(item.chapterId ?? item.id) === String(chapterId)
			) || response.data.chapterList[0];

			return c.json({
				success: true,
				source: "dramabox",
				path: c.req.path,
				type: ProviderType.DRAMABOX,
				data: {
					id,
					coverImage: streamChapter.chapterImg,
					chapterId: chapterId,
					streamUrl: streamChapter.cdnList[0]?.videoPathList[0]?.videoPath,
					qualities: streamChapter.cdnList[0]?.videoPathList?.map((item: any) => ({
						quality: item.quality,
						streamUrl: item.videoPath,
					})) || [],
				},
			}, 200);

			// // New implementation using captain.sapimu.au endpoint with fetcher
			// // First, get drama detail to map chapterId to chapterIndex
			// const dramaboxClient = createDramaboxClient({ lang });
			// const detailRes: any = await dramaboxClient.getDramaDetail(id);
			// const chapterList = detailRes?.data?.list || [];

			// if (!chapterList.length) {
			//   return c.json({ message: "Chapter list not found!" }, 404);
			// }

			// // Find chapter by chapterId (can be actual ID or index string)
			// const targetChapter = chapterList.find(
			//   (ch: any) => String(ch.chapterId ?? ch.id) === String(chapterId)
			// );

			// if (!targetChapter) {
			//   return c.json({ message: "Chapter not found!" }, 404);
			// }

			// // Get the chapter index (0-based) for the API
			// const chapterIndex = targetChapter.chapterIndex ?? targetChapter.index ?? 0;

			// // Fetch stream using chapterIndex
			// const response: any = await fetcher.get(
			//   c,
			//   "v2",
			//   `/dramabox/api/v1/watch/${id}/${chapterIndex}?lang=${lang}&direction=1`,
			//   {
			//     "Authorization": `Bearer ${c.env.DRAMABOX_TOKEN || ""}`,
			//   }
			// );

			// if (!response?.success || !response?.data) {
			//   return c.json({ message: "Stream data not found!" }, 404);
			// }

			// const data = response.data;

			// // Find default quality or use first available
			// const defaultQuality = data.qualities?.find((q: any) => q.isDefault === 1) || data.qualities?.[0];

			// return c.json({
			//   success: true,
			//   source: "dramabox",
			//   path: c.req.path,
			//   type: ProviderType.DRAMABOX,
			//   data: {
			//     id: data.bookId,
			//     coverImage: data.cover,
			//     chapterId: chapterId,
			//     chapterIndex: chapterIndex,
			//     streamUrl: defaultQuality?.videoPath || data.videoUrl,
			//     qualities: data.qualities?.map((item: any) => ({
			//       quality: item.quality,
			//       streamUrl: item.videoPath,
			//     })) || [],
			//   },
			// }, 200);
		} else if (type === ProviderType.MELOLO) {
			const videoId = chapterId || id;
			const response: any = await MeloloHelper.meloloVideoUrl(videoId);

			if (!response?.data?.raw?.data?.video_model) {
				return c.json({ message: "Data not found!" }, 404);
			}

			const model = JSON.parse(response.data.raw.data.video_model);

			return c.json({
				success: true,
				source: "melolo",
				path: c.req.path,
				type: ProviderType.MELOLO,
				data: {
					id: response.data.video_id,
					coverImage: model.big_thumbs?.[0]?.img_url || null,
					chapterId: videoId,
					streamUrl: response.data?.main_url,
					qualities: [
						{
							quality: 720,
							streamUrl: response.data?.main_url,
						},
					],
				},
			}, 200);
		}
	} catch (error) {
		console.error(error)
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2Detail = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const type = Number(c.req.query("type"));
	const { id } = c.req.param();

	if (!type || (type !== 1 && type !== 2)) {
		return c.json({ message: "Invalid type! Use 1 for Dramabox, 2 for Melolo" }, 400);
	}

	try {
		if (type === ProviderType.DRAMABOX) {
			const dramaboxClient = createDramaboxClient({ lang });

			const [responseChapters, responseDetail]: any = await Promise.all([
				dramaboxClient.getDramaDetail(id),
				dramaboxClient.getStreamUrl(String(id), "0"),
			]);

			if (!responseChapters?.data?.list) {
				return c.json({ message: "Data not found!" }, 404);
			}

			return c.json({
				success: true,
				source: "dramabox",
				path: c.req.path,
				type: ProviderType.DRAMABOX,
				chapterCount: responseChapters.data.list.length,
				data: {
					id,
					title: responseDetail?.data?.bookName || "",
					description: responseDetail?.data?.introduction || "",
					coverImage: responseDetail?.data?.bookCover || "",
					playCount: responseDetail?.data?.playCount,
					chapterCount: responseChapters.data.list.length,
					chapters: responseChapters.data.list.map((item: any) => ({
						chapterId: item.chapterId,
						chapterIndex: item.chapterIndex,
					})),
				},
			}, 200);
		} else if (type === ProviderType.MELOLO) {
			const response: any = await MeloloHelper.meloloSeriesDetail(id);

			if (!response?.data?.data?.video_data) {
				return c.json({ message: "Data not found!" }, 404);
			}

			const videoData = response.data.data.video_data;

			return c.json({
				success: true,
				source: "melolo",
				path: c.req.path,
				type: ProviderType.MELOLO,
				chapterCount: videoData.episode_cnt,
				data: {
					id: videoData.series_id,
					title: videoData.series_title,
					description: videoData.series_intro,
					coverImage: videoData.series_cover,
					playCount: videoData.series_play_cnt,
					chapterCount: videoData.episode_cnt,
					chapters: videoData.video_list?.map((item: any) => ({
						chapterId: item.vid,
					})) || [],
				},
			}, 200);
		}
	} catch (error) {
		console.error("[DramaV2 Detail] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2Vip = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const type = Number(c.req.query("type"));

	if (!type || (type !== 1 && type !== 2)) {
		return c.json({ message: "Invalid type! Use 1 for Dramabox, 2 for Melolo" }, 400);
	}

	if (type === ProviderType.MELOLO) {
		return c.json({ message: "VIP not available for Melolo" }, 404);
	}

	try {
		const dramaboxClient = createDramaboxClient({ lang });
		const response: any = await dramaboxClient.getVip();

		if (!response?.data?.columnVoList) {
			return c.json({ message: "Data not found!" }, 404);
		}

		const books = response.data.columnVoList;

		return c.json({
			success: true,
			source: "dramabox",
			path: c.req.path,
			type: ProviderType.DRAMABOX,
			count: books.length,
			data: books.map((item: any) => ({
				tabTitle: item.title,
				items: item.bookList?.map((book: any) => ({
					id: book.bookId,
					title: book.bookName,
					description: book.introduction,
					coverImage: book.coverWap,
					playCount: book.playCount,
					chapterCount: book.chapterCount,
				})) || [],
			})),
		}, 200);
	} catch (error) {
		console.error("[DramaV2 VIP] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2Genre = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const { page, limit } = parsePaginationParams(
		c.req.query("page"),
		c.req.query("limit"),
		30
	);

	const dramaboxClient = createDramaboxClient({ lang });

	try {
		const categories = await dramaboxClient.getCategories(page, limit);

		return c.json({
			success: true,
			source: "dramabox",
			path: c.req.path,
			count: categories.length,
			data: categories.map((genre: any) => ({
				genreId: genre.id,
				genreName: genre.name,
				lang,
			})),
		}, 200);
	} catch (error) {
		console.error("[DramaV2 Genre] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2GenreDetails = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const type = Number(c.req.query("type")) || 1;
	const { id } = c.req.param();

	const { page, limit } = parsePaginationParams(
		c.req.query("page"),
		c.req.query("limit"),
		15
	);

	if (type !== 1 && type !== 2) {
		return c.json({ message: "Invalid type! Use 1 for Dramabox, 2 for Melolo" }, 400);
	}

	if (type === ProviderType.MELOLO) {
		return c.json({ message: "Genre details not available for Melolo" }, 404);
	}

	try {
		const dramaboxClient = createDramaboxClient({ lang });
		const response: any = await dramaboxClient.getBookFromCategories(Number(id), page, limit);

		if (!response?.bookList) {
			return c.json({ message: "Data not found!" }, 404);
		}

		return c.json({
			success: true,
			source: "dramabox",
			path: c.req.path,
			type: ProviderType.DRAMABOX,
			count: response.bookList.length,
			data: response.bookList.map((item: any) => ({
				id: item.bookId,
				title: item.bookName,
				description: item.introduction,
				coverImage: item.cover,
				playCount: item.viewCountDisplay,
				chapterCount: item.chapterCount,
			})),
		}, 200);
	} catch (error) {
		console.error("[DramaV2 Genre Details] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};

export const getDramaV2BatchDownload = async (c: Context) => {
	const lang = c.req.query("lang") || "in";
	const type = Number(c.req.query("type"));
	const { id } = c.req.param();

	if (!type || (type !== 1 && type !== 2)) {
		return c.json({ message: "Invalid type! Use 1 for Dramabox, 2 for Melolo" }, 400);
	}

	if (type === ProviderType.MELOLO) {
		return c.json({ message: "Batch download not available for Melolo" }, 404);
	}

	try {
		const dramaboxClient = createDramaboxClient({
			lang,
			batchDelayMs: 150,
			batchRetryDelayMs: 500,
			batchTokenResetDelayMs: 400,
		});

		const batch = await dramaboxClient.batchDownload(id);

		if (batch.length !== 0) {
			const data = {
				success: true,
				source: "dramabox",
				path: c.req.path,
				type: ProviderType.DRAMABOX,
				count: batch.length,
				data: batch.map((item: any) => ({
					chapterId: item.chapterId,
					chapterIndex: item.chapterIndex,
					chapterName: item.chapterName,
					streamUrl: item.videoPath,
				})),
			};
			return c.json(data, 200);
		}

		return c.json({ message: "Data not found!" }, 404);
	} catch (error) {
		console.error("[DramaV2 Batch Download] Error:", error);
		return c.json(
			{
				message: "Error from server!",
				error: serializeError(error),
			},
			500
		);
	}
};
