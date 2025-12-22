export const DateMap = {
  "Jan ": "1월 ",
  "Feb ": "2월 ",
  "Mar ": "3월 ",
  "Apr ": "4월 ",
  "May ": "5월 ",
  "Jun ": "6월 ",
  "Jul ": "7월 ",
  "Aug ": "8월 ",
  "Sep ": "9월 ",
  "Oct ": "10월 ",
  "Nov ": "11월 ",
  "Dec ": "12월 ",
};

export function toKoreanMonth(str: string): string {
  const monthMap: Record<string, number> = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  const [mon, year] = str.split(" ");
  const month = monthMap[mon];

  if (str === "Present") {
    return "현재";
  }
  if (!month || !year) return str; // fallback
  return `${year}년 ${month}월`;
}

// countryKorean.ts
type CountryMap = Record<string, string>;

function normKey(s: string) {
  return s.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

const COUNTRY_MAP: CountryMap = {
  // Korea
  "south korea": "대한민국",
  "republic of korea": "대한민국",
  "korea republic of": "대한민국",
  "korea, republic of": "대한민국",
  rok: "대한민국",
  korea: "대한민국", // 애매하지만 서비스 성격상 보통 한국 의미로 쓰는 경우가 많아서 넣어둠
  "north korea": "북한",
  "seoul incheon metropolitan area": "대한민국 수도권",
  "democratic people's republic of korea": "북한",
  dprk: "북한",

  // Major 20-ish
  "united states": "미국",
  "united states of america": "미국",
  usa: "미국",
  "u s a": "미국",

  canada: "캐나다",
  mexico: "멕시코",
  brazil: "브라질",

  "united kingdom": "영국",
  uk: "영국",
  "u k": "영국",
  "great britain": "영국",
  england: "영국", // 엄밀히는 국가 아님(구성국)인데 입력으로 자주 들어와서 매핑

  france: "프랑스",
  germany: "독일",
  spain: "스페인",
  italy: "이탈리아",
  netherlands: "네덜란드",
  switzerland: "스위스",
  sweden: "스웨덴",
  norway: "노르웨이",
  denmark: "덴마크",

  russia: "러시아",
  china: "중국",
  japan: "일본",
  india: "인도",
  singapore: "싱가포르",

  australia: "호주",
  "new zealand": "뉴질랜드",

  israel: "이스라엘",
  "united arab emirates": "아랍에미리트",
  uae: "아랍에미리트",
};

export function countryEnToKo(input: string): string {
  const key = normKey(input);
  return COUNTRY_MAP[key] ?? input;
}

// koreaCityKorean.ts
type CityMap = Record<string, string>;

function normCityKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/[-_]/g, " ");
}

const KOREA_CITY_MAP: CityMap = {
  seoul: "서울",
  busan: "부산",
  pusan: "부산", // 구표기
  incheon: "인천",
  daegu: "대구",
  daejeon: "대전",
  gwangju: "광주",
  ulsan: "울산",
  sejong: "세종",

  suwon: "수원",
  goyang: "고양",
  yongin: "용인",
  seongnam: "성남",
  bucheon: "부천",
  anyang: "안양",
  ansan: "안산",
  hwaseong: "화성",
  pyeongtaek: "평택",
  gyeonggi: "경기도",

  jeju: "제주",
  "jeju city": "제주시",
  changwon: "창원",
  gimhae: "김해",
  cheongju: "청주",
  jeonju: "전주",
  pohang: "포항",

  california: "캘리포니아",
  "new york": "뉴욕",
  "new york city": "뉴욕시",
};

export function koreaCityEnToKo(input: string): string {
  const key = normCityKey(input);
  return KOREA_CITY_MAP[key] ?? input;
}

export function locationEnToKo(input: string): string {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return input;

  // 마지막 토큰을 국가로 가정
  const country = countryEnToKo(parts[parts.length - 1]);
  const cityParts = parts.slice(0, -1).map(koreaCityEnToKo);

  return [...cityParts, country].filter(Boolean).join(", ");
}

// koreaUniversityMap.ts
type UniMap = Record<string, string>;

function normUniKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[,()]/g, "")
    .replace(/\s+/g, " ");
}

const KOREA_UNIVERSITY_MAP: UniMap = {
  // SKY
  "seoul national university": "서울대학교",
  snu: "서울대학교",

  "korea university": "고려대학교",
  "korea univ": "고려대학교",
  ku: "고려대학교",

  "yonsei university": "연세대학교",
  "yonsei univ": "연세대학교",

  // KAIST / POSTECH
  kaist: "한국과학기술원(KAIST)",
  "korea advanced institute of science and technology": "한국과학기술원(KAIST)",

  postech: "포항공과대학교(POSTECH)",
  "pohang university of science and technology": "포항공과대학교(POSTECH)",

  // 주요 국립대
  "pusan national university": "부산대학교",
  "busan national university": "부산대학교",
  pnu: "부산대학교",

  "chonnam national university": "전남대학교",
  cnu: "충남대학교",

  "chungnam national university": "충남대학교",
  "chungbuk national university": "충북대학교",

  "kangwon national university": "강원대학교",
  "jeonbuk national university": "전북대학교",
  "gyeongsang national university": "경상국립대학교",

  // 수도권 주요 사립
  "sungkyunkwan university": "성균관대학교",
  skku: "성균관대학교",

  "hanyang university": "한양대학교",
  "hanyang univ": "한양대학교",

  "sogang university": "서강대학교",
  "sogang univ": "서강대학교",

  "ewha womans university": "이화여자대학교",
  "ewha women's university": "이화여자대학교",
  "ewha university": "이화여자대학교",

  "chung ang university": "중앙대학교",
  "chung-ang university": "중앙대학교",

  "kyung hee university": "경희대학교",
  "kyunghee university": "경희대학교",

  "dongguk university": "동국대학교",
  "hongik university": "홍익대학교",

  // 이공계 특화 / 특수대
  unist: "울산과학기술원(UNIST)",
  "ulsan national institute of science and technology": "울산과학기술원(UNIST)",

  gist: "광주과학기술원(GIST)",
  "gwangju institute of science and technology": "광주과학기술원(GIST)",

  dgist: "대구경북과학기술원(DGIST)",
  "daegu gyeongbuk institute of science and technology":
    "대구경북과학기술원(DGIST)",

  // 기타 자주 등장
  "ajou university": "아주대학교",
  "inha university": "인하대학교",
  "konkuk university": "건국대학교",
  "soongsil university": "숭실대학교",
  "kookmin university": "국민대학교",
};

export function koreaUniversityEnToKo(input: string): string {
  const key = normUniKey(input);
  return KOREA_UNIVERSITY_MAP[key] ?? input;
}
