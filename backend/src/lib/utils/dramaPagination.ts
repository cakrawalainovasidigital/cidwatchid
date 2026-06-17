export interface DramaItem {
  id: string | number;
  title: string;
  description: string;
  coverImage: string;
  playCount: string | number | null;
  chapterCount: number | null;
  type: number;
}

export interface CombinedDramaResponse {
  success: boolean;
  source: string;
  path: string;
  count: number;
  data: DramaItem[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export const ProviderType = {
  DRAMABOX: 1,
  MELOLO: 2,
} as const;

function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function parsePaginationParams(
  pageParam: string | undefined,
  limitParam: string | undefined,
  defaultLimit: number = 15
): PaginationParams {
  const page = Number.parseInt(pageParam ?? "", 10);
  const limit = Number.parseInt(limitParam ?? "", 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : defaultLimit,
  };
}

export function transformDramaboxItem(item: any): DramaItem {
  return {
    id: item.bookId || item.id,
    title: item.bookName || item.name,
    description: item.introduction,
    coverImage: item.coverWap || item.cover,
    playCount: item.playCount,
    chapterCount: item.chapterCount,
    type: ProviderType.DRAMABOX,
  };
}

export function transformDramaboxListResponse(dramaboxRes: any): DramaItem[] {
  if (!dramaboxRes?.book || !Array.isArray(dramaboxRes.book)) return [];
  return dramaboxRes.book.map((item: any) => ({
    id: item.id,
    title: item.name,
    description: item.introduction,
    coverImage: item.cover,
    playCount: item.playCount,
    chapterCount: item.chapterCount,
    type: ProviderType.DRAMABOX,
  }));
}

export function transformMeloloItem(item: any): DramaItem {
  return {
    id: item.book_id,
    title: item.book_name,
    description: item.abstract,
    coverImage: item.thumb_url,
    playCount: Number(item.read_count) === 0 ? null : item.read_count,
    chapterCount: Number(item.last_chapter_index),
    type: ProviderType.MELOLO,
  };
}

export function paginateDramaboxData(
  dramaboxRes: any,
  page: number,
  limit: number
): DramaItem[] {
  if (!Array.isArray(dramaboxRes)) return [];

  const offset = calculateOffset(page, limit);
  const startIndex = offset;
  const endIndex = startIndex + limit;
  const paginatedDramabox = dramaboxRes.slice(startIndex, endIndex);

  return paginatedDramabox.map(transformDramaboxItem);
}

export function calculateMeloloFetchLimit(
  targetLimit: number,
  multiplier: number = 3
): number {
  return targetLimit * multiplier;
}

export function calculateNeededFromMelolo(
  currentCount: number,
  targetLimit: number
): number {
  return Math.max(0, targetLimit - currentCount);
}

export function calculateMeloloOffset(page: number, limit: number): number {
  return calculateOffset(page, limit);
}

export function sliceMeloloBooks(
  meloloBooks: any[],
  neededCount: number
): DramaItem[] {
  const paginatedMelolo = meloloBooks.slice(0, neededCount);
  return paginatedMelolo.map(transformMeloloItem);
}

export function combineAndShuffle(...arrays: DramaItem[][]): DramaItem[] {
  const combined = arrays.flat();
  return combined.sort(() => Math.random() - 0.5);
}

export function limitArray<T>(array: T[], maxCount: number): T[] {
  return array.slice(0, maxCount);
}

export function buildCombinedResponse(
  data: DramaItem[],
  path: string
): CombinedDramaResponse {
  return {
    success: true,
    source: "dramabox/melolo",
    path,
    count: data.length,
    data,
  };
}
