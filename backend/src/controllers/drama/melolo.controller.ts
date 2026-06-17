import { Context } from "hono";
import { MeloloHelper } from "../../lib/utils/meloloHelper";
import {
	transformMeloloItem,
	parsePaginationParams,
	ProviderType
} from "../../lib/utils/dramaPagination";
import { randomList } from "../../lib/utils/randomList";
import { serializeError } from "../../lib/errorHelper";

export const getMeloloBookmall = async (c: Context) => {
	const limitParam = c.req.query("limit");
	const offsetParam = c.req.query("offset");
	const parsedLimit = Number.parseInt(limitParam ?? "", 10);
	const parsedOffset = Number.parseInt(offsetParam ?? "", 10);
	const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 15;
	const safeOffset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
	const upstreamLimit = String(safeLimit + safeOffset);
	try {
		const [fetchLatest, fetchTrending] = await Promise.all([
			MeloloHelper.meloloBookmallLatest(upstreamLimit, "0"),
			MeloloHelper.meloloBookmallTrending(upstreamLimit, "0")
		]);

		if (fetchLatest.statusCode !== 200 || fetchTrending.statusCode !== 200) {
			return c.json({ message: "Error from server!" }, 502);
		}

		const latestBooks = fetchLatest.data?.data?.cell?.books ?? [];
		const trendingBooks = fetchTrending.data?.data?.cell?.books ?? [];
		const mergedBooks = [...latestBooks, ...trendingBooks];
		const pagedBooks: any = mergedBooks.slice(safeOffset, safeOffset + safeLimit);


		const data = {
			success: true,
			source: "melolo",
			path: c.req.path,
			count: pagedBooks.length,
			data: randomList(pagedBooks.map((item: any) => ({
				id: item.book_id,
				title: item.book_name,
				descriptions: item.abstract,
				coverImage: item.thumb_url,
				playCount: Number(item.read_count) === 0 ? null : item.read_count,
				chapterCount: Number(item.last_chapter_index)

			}))),
		};

		return c.json(data, 200);

	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};

export const getMeloloNewRelease = async (c: Context) => {
	const { limit, offset } = c.req.query()
	try {
		const response: any = await MeloloHelper.meloloBookmallLatest(limit, offset);
		if (response) {
			const books = response.data?.data?.cell?.books || []
			const data = {
				success: true,
				source: "melolo",
				path: c.req.path,
				count: books.length,
				data: randomList(books.map(transformMeloloItem)),
			};
			return c.json(data, 200)
		} else {
			return c.json({
				message: 'Data not found!'
			}, 404)
		}
	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
}

export const getMeloloRank = async (c: Context) => {
	const { limit, offset } = c.req.query()
	try {
		const response: any = await MeloloHelper.meloloBookmallTrending(limit, offset)
		if (response) {
			const books = response.data?.data?.cell?.books || []
			const data = {
				success: true,
				source: "melolo",
				path: c.req.path,
				count: books.length,
				data: randomList(books.map(transformMeloloItem)),
			};
			return c.json(data, 200)
		} else {
			return c.json({
				message: "Data not found!"
			}, 404)
		}
	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
}

export const getMeloloSearch = async (c: Context) => {
	const { query, limit, offset } = c.req.query();
	try {
		const response: any = await MeloloHelper.meloloSearch(query, offset, limit)
		if (response) {
			const searchData = response.data?.data?.search_data ?? []
			const books = searchData.flatMap((item: any) => (
				Array.isArray(item?.books) ? item.books : []
			))
			const data = {
				success: true,
				source: 'melolo',
				path: c.req.path,
				count: books.length,
				data: books.map((item: any) => ({
					id: item.book_id,
					title: item.book_name,
					descriptions: item.abstract,
					coverImage: item.thumb_url,
					playCount: Number(item.read_count) === 0 ? null : item.read_count,
					chapterCount: Number(item.last_chapter_index)
				}))
			}
			return c.json(data, 200)
		} else {
			return c.json({
				message: "Data not found!"
			}, 404)
		}

	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};

export const getMeloloSearchSuggest = async (c: Context) => {
	const { query, limit, offset } = c.req.query();
	try {
		const response: any = await MeloloHelper.meloloSearch(query, offset, limit)
		if (response) {
			const searchData = response.data?.data?.search_data ?? []
			const books = searchData.flatMap((item: any) => (
				Array.isArray(item?.books) ? item.books : []
			))
			const data = {
				success: true,
				source: 'melolo',
				path: c.req.path,
				count: books.length,
				data: books.map((item: any) => ({
					id: item.book_id,
					title: item.book_name,
					descriptions: item.abstract,
					coverImage: item.thumb_url,
					playCount: Number(item.read_count) === 0 ? null : item.read_count,
					chapterCount: Number(item.last_chapter_index)
				}))
			}
			return c.json(data, 200)
		} else {
			return c.json({
				message: "Data not found!"
			}, 404)
		}

	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};

export const getMeloloDetailSeries = async (c: Context) => {
	const { id } = c.req.param();
	try {
		const response: any = await MeloloHelper.meloloSeriesDetail(id)
		if (response) {
			const videoData = response.data?.data?.video_data || []
			const data = {
				success: true,
				source: "melolo",
				path: c.req.path,
				chapterCount: videoData.episode_cnt,
				data: {
					id: videoData.series_id,
					title: videoData.series_title,
					description: videoData.series_intro,
					coverImage: videoData.series_cover,
					playCount: videoData.series_play_cnt,
					chapterCount: videoData.episode_cnt,
					chapters: videoData.video_list.map((items: any) => ({
						chapterId: items.vid,
						chapterIndex: items.vid,
					})),
				},
			}
			return c.json(data, 200);
		} else {
			return c.json({ message: "Data not found!" }, 404);
		}
		// return c.json(response, 200) 
	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};


export const getMeloloStream = async (c: Context) => {
	const { id } = c.req.param();
	try {
		const response: any = await MeloloHelper.meloloVideoUrl(id)
		console.log(response)
		// if (response) {
		// 	const model = JSON.parse(response.data.raw.data.video_model)

		// 	const data = {
		// 		success: true,
		// 		source: 'melolo',
		// 		path: c.req.path,
		// 		data: {
		// 			id: response.data.video_id,
		// 			coverImage: model.big_thumbs[0].img_url,
		// 			chapterIndex: response.data.video_id,
		// 			streamUrl: response.data?.main_url,
		// 			qualities: [
		// 				{
		// 					quality: 720,
		// 					streamUrl: response.data?.main_url
		// 				}
		// 			]
		// 		}
		// 	};
		// 	return c.json(data, 200);
		// } else {
		// 	return c.json({ message: "Data not found!" }, 404);
		// }

		return c.json(response, 200)
	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};

export const getMeloloStreamChapter = async (c: Context) => {
	const { id, chapterIndex } = c.req.param();
	try {
		const response: any = await MeloloHelper.meloloVideoUrl(id)
		if (response) {
			const model = JSON.parse(response.data.raw.data.video_model)

			const data = {
				success: true,
				source: 'melolo',
				path: c.req.path,
				data: {
					id: response.data.video_id,
					coverImage: model.big_thumbs[0].img_url,
					chapterIndex: response.data.video_id,
					streamUrl: response.data?.main_url,
					qualities: [
						{
							quality: 720,
							streamUrl: response.data?.main_url
						}
					]
				}
			};
			return c.json(data, 200);
		} else {
			return c.json({ message: "Data not found!" }, 404);
		}

		// return c.json(model, 200)
	} catch (error) {
		console.log(error);
		return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
	}
};
