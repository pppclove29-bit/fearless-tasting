const PRESET_CATEGORIES = [
  '한식', '중식', '일식', '양식', '카페', '분식', '치킨', '피자',
  '고기', '해산물', '술집', '베이커리', '기타',
] as const;

const CATEGORY_SYNONYMS: Record<string, string> = {
  '커피전문점': '카페', '디저트': '카페', '디저트카페': '카페', '커피': '카페',
  '차,커피': '카페', '테마카페': '카페', '브런치': '카페',
  '중국요리': '중식', '중식당': '중식', '중국집': '중식',
  '일본식': '일식', '일본요리': '일식', '스시': '일식', '초밥': '일식',
  '돈까스': '일식', '라멘': '일식', '우동': '일식', '회': '일식',
  '패밀리레스토랑': '양식', '양식당': '양식', '스테이크': '양식', '파스타': '양식',
  '햄버거': '양식',
  '고깃집': '고기', '고기구이': '고기', '육류,고기': '고기', '고기뷔페': '고기',
  '갈비,삼겹살': '고기',
  '해물,생선': '해산물', '생선회': '해산물', '수산물': '해산물', '해물탕': '해산물',
  '주점': '술집', '요리주점': '술집', '와인바': '술집', '호프,요리주점': '술집',
  '포장마차': '술집', '맥주,호프': '술집', '양주,바': '술집', '이자카야': '술집',
  '빵,베이커리': '베이커리', '제과,베이커리': '베이커리', '빵집': '베이커리',
  '제과점': '베이커리',
  '떡볶이': '분식', '김밥': '분식',
};

const PRESETS_SET = new Set<string>(PRESET_CATEGORIES);

export function normalizeCategory(raw: string | null | undefined): string {
  if (!raw) return '기타';
  const trimmed = raw.trim();
  if (!trimmed) return '기타';
  if (PRESETS_SET.has(trimmed)) return trimmed;

  const parts = trimmed
    .split('>')
    .map((p) => p.trim())
    .filter((p) => p && p !== '음식점');

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (PRESETS_SET.has(part)) return part;
    if (CATEGORY_SYNONYMS[part]) return CATEGORY_SYNONYMS[part];
    for (const preset of PRESET_CATEGORIES) {
      if (preset !== '기타' && part.includes(preset)) return preset;
    }
    for (const synonym in CATEGORY_SYNONYMS) {
      if (part.includes(synonym)) return CATEGORY_SYNONYMS[synonym];
    }
  }

  return '기타';
}
