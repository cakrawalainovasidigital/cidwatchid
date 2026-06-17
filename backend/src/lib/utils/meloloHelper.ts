
const DEFAULT_HOST = "api.tmtreader.com"
const baseUrl = `https://${DEFAULT_HOST}`

const cellIds = {
	trending: "7450059162446200848",
	latest: "7470064000445710353",
}

const commonHeaders: Record<string, string> = {
	Host: DEFAULT_HOST,
	"X-Xs-From-Web": "false",
	"Age-Range": "8",
	"Sdk-Version": "2",
	"Passport-Sdk-Version": "50357",
	"X-Vc-Bdturing-Sdk-Version": "2.2.1.i18n",
	"User-Agent":
		"com.worldance.drama/49819 (Linux; U; Android 9; in; SM-N976N; Build/QP1A.190711.020;tt-ok/3.12.13.17)",
}

const commonParams: Record<string, string> = {
	iid: "7549249992780367617",
	device_id: "6944790948585719298",
	ac: "wifi",
	channel: "gp",
	aid: "645713",
	app_name: "Melolo",
	version_code: "49819",
	version_name: "4.9.8",
	device_platform: "android",
	os: "android",
	ssmix: "a",
	device_type: "SM-N976N",
	device_brand: "samsung",
	language: "in",
	os_api: "28",
	os_version: "9",
	openudid: "707e4ef289dcc394",
	manifest_version_code: "49819",
	resolution: "900*1600",
	dpi: "320",
	update_version_code: "49819",
	current_region: "ID",
	carrier_region: "ID",
	app_language: "id",
	sys_language: "in",
	app_region: "ID",
	sys_region: "ID",
	mcc_mnc: "46002",
	carrier_region_v2: "460",
	user_language: "id",
	time_zone: "Asia/Bangkok",
	ui_language: "in",
	cdid: "a854d5a9-b6cd-4de7-9c43-8310f5bf513c",
}


function toQueryString(params: Record<string, string>) {
	const usp = new URLSearchParams()
	for (const [k, v] of Object.entries(params)) usp.set(k, v)
	return usp.toString()
}

function generateRTicket() {
	// Bun & Node 19+ punya crypto.randomUUID()
	const uuid = crypto.randomUUID().replace(/-/g, "")
	const n = BigInt(`0x${uuid}`) >> 64n
	return n.toString()
}

function buildUrl(path: string, extraParams?: Record<string, string>) {
	const params = { ...commonParams, ...(extraParams ?? {}) }
	return `${baseUrl}${path}?${toQueryString(params)}`
}

async function safeJson(res: Response) {
	try {
		return await res.json()
	} catch {
		return null
	}
}
async function safeText(res: Response) {
	try {
		return await res.text()
	} catch {
		return ""
	}
}

type RawJsonResult =
	| { statusCode: number; data: any }
	| { statusCode: number; data: { error: string; rawText: string } }

async function requestRawJson(url: string, init: RequestInit): Promise<RawJsonResult> {
	const res = await fetch(url, init)
	const json = await safeJson(res)
	if (json !== null) return { statusCode: res.status, data: json }

	const text = await safeText(res)
	return {
		statusCode: res.status,
		data: { error: "Response is not a json", rawText: text },
	}
}

function upstreamErrorPayload(status: number, data: any) {
	return {
		error: "Upstream HTTP error",
		status,
		body: typeof data === "string" ? data : undefined,
	}
}

async function meloloBookmallCell(cell_id: string, limit = "15", offset = "0") {
	const url = buildUrl("/i18n_novel/bookmall/cell/change/v1/", {
		tab_scene: "3",
		tab_type: "0",
		limit,
		start_offset: offset,
		cell_id,
		_rticket: generateRTicket(),
	})

	return requestRawJson(url, {
		method: "GET",
		headers: { ...commonHeaders },
	})
}

async function meloloSearch(query: string, offset = "0", limit = "10") {
	const url = buildUrl("/i18n_novel/search/page/v1/", {
		query,
		limit,
		offset,
		_rticket: generateRTicket(),
	})

	return requestRawJson(url, {
		method: "GET",
		headers: { ...commonHeaders },
	})
}

async function meloloSeriesDetail(series_id: string) {
	const url = buildUrl("/novel/player/video_detail/v1/", {
		_rticket: generateRTicket(),
	})

	const headers = {
		...commonHeaders,
		"Content-Type": "application/json; charset=utf-8",
	}

	const body = {
		biz_param: {
			detail_page_version: 0,
			from_video_id: "",
			need_all_video_definition: false,
			need_mp4_align: false,
			source: 4,
			use_os_player: false,
			video_id_type: 1,
		},
		series_id: String(series_id),
	}

	return requestRawJson(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	})
}

async function meloloVideoModel(video_id: string) {
	const url = buildUrl("/novel/player/video_model/v1/", {
		_rticket: generateRTicket(),
	})

	const headers = {
		...commonHeaders,
		"Content-Type": "application/json; charset=utf-8",
	}

	const body = {
		biz_param: {
			detail_page_version: 0,
			device_level: 3,
			from_video_id: "",
			need_all_video_definition: true,
			need_mp4_align: false,
			source: 4,
			use_os_player: false,
			video_id_type: 0,
			video_platform: 3,
		},
		video_id: String(video_id),
	}

	return requestRawJson(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	})
}

async function meloloVideoUrl(video_id: string) {
	const model = await meloloVideoModel(video_id)
	if (model.statusCode !== 200) return model

	const baseResp = model.data?.BaseResp
	if (baseResp && baseResp.StatusCode !== 0 && baseResp.StatusCode != null) {
		return {
			statusCode: 400,
			data: { error: baseResp.StatusMessage || "Upstream base error" },
		}
	}

	const mainUrl = model.data?.data?.main_url
	return {
		statusCode: 200,
		data: { video_id: String(video_id), main_url: mainUrl, raw: model.data },
	}
}




export const MeloloHelper = {
	// core
	// buildUrl,
	// generateRTicket,
	meloloBookmallTrending: (limit = "15", offset = "0") => meloloBookmallCell(cellIds.trending, limit, offset),
	meloloBookmallLatest: (limit = "15", offset = "0") => meloloBookmallCell(cellIds.latest, limit, offset),
	meloloSearch,
	meloloSeriesDetail,
	meloloVideoModel,
	meloloVideoUrl,
}
