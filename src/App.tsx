import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Home, Search, BookOpen, Archive, Music, Music2, VolumeX, Volume2, VolumeOff, Loader2, Check, Tag, Bookmark, Trash2, Folder, Target, Lightbulb, Globe2, Gamepad2, Zap, Trophy, KeyRound, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, Clock, FileText, Hash } from "lucide-react";

type WikiPage = { pageid: number; title: string; extract?: string; fullurl?: string; thumbnail?: { source: string }; index?: number };
type ResultItem = { id: string; title: string; url: string; source: string; summary: string; image?: string; level: number };
type TocEntry = { number: string; heading: string; level: number; anchor: string };
type ArticleData = ResultItem & { toc: TocEntry[]; fullBody: string; categories: string[]; langlinks: { lang: string; langname: string; url: string }[] };
type Status = "idle" | "loading" | "success" | "error";
type Lang = { code: string; label: string; flag: string };
type Group = { id: string; name: string; icon: string; articles: SavedArticle[] };
type SavedArticle = { id: string; title: string; url: string; summary: string; image?: string; savedAt: number };

const PER_PAGE = 10;
const LANGS: Lang[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" }, { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ja", label: "日本語", flag: "🇯🇵" }, { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" }, { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" }, { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ru", label: "Русский", flag: "🇷🇺" }, { code: "th", label: "ไทย", flag: "🇹🇭" },
];
const wikiApi = (l: string) => `https://${l}.wikipedia.org/w/api.php`;
const DICT: Record<string, Record<string, string>> = {
  vi: { site: "WikiSearch", tag: "Tìm kiếm kiến thức trên Wikipedia, thiết kế trong thế giới pixel 2D.", ph: "Tìm kiếm trên Wikipedia...", sg: "Đang tìm...", sr: "Tìm kiếm", nr: "Không tìm thấy kết quả nào.", wi: "Wikipedia", bk: "Quay lại", tc: "Mục lục", ct: "Nội dung", sv: "Lưu", svd: "Đã lưu", st: 'Đã lưu "{t}"', svt: "Nhóm đã lưu", svdsc: "{g} nhóm · {a} bài viết", ng: "Chưa có nhóm nào.", na: "Chưa lưu bài nào", dg: "Xóa nhóm?", rmv: "Xóa", cat: "Thể loại", ol: "Ngôn ngữ khác", tl: "Đang chuyển đổi…", rw: "Đọc trên Wikipedia", oo: "Mở bài gốc", stg: "Lưu vào nhóm", sa: 'Lưu "{t}" vào:', cg: "Tạo nhóm mới", gn: "Tên nhóm mới...", cs: "Tạo & Lưu", cl: "Hủy", min: "phút đọc", wd: "từ", ec: "Không thể kết nối Wikipedia", ld: "Đang tải…", mo: "Bật nhạc", mf: "Tắt nhạc", um: "Bật tiếng", mu: "Tắt tiếng", LQ: "Đang tìm kiếm trên Wikipedia…", wr: "Wikipedia Results", ptxt: "Trang {page}/{total}", rtxt: "{n} kết quả", sqtxt: '"{q}"', delete: "Xóa" },
  en: { site: "WikiSearch", tag: "Search Wikipedia knowledge, redesigned in a pixel 2D world.", ph: "Search Wikipedia...", sg: "Searching...", sr: "Search", nr: "No results found.", wi: "Wikipedia", bk: "Back", tc: "Table of Contents", ct: "Contents", sv: "Save", svd: "Saved", st: 'Saved "{t}"', svt: "Saved Groups", svdsc: "{g} groups · {a} articles", ng: "No groups yet.", na: "No articles saved", dg: "Delete this group?", rmv: "Remove", cat: "Categories", ol: "Other languages", tl: "Translating…", rw: "Read on Wikipedia", oo: "Open original", stg: "Save to group", sa: 'Save "{t}" to:', cg: "Create new group", gn: "New group name...", cs: "Create & Save", cl: "Cancel", min: "min read", wd: "words", ec: "Cannot connect to Wikipedia", ld: "Loading…", mo: "Play music", mf: "Stop music", um: "Unmute", mu: "Mute", LQ: "Searching Wikipedia…", wr: "Wikipedia Results", ptxt: "Page {page}/{total}", rtxt: "{n} results", sqtxt: '"{q}"', delete: "Delete" },
  ja: { site: "WikiSearch", tag: "Wikipediaの知識を検索。ピクセル2Dの世界で再デザイン。", ph: "Wikipediaを検索...", sg: "検索中...", sr: "検索", nr: "結果が見つかりません。", wi: "ウィキペディア", bk: "戻る", tc: "目次", ct: "内容", sv: "保存", svd: "保存済み", st: '"{t}" を保存', svt: "保存グループ", svdsc: "{g} グループ · {a} 記事", ng: "グループがありません。", na: "保存記事なし", dg: "削除しますか？", rmv: "削除", cat: "カテゴリ", ol: "他の言語", tl: "翻訳中…", rw: "Wikipediaで読む", oo: "オリジナルを開く", stg: "グループに保存", sa: '"{t}" を保存:', cg: "新グループ作成", gn: "グループ名...", cs: "作成して保存", cl: "キャンセル", min: "分", wd: "語", ec: "Wikipediaに接続できません", ld: "読み込み中…", mo: "BGM再生", mf: "BGM停止", um: "ミュート解除", mu: "ミュート", LQ: "Wikipediaを検索中…", wr: "Wikipedia 結果", ptxt: "{page}/{total} ページ", rtxt: "{n} 件", sqtxt: '"{q}"', delete: "削除" },
  ko: { site: "WikiSearch", tag: "Wikipedia 지식 검색, 픽셀 2D 세계로 재디자인.", ph: "Wikipedia 검색...", sg: "검색 중...", sr: "검색", nr: "검색 결과가 없습니다.", wi: "위키백과", bk: "뒤로", tc: "목차", ct: "내용", sv: "저장", svd: "저장됨", st: '"{t}" 저장됨', svt: "저장된 그룹", svdsc: "{g} 그룹 · {a} 문서", ng: "그룹이 없습니다.", na: "저장된 문서 없음", dg: "삭제할까요?", rmv: "제거", cat: "카테고리", ol: "다른 언어", tl: "번역 중…", rw: "Wikipedia에서 읽기", oo: "원본 열기", stg: "그룹에 저장", sa: '"{t}" 저장:', cg: "새 그룹 만들기", gn: "새 그룹 이름...", cs: "만들기 & 저장", cl: "취소", min: "분 소요", wd: "단어", ec: "Wikipedia에 연결할 수 없습니다", ld: "검색 중…", mo: "BGM 켜기", mf: "BGM 끄기", um: "음소거 해제", mu: "음소거", LQ: "Wikipedia 검색 중…", wr: "Wikipedia 결과", ptxt: "{page}/{total} 페이지", rtxt: "{n}개 결과", sqtxt: '"{q}"', delete: "삭제" },
  zh: { site: "WikiSearch", tag: "搜索维基百科知识，以像素2D世界重新设计。", ph: "搜索维基百科...", sg: "搜索中...", sr: "搜索", nr: "未找到结果。", wi: "维基百科", bk: "返回", tc: "目录", ct: "内容", sv: "保存", svd: "已保存", st: '已保存 "{t}"', svt: "已保存的群组", svdsc: "{g} 个群组 · {a} 篇文章", ng: "暂无群组。", na: "未保存文章", dg: "删除此群组？", rmv: "删除", cat: "分类", ol: "其他语言", tl: "翻译中…", rw: "在维基百科上阅读", oo: "打开原文", stg: "保存到群组", sa: '将 "{t}" 保存到:', cg: "创建新群组", gn: "新群组名称...", cs: "创建并保存", cl: "取消", min: "分钟阅读", wd: "词", ec: "无法连接维基百科", ld: "正在搜索…", mo: "开启音乐", mf: "关闭音乐", um: "取消静音", mu: "静音", LQ: "正在搜索维基百科…", wr: "维基百科结果", ptxt: "第 {page}/{total} 页", rtxt: "{n} 条结果", sqtxt: '"{q}"', delete: "删除" },
};
const FB = DICT.en;
const SUGG: Record<string, string[]> = { vi: ["Việt Nam", "Pixel art", "React", "Anime", "Trí tuệ nhân tạo", "One Piece"], en: ["Vietnam", "Pixel art", "React", "Anime", "Artificial intelligence", "One Piece"], ja: ["ベトナム", "ピクセルアート", "React", "アニメ", "人工知能", "ワンピース"], ko: ["베트남", "픽셀 아트", "React", "애니메", "인공지능", "원피스"], zh: ["越南", "像素艺术", "React", "动漫", "人工智能", "海贼王"], fr: ["Vietnam", "Pixel art", "React", "Anime", "IA", "One Piece"], de: ["Vietnam", "Pixel-Art", "React", "Anime", "KI", "One Piece"], es: ["Vietnam", "Pixel art", "React", "Anime", "IA", "One Piece"], ru: ["Вьетнам", "Пиксель-арт", "React", "Аниме", "ИИ", "One Piece"], th: ["เวียดนาม", "พิกเซลอาร์ต", "React", "อนิเมะ", "AI", "วันพีซ"] };
const T = (k: string, c: string, v?: Record<string, string | number>): string => { let t = (DICT[c] || FB)[k] || FB[k] || k; if (v) for (const [kk, vv] of Object.entries(v)) t = t.replace(`{${kk}}`, String(vv)); return t; };
const GK = "wikisearch_groups";
const loadGroups = (): Group[] => { try { return JSON.parse(localStorage.getItem(GK) || "[]"); } catch { return []; } };
const persistGroups = (g: Group[]) => localStorage.setItem(GK, JSON.stringify(g));
const DEFAULT_GROUPS: Group[] = [{ id: "g1", name: "Yêu thích", icon: "bookmark", articles: [] }, { id: "g2", name: "Nghiên cứu", icon: "search", articles: [] }, { id: "g3", name: "Học tập", icon: "book", articles: [] }];
const clean = (v = "") => v.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const lvl = (t: string, i: number) => ((Array.from(t).reduce((s, c) => s + c.charCodeAt(0), 0) + i * 7) % 88) + 12;
const wc = (t: string) => t.split(/\s+/).filter(Boolean).length;
const rt = (t: string) => Math.max(1, Math.round(wc(t) / 200));
const parse = (body: string): { type: string; text: string; anchor?: string }[] => { const b: { type: string; text: string; anchor?: string }[] = []; for (const l of body.split("\n")) { const t = l.trim(); if (!t) continue; const m4 = t.match(/^====\s*(.+?)\s*====$/); if (m4) { b.push({ type: "h4", text: m4[1], anchor: m4[1].replace(/\s+/g, "_") }); continue; } const m3 = t.match(/^===\s*(.+?)\s*===$/); if (m3) { b.push({ type: "h3", text: m3[1], anchor: m3[1].replace(/\s+/g, "_") }); continue; } const m2 = t.match(/^==\s*(.+?)\s*==$/); if (m2) { b.push({ type: "h2", text: m2[1], anchor: m2[1].replace(/\s+/g, "_") }); continue; } b.push({ type: "p", text: t }); } return b; };
const detect = (): Lang => { const nav = navigator.languages?.[0] || navigator.language || "en"; const c = nav.split("-")[0].toLowerCase(); return LANGS.find((l) => l.code === c) || LANGS[1]; };

/* Group icon resolver */
const GROUP_ICONS: Record<string, typeof Bookmark> = { bookmark: Bookmark, search: Search, book: BookOpen, folder: Folder, target: Target, lightbulb: Lightbulb, globe: Globe2, gamepad: Gamepad2, zap: Zap, trophy: Trophy, key: KeyRound };
const getGroupIcon = (name: string) => GROUP_ICONS[name] || Folder;

/* API */
type SR = { items: ResultItem[]; totalHits: number };
const searchWiki = async (q: string, l: string, o = 0): Promise<SR> => {
  const sp = new URLSearchParams({ origin: "*", format: "json", action: "query", list: "search", srsearch: q, srlimit: String(PER_PAGE), sroffset: String(o), srinfo: "totalhits" });
  const sr = await fetch(`${wikiApi(l)}?${sp}`); if (!sr.ok) throw new Error("fail");
  const sd = await sr.json(); const sr2 = sd.query?.search || []; const th: number = sd.query?.searchinfo?.totalhits || 0;
  if (!sr2.length) return { items: [], totalHits: 0 };
  const ids = sr2.map((r: { pageid: number }) => r.pageid).join("|");
  const dp = new URLSearchParams({ origin: "*", format: "json", action: "query", pageids: ids, prop: "pageimages|extracts|info", exintro: "1", explaintext: "1", inprop: "url", pithumbsize: "600" });
  const dr = await fetch(`${wikiApi(l)}?${dp}`); const dd = await dr.json();
  const pages = (dd.query?.pages || {}) as Record<string, WikiPage>;
  const items: ResultItem[] = sr2.map((s: { pageid: number }, i: number) => { const p = pages[String(s.pageid)]; if (!p) return null; return { id: String(p.pageid), title: p.title, url: p.fullurl || `https://${l}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`, source: `${l}.wikipedia.org`, summary: clean(p.extract) || "", image: p.thumbnail?.source, level: lvl(p.title, o + i) }; }).filter(Boolean) as ResultItem[];
  return { items, totalHits: th };
};
const fetchArticle = async (item: ResultItem, l: string): Promise<ArticleData> => {
  const tp = new URLSearchParams({ origin: "*", format: "json", action: "parse", page: item.title, prop: "sections" });
  const tr = await fetch(`${wikiApi(l)}?${tp}`); const td = await tr.json();
  const rs: { number: string; line: string; level: string; anchor: string }[] = td.parse?.sections || [];
  const toc: TocEntry[] = [{ number: "", heading: "Đầu", level: 1, anchor: "top" }, ...rs.map((s) => ({ number: s.number, heading: s.line, level: parseInt(s.level), anchor: s.anchor }))];
  const qp = new URLSearchParams({ origin: "*", format: "json", action: "query", prop: "extracts|info|pageimages|categories|langlinks", titles: item.title, explaintext: "1", exsectionformat: "wiki", inprop: "url", pithumbsize: "1200", cllimit: "10", lllimit: "50" });
  const qr = await fetch(`${wikiApi(l)}?${qp}`); const qd = await qr.json();
  type FP = WikiPage & { categories?: { title: string }[]; langlinks?: { lang: string; langname: string; url: string; "*": string }[] };
  const [page] = Object.values((qd.query?.pages || {}) as Record<string, FP>);
  if (!page) return { ...item, toc: [], fullBody: "", categories: [], langlinks: [] };
  return { ...item, title: page.title || item.title, url: page.fullurl || item.url, summary: clean(page.extract) || item.summary, image: page.thumbnail?.source || item.image, toc, fullBody: page.extract || "", categories: (page.categories || []).map((c) => c.title.replace("Thể loại:", "").replace("Category:", "")), langlinks: (page.langlinks || []).map((l) => ({ lang: l.lang, langname: l.langname || l.lang, url: l.url || `https://${l.lang}.wikipedia.org/wiki/${encodeURIComponent(l["*"])}` })) };
};
const translateArticle = async (title: string, target: string): Promise<ArticleData | null> => {
  const tp = new URLSearchParams({ origin: "*", format: "json", action: "parse", page: title, prop: "sections" });
  const tr = await fetch(`${wikiApi(target)}?${tp}`); const td = await tr.json(); if (td.error) return null;
  const rs: { number: string; line: string; level: string; anchor: string }[] = td.parse?.sections || [];
  const toc: TocEntry[] = [{ number: "", heading: "Đầu", level: 1, anchor: "top" }, ...rs.map((s) => ({ number: s.number, heading: s.line, level: parseInt(s.level), anchor: s.anchor }))];
  const qp = new URLSearchParams({ origin: "*", format: "json", action: "query", prop: "extracts|info|pageimages|categories", titles: title, explaintext: "1", exsectionformat: "wiki", inprop: "url", pithumbsize: "1200", cllimit: "10" });
  const qr = await fetch(`${wikiApi(target)}?${qp}`); const qd = await qr.json();
  const pages = Object.values((qd.query?.pages || {}) as Record<string, WikiPage & { categories?: { title: string }[] }>); const page = pages[0];
  if (!page || (page.pageid as unknown as number) < 0) return null;
  return { id: String(page.pageid), title: page.title, url: page.fullurl || "", source: `${target}.wikipedia.org`, summary: clean(page.extract) || "", image: page.thumbnail?.source, level: lvl(page.title, 0), toc, fullBody: page.extract || "", categories: (page.categories || []).map((c) => c.title.replace(/^[^:]+:/, "")), langlinks: [] };
};

/* ═══ PIXEL WORLD ═══ */
const PW = () => (<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true"><div className="pixel-grid absolute inset-0" /><div className="cloud cloud-a" /><div className="cloud cloud-b" /><div className="pixel-sun" /><div className="terrain terrain-back" /><div className="terrain terrain-front" /><div className="runner"><span className="runner-head" /><span className="runner-body" /><span className="runner-leg left" /><span className="runner-leg right" /></div></div>);

/* ═══ MUSIC PLAYER ═══ */
const MusicPlayer = ({ L }: { L: string }) => {
  const [p, sp] = useState(false); const [m, sm] = useState(true); const [v, sv] = useState(false);
  const id = "sF80I-TQiW0";
  const tg = () => { if (!v) { sv(true); sp(true); sm(false); return; } sp(!p); };
  return (<>
    {v && <div className={`fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 transition-all duration-500 lg:bottom-8 ${p ? "translate-y-0 opacity-100" : "translate-y-4 opacity-80"}`}><div className="overflow-hidden border-4 border-[#311B56] bg-[#311B56] shadow-[6px_6px_0px_#311B56]"><iframe width="320" height="60" src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=${m ? 1 : 0}&loop=1&playlist=${id}&controls=0&showinfo=0&modestbranding=1&start=0`} allow="autoplay; encrypted-media" className="pointer-events-none" title="BGM" /></div></div>}
    <button onClick={tg} className={`fixed z-[61] flex h-11 w-11 items-center justify-center border-2 border-[#311B56] transition-all shadow-[3px_3px_0px_#311B56] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#311B56] lg:h-12 lg:w-12 ${p ? "bottom-24 left-1/2 -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-4 lg:translate-x-0 bg-[#311B56] text-[#FAF8F5]" : "bottom-24 right-4 lg:bottom-6 lg:right-4 bg-[#FAF8F5] text-[#311B56]"}`} title={p ? T("mf", L) : T("mo", L)}>
      {p ? (m ? <VolumeOff size={20} /> : <Music2 size={20} />) : <Music size={20} />}
    </button>
    {v && p && <button onClick={() => sm(!m)} className={`fixed z-[61] flex h-9 w-9 items-center justify-center border-2 border-[#311B56] bg-[#FAF8F5] shadow-[3px_3px_0px_#311B56] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#311B56] lg:right-20 lg:bottom-8 bottom-[11.5rem] right-4`} title={m ? T("um", L) : T("mu", L)}>
      {m ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>}
  </>);
};

/* ═══ SAVE MODAL ═══ */
const ICON_OPTIONS = ["bookmark", "folder", "target", "lightbulb", "globe", "gamepad", "zap", "trophy", "key"];
const ICON_LABELS: Record<string, string> = { bookmark: "Bookmark", folder: "Folder", target: "Target", lightbulb: "Idea", globe: "Globe", gamepad: "Game", zap: "Zap", trophy: "Trophy", key: "Key" };

const SaveModal = ({ groups, onSave, onClose, t, L }: { groups: Group[]; onSave: (id: string) => void; onClose: () => void; t: string; L: string }) => {
  const [nn, sn] = useState(""); const [ni, si] = useState("folder");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#311B56]/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[420px] border-4 border-[#311B56] bg-[#FAF8F5] shadow-[8px_8px_0px_#311B56] anim-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="border-b-4 border-[#311B56] bg-[#311B56] px-5 py-3 flex items-center gap-2">
          <Bookmark size={18} className="text-[#FAF8F5]" />
          <h3 className="font-mono text-sm font-black uppercase tracking-widest text-[#FAF8F5]">{T("stg", L)}</h3>
        </div>
        <p className="px-5 pt-4 font-mono text-xs font-bold text-[#311B56]/70">{T("sa", L, { t })}</p>
        <div className="max-h-[240px] overflow-y-auto px-5 py-3 scrollbar-hide">
          {groups.map((g) => {
            const GI = getGroupIcon(g.icon);
            return (
              <button key={g.id} onClick={() => onSave(g.id)} className="mb-2 flex w-full items-center gap-3 border-2 border-[#311B56] bg-[#FAF8F5] px-4 py-3 text-left font-mono text-sm font-bold shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#311B56] hover:text-[#FAF8F5] hover:shadow-none">
                <GI size={18} />
                <span className="flex-1">{g.name}</span>
                <span className="text-[0.6rem] uppercase opacity-50">{g.articles.length}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t-2 border-[#311B56]/20 px-5 py-3">
          <p className="mb-2 font-mono text-[0.6rem] font-black uppercase tracking-widest text-[#311B56]/50">{T("cg", L)}</p>
          <div className="flex gap-2">
            <select value={ni} onChange={(e) => si(e.target.value)} className="w-12 border-2 border-[#311B56] bg-[#FAF8F5] text-center shadow-[2px_2px_0px_#311B56] outline-none flex items-center justify-center">
              {ICON_OPTIONS.map((e) => <option key={e} value={e}>{ICON_LABELS[e]}</option>)}
            </select>
            <input value={nn} onChange={(e) => sn(e.target.value)} placeholder={T("gn", L)} className="flex-1 border-2 border-[#311B56] bg-[#FAF8F5] px-3 font-mono text-sm font-bold shadow-[2px_2px_0px_#311B56] outline-none placeholder:text-[#311B56]/30" />
          </div>
        </div>
        <div className="flex border-t-4 border-[#311B56]">
          <button onClick={onClose} className="flex-1 border-r-2 border-[#311B56] px-4 py-3 font-mono text-xs font-black uppercase tracking-widest transition-colors hover:bg-[#311B56]/10 flex items-center justify-center gap-2"><ArrowLeft size={14} />{T("cl", L)}</button>
          <button onClick={() => { if (nn.trim()) { const id = "g" + Date.now(); persistGroups([...groups, { id, name: nn.trim(), icon: ni, articles: [] }]); onSave(id); } }} disabled={!nn.trim()} className="flex-1 bg-[#311B56] px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-[#FAF8F5] transition-colors hover:bg-[#311B56]/80 disabled:opacity-40 flex items-center justify-center gap-2"><Bookmark size={14} />{T("cs", L)}</button>
        </div>
      </div>
    </div>
  );
};

/* ═══ SAVED VIEW ═══ */
const SavedView = ({ groups, setGroups, onOpen, onBack, L }: { groups: Group[]; setGroups: (g: Group[]) => void; onOpen: (item: ResultItem) => void; onBack: () => void; L: string }) => {
  const [exp, sexp] = useState<string | null>(null);
  const rm = (gid: string, aid: string) => { const u = groups.map((g) => g.id === gid ? { ...g, articles: g.articles.filter((a) => a.id !== aid) } : g); persistGroups(u); setGroups(u); };
  const dg = (gid: string) => { if (!confirm(T("dg", L))) return; persistGroups(groups.filter((g) => g.id !== gid)); setGroups(groups.filter((g) => g.id !== gid)); sexp(null); };
  const total = groups.reduce((s, g) => s + g.articles.length, 0);
  return (
    <div className="px-5 py-8 pb-28 md:px-10 md:py-12 lg:pb-14">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-6 border-b-4 border-[#311B56] pb-4">
          <button onClick={onBack} className="mb-3 flex items-center gap-2 border-2 border-[#311B56] bg-[#FAF8F5] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#311B56] transition-all hover:bg-[#311B56] hover:text-[#FAF8F5]"><ArrowLeft size={16} /> {T("bk", L)}</button>
          <h1 className="font-mono text-3xl font-black uppercase tracking-tight text-[#311B56] md:text-5xl flex items-center gap-3"><Archive size={32} /> {T("svt", L)}</h1>
          <p className="mt-2 font-mono text-sm font-bold text-[#311B56]/60">{T("svdsc", L, { g: groups.length.toString(), a: total.toString() })}</p>
        </div>
        {groups.length === 0 ? (
          <div className="border-4 border-dashed border-[#311B56]/40 bg-[#FAF8F5] p-10 text-center font-mono text-sm font-black uppercase tracking-widest text-[#311B56]/50"><Archive size={32} className="mx-auto mb-3 opacity-40" />{T("ng", L)}</div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const op = exp === g.id;
              const GI = getGroupIcon(g.icon);
              return (
                <div key={g.id} className="border-4 border-[#311B56] bg-[#FAF8F5] shadow-[5px_5px_0px_#311B56]">
                  <div className="flex items-center gap-3 border-b-2 border-[#311B56]/20 bg-[#311B56]/5 px-5 py-3">
                    <button onClick={() => sexp(op ? null : g.id)} className="flex flex-1 items-center gap-3 text-left">
                      <GI size={20} className="text-[#311B56]" />
                      <span className="font-mono text-sm font-black uppercase tracking-wider text-[#311B56]">{g.name}</span>
                      <span className="ml-auto font-mono text-xs font-bold text-[#311B56]/50">{g.articles.length}</span>
                      {op ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => dg(g.id)} className="text-[#311B56]/30 transition-colors hover:text-red-500" title={T("dg", L)}><Trash2 size={16} /></button>
                  </div>
                  {op && (
                    <div className="p-4">
                      {g.articles.length === 0 ? <p className="py-6 text-center font-mono text-xs font-bold text-[#311B56]/40">{T("na", L)}</p> : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {g.articles.map((a) => (
                            <div key={a.id} className="group flex gap-3 border-2 border-[#311B56] p-3 shadow-[3px_3px_0px_#311B56] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#311B56]">
                              {a.image && <img src={a.image} alt="" className="h-16 w-16 shrink-0 border-2 border-[#311B56] object-cover shadow-[2px_2px_0px_#311B56]" />}
                              <div className="min-w-0 flex-1">
                                <button onClick={() => onOpen({ id: a.id, title: a.title, url: a.url, source: "wikipedia.org", summary: a.summary, image: a.image, level: 0 })} className="text-left font-mono text-sm font-black uppercase tracking-wider text-[#311B56] transition-colors hover:text-[#A57CC6] line-clamp-1 flex items-center gap-1.5"><BookOpen size={14} /> {a.title}</button>
                                <p className="mt-1 line-clamp-2 font-mono text-[0.65rem] text-[#311B56]/60">{a.summary}</p>
                                <button onClick={() => rm(g.id, a.id)} className="mt-1 font-mono text-[0.6rem] font-bold text-[#311B56]/30 transition-colors hover:text-red-500 flex items-center gap-1"><Trash2 size={12} /> {T("rmv", L)}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══ LOADING ═══ */
const LQ = ({ L }: { L: string }) => (
  <div className="border-y-4 border-[#311B56] bg-[#FAF8F5] p-5 font-mono text-[#311B56]">
    <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
      <div className="flex items-center justify-between text-sm font-black uppercase tracking-[0.25em]">
        <span className="flex items-center gap-2"><Search size={16} /> {T("LQ", L)}</span>
        <Loader2 size={18} className="animate-spin" />
      </div>
      <div className="h-4 border-2 border-[#311B56] bg-[#FAF8F5]"><div className="loading-bar h-full bg-[#A57CC6]" /></div>
    </div>
  </div>
);

/* ═══ PAGINATION ═══ */
const Pag = ({ p, tp, onP }: { p: number; tp: number; onP: (n: number) => void }) => {
  if (tp <= 1) return null;
  const pages: (number | "...")[] = [];
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); } else { pages.push(1); if (p > 3) pages.push("..."); for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) pages.push(i); if (p < tp - 2) pages.push("..."); pages.push(tp); }
  const b = "flex h-10 w-10 md:h-11 md:w-11 items-center justify-center border-2 border-[#311B56] font-mono text-sm font-black transition-all";
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
      <button disabled={p <= 1} onClick={() => onP(p - 1)} className={`${b} bg-[#FAF8F5] text-[#311B56] shadow-[2px_2px_0px_#311B56] hover:bg-[#311B56] hover:text-[#FAF8F5] disabled:opacity-30 disabled:pointer-events-none w-auto px-3`}><ArrowLeft size={16} /></button>
      {pages.map((pg, i) => pg === "..." ? <span key={`d${i}`} className="flex h-10 w-8 items-center justify-center font-mono text-sm font-black text-[#311B56]/50">…</span> : <button key={pg} onClick={() => onP(pg)} className={`${b} ${pg === p ? "bg-[#311B56] text-[#FAF8F5] shadow-[3px_3px_0px_#311B56] -translate-y-0.5" : "bg-[#FAF8F5] text-[#311B56] shadow-[2px_2px_0px_#311B56] hover:bg-[#311B56] hover:text-[#FAF8F5]"}`}>{pg}</button>)}
      <button disabled={p >= tp} onClick={() => onP(p + 1)} className={`${b} bg-[#FAF8F5] text-[#311B56] shadow-[2px_2px_0px_#311B56] hover:bg-[#311B56] hover:text-[#FAF8F5] disabled:opacity-30 disabled:pointer-events-none w-auto px-3`}><ArrowRight size={16} /></button>
    </div>
  );
};

/* ═══ NAV DEFINITIONS ═══ */
const NAV_ITEMS = [
  { id: "home", Icon: Home, label: "Home" },
  { id: "search", Icon: Search, label: "Search" },
  { id: "article", Icon: BookOpen, label: "Article" },
  { id: "saved", Icon: Archive, label: "Saved" },
];

/* ═══ CHROME SHELL ═══ */
const Chrome = ({ children, active = "home", lang, setLang, onNav }: { children: React.ReactNode; active?: string; lang: Lang; setLang: (l: Lang) => void; onNav?: (id: string) => void }) => {
  const [lo, slo] = useState(false); const L = lang.code;
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#311B56] selection:bg-[#311B56]/20">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[90px] border-r-4 border-[#311B56] bg-[#FAF8F5] lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-6">
        <div className="flex h-11 w-11 items-center justify-center border-2 border-[#311B56] bg-[#311B56] text-[#FAF8F5] shadow-[3px_3px_0px_#311B56]"><Search size={20} /></div>
        <nav className="flex flex-col gap-3">
          {NAV_ITEMS.map(({ id, Icon }) => (
            <button key={id} onClick={() => onNav?.(id)} className={`flex h-11 w-11 items-center justify-center border-2 transition-all cursor-pointer ${active === id ? "border-[#311B56] bg-[#311B56] text-[#FAF8F5] shadow-[3px_3px_0px_#311B56] -translate-y-0.5" : "border-[#311B56] bg-[#FAF8F5] text-[#311B56] shadow-[2px_2px_0px_#311B56] hover:bg-[#311B56]/10"}`}>
              <Icon size={20} strokeWidth={2.2} />
            </button>
          ))}
        </nav>
        <div className="h-10 w-1.5 bg-[#311B56]/40" />
      </aside>
      <header className="fixed left-0 top-0 z-30 flex h-[68px] w-full items-center justify-between border-b-4 border-[#311B56] bg-[#FAF8F5]/95 px-4 backdrop-blur-sm lg:left-[90px] lg:w-[calc(100%-90px)] lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center bg-[#311B56] text-[#FAF8F5]"><Search size={16} /></div>
          <span className="font-mono text-sm font-black uppercase tracking-[0.25em] md:text-base">{T("site", L)}</span>
        </div>
        <div className="relative">
          <button onClick={() => slo(!lo)} className="flex items-center gap-2 border-2 border-[#311B56] bg-[#FAF8F5] px-3 py-2 font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#311B56]">
            <span className="text-base">{lang.flag}</span>
            <span className="hidden sm:inline">{lang.label}</span>
            <Globe2 size={14} />
          </button>
          {lo && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[340px] w-[200px] overflow-y-auto border-3 border-[#311B56] bg-[#FAF8F5] shadow-[6px_6px_0px_#311B56] scrollbar-hide">
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => { setLang(l); slo(false); }} className={`flex w-full items-center gap-3 px-4 py-3 text-left font-mono text-sm font-bold transition-colors hover:bg-[#311B56] hover:text-[#FAF8F5] ${lang.code === l.code ? "bg-[#311B56] text-[#FAF8F5]" : ""}`}>
                  <span className="text-lg">{l.flag}</span>{l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <MusicPlayer L={L} />
      <main className="min-h-screen pt-[68px] lg:ml-[90px]">{children}</main>
      <nav className="fixed bottom-5 left-1/2 z-50 flex h-[56px] w-[82%] max-w-[360px] -translate-x-1/2 items-center justify-around border-2 border-[#311B56] bg-[#FAF8F5] px-2 shadow-[4px_4px_0px_#311B56] lg:hidden">
        {NAV_ITEMS.map(({ id, Icon }) => (
          <button key={id} onClick={() => onNav?.(id)} className={`flex h-10 w-10 items-center justify-center border-2 transition-all cursor-pointer ${active === id ? "border-[#311B56] bg-[#311B56] text-[#FAF8F5] shadow-[2px_2px_0px_#311B56] -translate-y-0.5" : "border-[#311B56] bg-[#FAF8F5] text-[#311B56]"}`}>
            <Icon size={18} strokeWidth={2.2} />
          </button>
        ))}
      </nav>
    </div>
  );
};

/* ═══ HERO ═══ */
const Hero = ({ q, sq, onSearch, status, lang }: { q: string; sq: (v: string) => void; onSearch: (e?: FormEvent<HTMLFormElement>, ov?: string) => void; status: Status; lang: Lang }) => {
  const L = lang.code; const sugs = SUGG[L] || SUGG.en;
  return (
    <section className="relative flex min-h-[calc(100vh-68px)] items-center overflow-hidden border-b-4 border-[#311B56] px-5 pb-28 pt-10 md:px-10 md:pb-16">
      <PW />
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-7">
        <div className="max-w-[900px]">
          <div className="mb-3 flex items-center gap-3 font-mono text-xs font-black uppercase tracking-[0.35em] md:text-sm">
            <span className="h-3.5 w-3.5 bg-[#311B56] shadow-[3px_0_0_#A57CC6]" />
            {T("wi", L)} · {lang.flag} {lang.label}
          </div>
          <h1 className="font-mono text-[3.2rem] font-black uppercase leading-[0.9] tracking-tighter text-[#311B56] drop-shadow-[4px_4px_0px_rgba(49,27,86,0.2)] md:text-[6.5rem] lg:text-[8rem]">{T("site", L)}</h1>
          <p className="mt-5 max-w-[640px] font-mono text-[0.88rem] font-bold leading-relaxed tracking-wide text-[#311B56]/80 md:text-[1rem]">{T("tag", L)}</p>
        </div>
        <form onSubmit={onSearch} className="max-w-[860px]">
          <div className="flex flex-col border-4 border-[#311B56] bg-[#FAF8F5] shadow-[8px_8px_0px_#311B56] sm:flex-row">
            <input value={q} onChange={(e) => sq(e.target.value)} placeholder={T("ph", L)} className="min-h-[60px] flex-1 bg-[#FAF8F5] px-5 font-mono text-base font-black tracking-wider text-[#311B56] outline-none placeholder:text-[#311B56]/30 md:px-6 md:text-lg" />
            <button type="submit" disabled={status === "loading"} className="flex min-h-[60px] items-center justify-center gap-2.5 border-t-4 border-[#311B56] bg-[#311B56] px-6 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#FAF8F5] transition-all hover:bg-[#FAF8F5] hover:text-[#311B56] disabled:cursor-wait disabled:opacity-60 sm:border-l-4 sm:border-t-0">
              {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {status === "loading" ? T("sg", L) : T("sr", L)}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {(sugs as string[]).map((s) => (
              <button key={s} type="button" onClick={() => { sq(s); onSearch(undefined, s); }} className="border-2 border-[#311B56] bg-[#FAF8F5] px-3 py-1.5 font-mono text-[0.7rem] font-black uppercase tracking-widest shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#311B56] hover:text-[#FAF8F5] hover:shadow-none">
                {s}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
};

/* ═══ RESULTS ═══ */
const Results = ({ res, status, sq, onOpen, p, tp, th, onP, L }: { res: ResultItem[]; status: Status; sq: string; onOpen: (item: ResultItem) => void; p: number; tp: number; th: number; onP: (n: number) => void; L: string }) => {
  if (status === "idle") return null; if (status === "loading") return <LQ L={L} />;
  const sI = (p - 1) * PER_PAGE;
  return (
    <section className="px-5 py-8 pb-28 md:px-10 md:py-12 lg:pb-14">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-2 border-b-4 border-[#311B56] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.3em] text-[#311B56]/60 flex items-center gap-2"><Search size={14} /> {T("wr", L)}</p>
            <h2 className="mt-1 font-mono text-2xl font-black uppercase tracking-tight text-[#311B56] md:text-4xl">{status === "error" ? T("ec", L) : T("sqtxt", L, { q: sq })}</h2>
          </div>
          {th > 0 && <div className="flex items-center gap-3 font-mono text-xs font-black uppercase tracking-widest text-[#311B56]/70"><span className="border-2 border-[#311B56]/30 px-3 py-1.5 flex items-center gap-1.5"><FileText size={13} /> {T("rtxt", L, { n: th.toLocaleString() })}</span><span className="border-2 border-[#311B56]/30 px-3 py-1.5 flex items-center gap-1.5"><Hash size={13} /> {T("ptxt", L, { page: p.toString(), total: tp.toString() })}</span></div>}
        </div>
        {res.length === 0 ? (
          <div className="border-4 border-[#311B56] bg-[#FAF8F5] p-7 font-mono font-black uppercase shadow-[6px_6px_0px_#311B56] flex items-center gap-3"><Search size={20} className="opacity-40" /> {T("nr", L)}</div>
        ) : (
          <>
            <div className="grid gap-4">
              {res.map((item, i) => (
                <button key={item.id} onClick={() => onOpen(item)} className="group grid w-full grid-cols-1 border-3 border-[#311B56] bg-[#FAF8F5] text-left shadow-[5px_5px_0px_#311B56] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_#311B56] md:grid-cols-[100px_1fr_auto] anim-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-center justify-center border-b-3 border-[#311B56] bg-[#311B56] p-4 font-mono text-3xl font-black text-[#FAF8F5] md:border-b-0 md:border-r-3 md:text-4xl">{String(sI + i + 1).padStart(2, "0")}</div>
                  <div className="flex gap-4 p-4 md:p-5">
                    {item.image && <img src={item.image} alt="" className="hidden h-20 w-20 shrink-0 border-2 border-[#311B56] object-cover shadow-[3px_3px_0px_#311B56] sm:block" />}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#A57CC6]"><BookOpen size={12} /><span>{T("wi", L)}</span><span>·</span><span>LV {item.level}</span></div>
                      <h3 className="font-mono text-lg font-black leading-tight tracking-tight text-[#311B56] md:text-2xl">{item.title}</h3>
                      <p className="mt-2 line-clamp-2 font-mono text-xs font-bold leading-relaxed text-[#311B56]/70 md:text-sm">{item.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-t-3 border-[#311B56] px-5 py-3 md:border-l-3 md:border-t-0"><ArrowRight size={20} className="transition-transform group-hover:translate-x-1" /></div>
                </button>
              ))}
            </div>
            <Pag p={p} tp={tp} onP={onP} />
          </>
        )}
      </div>
    </section>
  );
};

/* ═══ ARTICLE ═══ */
const Article = ({ article, loading, onBack, lang, onTranslate, trans, onSave, isSv }: { article: ArticleData; loading: boolean; onBack: () => void; lang: Lang; onTranslate: (tl: string, tt: string) => void; trans: boolean; onSave: () => void; isSv: boolean }) => {
  const L = lang.code; const [st, sst] = useState(false);
  const tw = useMemo(() => wc(article.fullBody || article.summary), [article.fullBody, article.summary]);
  const et = useMemo(() => rt(article.fullBody || article.summary), [article.fullBody, article.summary]);
  const blocks = useMemo(() => parse(article.fullBody || article.summary), [article.fullBody, article.summary]);
  const av = useMemo(() => article.langlinks.filter((ll) => LANGS.some((l) => l.code === ll.lang)).map((ll) => ({ ...LANGS.find((l) => l.code === ll.lang)!, wt: ll.url.split("/wiki/").pop() || "" })).slice(0, 8), [article.langlinks]);
  const sc = useCallback((a: string) => { if (a === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); sst(false); return; } const el = document.getElementById(`h-${a}`); if (el) { const y = el.getBoundingClientRect().top + window.pageYOffset - 130; window.scrollTo({ top: y, behavior: "smooth" }); } sst(false); }, []);

  return (
    <div className="scanlines min-h-screen">
      <div className="sticky top-[68px] z-20 flex items-center justify-between border-b-4 border-[#311B56] bg-[#FAF8F5]/95 px-4 py-2.5 backdrop-blur-sm lg:px-8">
        <button onClick={onBack} className="flex items-center gap-2 border-2 border-[#311B56] bg-[#FAF8F5] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#311B56] hover:text-[#FAF8F5] hover:shadow-[1px_1px_0px_#311B56]"><ArrowLeft size={14} /> {T("bk", L)}</button>
        <div className="flex items-center gap-2">
          <button onClick={() => sst(!st)} className="flex items-center gap-1.5 border-2 border-[#311B56] bg-[#FAF8F5] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#311B56] hover:bg-[#311B56] hover:text-[#FAF8F5] lg:hidden"><BookOpen size={14} /> {T("tc", L)}</button>
          <button onClick={onSave} className={`flex items-center gap-1.5 border-2 border-[#311B56] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[1px] hover:translate-y-[1px] ${isSv ? "bg-[#311B56] text-[#FAF8F5]" : "bg-[#FAF8F5] text-[#311B56] hover:bg-[#311B56] hover:text-[#FAF8F5]"}`}>
            {isSv ? <Check size={14} /> : <Bookmark size={14} />}
            {isSv ? T("svd", L) : T("sv", L)}
          </button>
          <a href={article.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border-2 border-[#311B56] bg-[#311B56] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest text-[#FAF8F5] shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#FAF8F5] hover:text-[#311B56] hover:shadow-[1px_1px_0px_#311B56]"><ExternalLink size={14} /><span className="hidden sm:inline">{T("wi", L)}</span></a>
        </div>
      </div>

      <div className="relative border-b-4 border-[#311B56] bg-[#311B56]">
        {article.image ? (<div className="relative h-[240px] md:h-[360px]"><img src={article.image} alt={article.title} className="h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-t from-[#311B56] via-[#311B56]/50 to-[#311B56]/20" /><div className="absolute inset-0 bg-[linear-gradient(rgba(250,248,245,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(250,248,245,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" /></div>) : (<div className="pixel-castle relative h-[240px] md:h-[320px]"><div className="castle-sun" /><div className="castle-tower tower-a" /><div className="castle-tower tower-b" /><div className="castle-gate" /><div className="castle-ground" /></div>)}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 lg:p-10"><div className="mx-auto max-w-[1300px]">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 border border-[#A57CC6]/40 bg-[#311B56]/60 px-2.5 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#A57CC6] backdrop-blur-sm"><BookOpen size={11} /> {T("wi", L)}</span>
            <span className="flex items-center gap-1.5 border border-[#A57CC6]/40 bg-[#311B56]/60 px-2.5 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#A57CC6] backdrop-blur-sm">{lang.flag} {lang.label}</span>
            <span className="flex items-center gap-1.5 border border-[#A57CC6]/40 bg-[#311B56]/60 px-2.5 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#A57CC6] backdrop-blur-sm"><Clock size={11} /> ~{et} {T("min", L)}</span>
            <span className="flex items-center gap-1.5 border border-[#A57CC6]/40 bg-[#311B56]/60 px-2.5 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#A57CC6] backdrop-blur-sm"><FileText size={11} /> {tw.toLocaleString()} {T("wd", L)}</span>
          </div>
          <h1 className="max-w-[900px] font-mono text-[2rem] font-black uppercase leading-[0.95] tracking-tighter text-[#FAF8F5] drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)] md:text-[4rem] lg:text-[5rem]">{article.title}</h1>
          {loading && <div className="mt-3 inline-flex items-center gap-2 animate-pulse border-2 border-[#A57CC6] bg-[#311B56] px-4 py-2 font-mono text-xs font-black uppercase tracking-widest text-[#A57CC6]"><Loader2 size={14} className="animate-spin" /> {T("ld", L)}</div>}
        </div></div>
      </div>

      <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-8 md:py-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${st ? "fixed inset-0 z-40 flex items-end bg-[#311B56]/60 backdrop-blur-sm lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none" : "hidden lg:block"}`} onClick={(e) => { if (e.target === e.currentTarget) sst(false); }}>
            <div className="max-h-[70vh] w-full overflow-y-auto border-4 border-[#311B56] bg-[#FAF8F5] shadow-[6px_6px_0px_#311B56] scrollbar-hide lg:sticky lg:top-[140px] lg:max-h-[calc(100vh-180px)] lg:shadow-[8px_8px_0px_#311B56]">
              <div className="border-b-3 border-[#311B56] bg-[#311B56] px-4 py-3 font-mono text-sm font-black uppercase tracking-[0.25em] text-[#FAF8F5] flex items-center gap-2"><BookOpen size={16} /> {T("ct", L)}</div>
              <nav className="p-3">{article.toc.map((e, i) => { const ind = e.level <= 2 ? "" : e.level === 3 ? "ml-4" : "ml-8"; return (<button key={i} onClick={() => sc(e.anchor)} className={`${ind} mb-0.5 flex w-full items-baseline gap-2 rounded-sm px-2.5 py-1.5 text-left font-mono text-[0.75rem] font-black uppercase tracking-wider transition-all hover:bg-[#311B56] hover:text-[#FAF8F5] ${e.anchor === "top" ? "border-b border-[#311B56]/20 pb-2 mb-2" : ""}`}>{e.number && <span className="shrink-0 text-[#A57CC6] text-[0.65rem]">{e.number}</span>}<span>{e.heading}</span></button>); })}</nav>
              {article.categories.length > 0 && (<div className="border-t-2 border-[#311B56]/20 p-3"><p className="mb-2 flex items-center gap-1.5 font-mono text-[0.6rem] font-black uppercase tracking-[0.25em] text-[#311B56]/50"><Tag size={12} /> {T("cat", L)}</p><div className="flex flex-wrap gap-1">{article.categories.slice(0, 8).map((c, i) => (<span key={i} className="border border-[#311B56]/20 px-2 py-0.5 font-mono text-[0.55rem] font-bold text-[#311B56]/60">{c}</span>))}</div></div>)}
              {av.length > 0 && (<div className="border-t-2 border-[#311B56]/20 p-3"><p className="mb-2 flex items-center gap-1.5 font-mono text-[0.6rem] font-black uppercase tracking-[0.25em] text-[#311B56]/50"><Globe2 size={12} /> {T("ol", L)}</p><div className="flex flex-col gap-0.5">{av.map((ll) => (<button key={ll.code} disabled={trans} onClick={() => onTranslate(ll.code, decodeURIComponent(ll.wt))} className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left font-mono text-[0.65rem] font-bold transition-all hover:bg-[#311B56] hover:text-[#FAF8F5] disabled:opacity-40"><span className="text-sm">{ll.flag}</span>{ll.label}</button>))}</div></div>)}
            </div>
          </aside>
          <article className="min-w-0">
            {trans && <div className="mb-5 flex items-center gap-3 border-4 border-[#A57CC6] bg-[#A57CC6]/10 p-4 font-mono text-sm font-black uppercase tracking-widest text-[#311B56]"><Loader2 size={18} className="animate-spin" /> {T("tl", L)}</div>}
            <div className="border-4 border-[#311B56] bg-[#FAF8F5] shadow-[6px_6px_0px_rgba(49,27,86,0.12)]">
              {blocks.map((blk, i) => {
                if (blk.type === "h2") return (<div key={i} id={`h-${blk.anchor}`} className="scroll-mt-[140px] border-t-4 border-[#311B56] bg-[#311B56] px-6 py-4 first:border-t-0 flex items-center gap-2"><Hash size={18} className="text-[#FAF8F5]/50" /><h2 className="font-mono text-base font-black uppercase tracking-wider text-[#FAF8F5] md:text-lg">{blk.text}</h2></div>);
                if (blk.type === "h3") return (<div key={i} id={`h-${blk.anchor}`} className="scroll-mt-[140px] border-t-2 border-[#311B56]/30 bg-[#311B56]/8 px-6 py-3 md:px-8"><h3 className="font-sans text-[1.05rem] font-bold text-[#311B56] md:text-[1.1rem]">{blk.text}</h3></div>);
                if (blk.type === "h4") return (<div key={i} id={`h-${blk.anchor}`} className="scroll-mt-[140px] border-t border-[#311B56]/15 px-6 py-2.5 md:px-10"><h4 className="font-sans text-[0.95rem] font-semibold text-[#311B56]/90">{blk.text}</h4></div>);
                return (<p key={i} className="px-6 py-2 font-sans text-[0.92rem] font-medium leading-[1.85] text-[#311B56]/80 md:px-8 md:text-[0.95rem]">{blk.text}</p>);
              })}
            </div>
            <div className="mt-6 flex flex-col gap-4 border-4 border-[#311B56] bg-[#FAF8F5] p-5 shadow-[5px_5px_0px_rgba(49,27,86,0.15)] sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-mono text-sm font-black uppercase tracking-widest flex items-center gap-2"><ExternalLink size={16} /> {T("rw", L)}</p><p className="mt-1 break-all font-mono text-[0.65rem] font-bold text-[#311B56]/40">{article.url}</p></div>
              <a href={article.url} target="_blank" rel="noreferrer" className="flex w-max items-center gap-2 border-2 border-[#311B56] bg-[#311B56] px-5 py-2.5 font-mono text-xs font-black uppercase tracking-widest text-[#FAF8F5] shadow-[3px_3px_0px_#311B56] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#FAF8F5] hover:text-[#311B56] hover:shadow-[1px_1px_0px_#311B56]"><ExternalLink size={14} /> {T("oo", L)}</a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

/* ═══ MAIN APP ═══ */
export default function App() {
  const [q, sq] = useState(""); const [sQ, ssQ] = useState("");
  const [status, sSt] = useState<Status>("idle"); const [res, sRes] = useState<ResultItem[]>([]);
  const [th, sTh] = useState(0); const [pg, sPg] = useState(1);
  const [art, sArt] = useState<ArticleData | null>(null); const [aL, sAL] = useState(false); const [tr, sTr] = useState(false);
  const [lang, setLang] = useState<Lang>(() => detect()); const [cLang, setCLang] = useState<Lang>(LANGS[0]);
  const [view, setView] = useState<"search" | "saved">("search");
  const [grps, setGrps] = useState<Group[]>(() => { const l = loadGroups(); return l.length ? l : DEFAULT_GROUPS; });
  const [showSM, sSM] = useState(false); const [toast, setToast] = useState<string | null>(null);
  const tp = Math.min(Math.ceil(th / PER_PAGE), 50);
  const doS = useCallback(async (q: string, c: string, n: number) => { sSt("loading"); try { const d = await searchWiki(q, c, (n - 1) * PER_PAGE); sRes(d.items); sTh(d.totalHits); sSt("success"); } catch { sRes([]); sTh(0); sSt("error"); } }, []);
  const hS = useCallback(async (e?: FormEvent<HTMLFormElement>, ov?: string) => { e?.preventDefault(); const nq = (ov ?? q).trim(); if (!nq) return; ssQ(nq); sArt(null); sPg(1); await doS(nq, lang.code, 1); setTimeout(() => { document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }, [q, lang, doS]);
  const hP = useCallback(async (n: number) => { sPg(n); await doS(sQ, lang.code, n); document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [sQ, lang, doS]);
  const hO = useCallback(async (item: ResultItem) => { sArt({ ...item, toc: [], fullBody: "", categories: [], langlinks: [] }); sAL(true); setCLang(lang); window.scrollTo({ top: 0, behavior: "smooth" }); try { const d = await fetchArticle(item, lang.code); sArt(d); } catch { sArt({ ...item, toc: [{ number: "", heading: "Đầu", level: 1, anchor: "top" }], fullBody: item.summary, categories: [], langlinks: [] }); } finally { sAL(false); } }, [lang]);
  const hT = useCallback(async (tc: string, tt: string) => { sTr(true); try { const d = await translateArticle(decodeURIComponent(tt), tc); if (d) { setCLang(LANGS.find((l) => l.code === tc)!); const lp = new URLSearchParams({ origin: "*", format: "json", action: "query", prop: "langlinks", titles: d.title, lllimit: "50" }); const lr = await fetch(`${wikiApi(tc)}?${lp}`); const ld = await lr.json(); type LLP = { langlinks?: { lang: string; langname: string; url: string; "*": string }[] }; const [pg] = Object.values((ld.query?.pages || {}) as Record<string, LLP>); const ll = (pg?.langlinks || []).map((l) => ({ lang: l.lang, langname: l.langname || l.lang, url: l.url || `https://${l.lang}.wikipedia.org/wiki/${encodeURIComponent(l["*"])}` })); sArt({ ...d, langlinks: ll }); } } catch { /* noop */ } finally { sTr(false); window.scrollTo({ top: 0, behavior: "smooth" }); } }, []);
  useEffect(() => { if (sQ && status === "success" && !art) { doS(sQ, lang.code, 1); sPg(1); } }, [lang]); // eslint-disable-line
  const isSv = useMemo(() => art ? grps.some((g) => g.articles.some((a) => a.id === art.id)) : false, [art, grps]);
  const hSv = useCallback(() => sSM(true), []);
  const hSvG = useCallback((gid: string) => { if (!art) return; const sa: SavedArticle = { id: art.id, title: art.title, url: art.url, summary: art.summary, image: art.image, savedAt: Date.now() }; const u = grps.map((g) => g.id === gid && !g.articles.some((a) => a.id === sa.id) ? { ...g, articles: [...g.articles, sa] } : g); persistGroups(u); setGrps(u); sSM(false); setToast(art.title); setTimeout(() => setToast(null), 2500); }, [art, grps]);
  const nav = useCallback((id: string) => { if (id === "saved") { setView("saved"); sArt(null); } else if (id === "home" || id === "search") { setView("search"); sArt(null); window.scrollTo({ top: 0, behavior: "smooth" }); } }, []);
  const Toast = toast ? (<div className="fixed top-20 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 border-2 border-[#311B56] bg-[#FAF8F5] px-5 py-3 font-mono text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_#311B56] anim-fade-up"><Check size={14} /> {T("st", lang.code, { t: toast })}</div>) : null;
  const Wrap = (a: ArticleData) => (<><Article article={a} loading={aL} onBack={() => sArt(null)} lang={cLang} onTranslate={hT} trans={tr} onSave={hSv} isSv={isSv} />{Toast}</>);
  const resEl = sQ ? <div id="results"><Results res={res} status={status} sq={sQ} onOpen={hO} p={pg} tp={tp} th={th} onP={hP} L={lang.code} /></div> : null;
  if (showSM && art) return (<Chrome active="article" lang={cLang} setLang={setCLang} onNav={nav}><SaveModal groups={grps} onSave={hSvG} onClose={() => sSM(false)} t={art.title} L={lang.code} />{Wrap(art)}</Chrome>);
  if (art) return (<Chrome active="article" lang={cLang} setLang={setCLang} onNav={nav}>{Wrap(art)}</Chrome>);
  if (view === "saved") return (<Chrome active="saved" lang={lang} setLang={setLang} onNav={nav}><SavedView groups={grps} setGroups={setGrps} onOpen={hO} onBack={() => setView("search")} L={lang.code} /></Chrome>);
  return (<Chrome active={status === "idle" ? "home" : "search"} lang={lang} setLang={setLang} onNav={nav}><Hero q={q} sq={sq} onSearch={hS} status={status} lang={lang} />{resEl}{Toast}</Chrome>);
}
