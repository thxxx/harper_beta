// import AppLayout from "@/components/layout/app";
// import { useRouter } from "next/router";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useCompanyUserStore } from "@/store/useCompanyUserStore";
// import CandidateCard from "@/components/CandidatesList";
// import CandidateTable from "@/components/CandidatesListTable";
// import {
//   CandidateTypeWithConnection,
//   useSearchCandidates,
// } from "@/hooks/useSearchCandidates";
// import { useQueryDetail } from "@/hooks/useQueryDetail";
// import NotExistingPage from "@/components/layout/NotExistingPage";
// import TypewriterText from "@/components/TypeWriterText";
// import { supabase } from "@/lib/supabase";
// import { dateToFormatLong } from "@/utils/textprocess";
// import {
//   ArrowRight,
//   Clock,
//   Columns2,
//   Loader2,
//   Table,
//   Tags,
// } from "lucide-react";
// import {
//   getRandomLessResultMessage,
//   getRandomNoResultMessage,
// } from "@/utils/constantkeys";
// import { useMessages } from "@/i18n/useMessage";
// import { logger } from "@/utils/logger";
// import { useSettingStore } from "@/store/useSettingStore";
// import CandidateViews from "@/components/CandidateViews";

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// const MAX_PREFETCH_PAGES = 20; // (A) safety cap: auto-prefetch up to 20 pages (200 results if 10/page)

// export default function Result() {
//   const router = useRouter();
//   const { id, page } = router.query;
//   const queryId = typeof id === "string" ? id : undefined;

//   const { companyUser } = useCompanyUserStore();
//   const userId = companyUser?.user_id;

//   const [isFirst, setIsFirst] = useState(false);
//   const { viewType, setViewType } = useSettingStore();

//   const { m } = useMessages();

//   const { data: queryItem, isLoading: isQueryDetailLoading } =
//     useQueryDetail(queryId);

//   const ready = !!userId && !!queryId && !!queryItem?.query_id;

//   useEffect(() => {
//     const handleBeforeUnload = (e: BeforeUnloadEvent) => {
//       e.preventDefault();
//       e.returnValue = ""; // ⚠️ 이게 있어야 브라우저가 경고를 띄움
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);
//     return () => window.removeEventListener("beforeunload", handleBeforeUnload);
//   }, []);

//   // URL에서 page 읽기 (0-based)
//   const pageIdxRaw = useMemo(() => {
//     const raw = Array.isArray(page) ? page[0] : page;
//     const n = raw == null ? 0 : parseInt(String(raw), 10);
//     return Number.isFinite(n) ? n : 0;
//   }, [page]);

//   const scrollToTop = useCallback(() => {
//     const el = document.getElementById("app-scroll");
//     if (el) el.scrollTo({ top: 0, left: 0, behavior: "auto" });
//     else window.scrollTo({ top: 0, left: 0, behavior: "auto" }); // fallback
//   }, []);

//   const setPageInUrl = useCallback(
//     (nextIdx: number, mode: "push" | "replace" = "push") => {
//       const method = mode === "push" ? router.push : router.replace;
//       scrollToTop();

//       method(
//         {
//           pathname: router.pathname,
//           query: { ...router.query, page: String(nextIdx) },
//         },
//         undefined,
//         { shallow: true, scroll: false }
//       );
//     },
//     [router]
//   );

//   // URL page 값 정규화 (음수/NaN -> 0) + (A) 상한 적용
//   const pageIdx = useMemo(() => {
//     const normalized = pageIdxRaw >= 0 ? pageIdxRaw : 0;
//     return clamp(normalized, 0, MAX_PREFETCH_PAGES);
//   }, [pageIdxRaw]);

//   // (A) 사용자가 page=999 같은 걸 넣었으면 상한으로 URL 교정 (replace 권장)
//   useEffect(() => {
//     if (!router.isReady) return;

//     const normalized = pageIdxRaw >= 0 ? pageIdxRaw : 0;
//     const capped = clamp(normalized, 0, MAX_PREFETCH_PAGES);

//     if (pageIdxRaw !== capped) {
//       // setPageInUrl(capped, "replace");
//     }
//   }, [router.isReady, pageIdxRaw, setPageInUrl]);

//   // 서버에 실제로 저장된 마지막 페이지 idx 확인 (URL이 너무 앞서가면 줄이기)
//   const checkLastPageIdx = useCallback(async () => {
//     if (!queryId) return 0;
//     const { data, error } = await supabase
//       .from("query_pages")
//       .select("page_idx")
//       .eq("query_id", queryId)
//       .order("page_idx", { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     if (error) {
//       // 에러면 일단 0으로 fallback (원하면 toast/log 추가)
//       return 0;
//     }
//     return data?.page_idx ?? 0;
//   }, [queryId]);

//   // URL page가 서버 마지막 페이지보다 크면 서버 마지막으로 교정
//   // (이건 "미리 다 땡긴다" 정책과 충돌할 수 있어서,
//   //  server에 page row가 생기는 타이밍에 맞춰서만 동작하게 'ready' 이후로 제한)
//   useEffect(() => {
//     if (!ready) return;
//     if (!queryId) return;

//     (async () => {
//       const lastPageIdx = await checkLastPageIdx();
//       // URL이 서버보다 앞서면 서버 기준으로 줄임
//       if (pageIdx > lastPageIdx) {
//         // setPageInUrl(lastPageIdx, "replace");
//       }
//     })();
//   }, [ready, queryId, pageIdx, checkLastPageIdx, setPageInUrl]);

//   const {
//     data,
//     isLoading,
//     fetchNextPage,
//     hasNextPage,
//     isFetchingNextPage,
//     runMoreSearch,
//   } = useSearchCandidates(userId, queryId, ready);

//   useEffect(() => {
//     if (
//       queryItem &&
//       queryItem.raw_input_text &&
//       !queryItem.thinking &&
//       !queryItem.status
//     ) {
//       setIsFirst(true);
//     }
//   }, [queryItem]);

//   const pages = data?.pages ?? [];

//   // (B) ensure target page loaded by sequentially fetching until we have it (or can't)
//   const ensuringRef = useRef(false);

//   const ensurePageLoaded = useCallback(
//     async (targetIdx: number) => {
//       let len = data?.pages?.length ?? 0;

//       // 이미 충분히 로드되어 있으면 끝
//       if (len > targetIdx) return;

//       while (len <= targetIdx) {
//         if (!hasNextPage) break;

//         const res = await fetchNextPage();
//         const nextLen = res.data?.pages?.length ?? len;

//         // 안전장치: 더 이상 늘지 않으면 중단
//         if (nextLen <= len) break;

//         len = nextLen;
//       }
//     },
//     [data?.pages?.length, fetchNextPage, hasNextPage]
//   );

//   useEffect(() => {
//     if (!ready) return;
//     if (pageIdx <= 0) return;
//     if (ensuringRef.current) return;

//     ensuringRef.current = true;
//     ensurePageLoaded(pageIdx).finally(() => {
//       ensuringRef.current = false;
//     });
//   }, [ready, pageIdx, ensurePageLoaded]);

//   if (!queryItem && !isQueryDetailLoading)
//     return (
//       <AppLayout>
//         <NotExistingPage />
//       </AppLayout>
//     );

//   if (!queryId) return <AppLayout>Loading...</AppLayout>;

//   const current = pages[pageIdx];
//   const items = current?.items ?? [];

//   const pageReady = pageIdx < pages.length;

//   const canPrev = pageIdx > 0;

//   // canNext:
//   // - 이미 로드된 다음 page가 있거나
//   // - 아직 없지만 서버에 다음 page가 있음(hasNextPage)
//   const canNext = pageIdx + 1 < pages.length || !!hasNextPage;

//   const prevPage = () => {
//     if (!canPrev) return;
//     setPageInUrl(pageIdx - 1, "push");
//   };

//   const nextPage = async () => {
//     // 다음 page가 이미 로드된 상태면 그냥 이동
//     if (pageIdx + 1 < pages.length) {
//       setPageInUrl(pageIdx + 1, "push");
//       return;
//     }

//     // 아직 로드 안 됐으면: (B) 순차 fetch로 한 번 늘리고 이동
//     if (!hasNextPage || isFetchingNextPage) return;

//     const res = await fetchNextPage();
//     const newCount = res.data?.pages?.length ?? pages.length;

//     if (newCount > pages.length) {
//       setPageInUrl(pageIdx + 1, "push");
//     }
//   };

//   const isNoResultAtall =
//     pageIdx === 0 &&
//     items.length === 0 &&
//     !isLoading &&
//     (queryItem?.retries ?? 1) <= 0;

//   const isLessResultThan10 =
//     pageIdx === 0 &&
//     items.length !== 0 &&
//     items.length < 10 &&
//     !isLoading &&
//     (queryItem?.retries ?? 1) <= 0;

//   const isLessSatisfyingThan5 =
//     pageIdx === 0 &&
//     items.length === 10 &&
//     (queryItem?.recommendation === "no" || !queryItem?.recommendation) &&
//     !isLoading &&
//     (queryItem?.retries ?? 1) <= 0;

//   logger.log("queryItem?.recommendation ", queryItem?.recommendation);
//   logger.log(
//     "queryItem?.recommendation ",
//     isLessSatisfyingThan5,
//     pageIdx,
//     items.length,
//     isLoading,
//     (queryItem?.retries ?? 1) <= 0
//   );

//   const isLessThan10 = items.length < 10 && !isLoading;

//   return (
//     <AppLayout>
//       <div
//         className={`w-full ${
//           viewType === "table" ? "px-0" : "px-0"
//         } transition-all duration-200`}
//       >
//         {queryItem && (
//           <>
//             <div className="w-full px-0 py-4 flex flex-row items-center justify-between">
//               <div className="text-sm text-hgray600 font-normal flex flex-row items-center justify-start gap-4">
//                 <div>
//                   {queryItem.company_users ? (
//                     <>By {queryItem.company_users.name}</>
//                   ) : (
//                     ""
//                   )}
//                 </div>
//                 {queryItem.created_at ? (
//                   <div className="flex flex-row items-center justify-start gap-1 text-xs">
//                     <Clock className="w-3 h-3" />{" "}
//                     {dateToFormatLong(queryItem.created_at)}
//                   </div>
//                 ) : (
//                   ""
//                 )}
//               </div>
//             </div>
//             <div className="w-full px-0 pt-2 pb-4 flex flex-col gap-1">
//               <div className="text-2xl font-normal">
//                 {queryItem.query_keyword}
//               </div>
//               <div className="text-base font-normal text-hgray900">
//                 {queryItem.raw_input_text}
//               </div>
//               <TypewriterText
//                 animate={isFirst}
//                 className="font-light text-base mt-2 text-hgray800"
//                 text={queryItem.thinking}
//               />
//               {queryItem.criteria && queryItem.criteria.length > 0 && (
//                 <div className="flex flex-row items-end justify-between mb-2">
//                   <div className="text-sm text-hgray900 mt-4 flex flex-col gap-2">
//                     <div className="font-hedvig flex flex-row items-center justify-start gap-1">
//                       <Tags className="w-4 h-4" strokeWidth={1.6} /> Criteria
//                     </div>
//                     <div className="flex flex-row gap-2">
//                       {queryItem.criteria.map((item) => {
//                         return (
//                           <span
//                             key={item}
//                             className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-hgray900"
//                           >
//                             {item}
//                           </span>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   {/* <div className="w-[25%] flex flex-row items-center justify-between mt-2">
//                     <div></div>
//                     <div className="flex flex-row items-center justify-start gap-2">
//                       <Tooltips text="Table view">
//                         <button
//                           className={`cursor-pointer p-1.5 rounded-sm hover:bg-white/10 transition-all duration-200 ${
//                             viewType === "table" ? "bg-white/10" : ""
//                           }`}
//                           onClick={() => changeViewType("table")}
//                         >
//                           <Table className="w-4 h-4" strokeWidth={1.6} />
//                         </button>
//                       </Tooltips>
//                       <Tooltips text="Card view">
//                         <button
//                           className={`cursor-pointer p-1.5 rounded-sm hover:bg-white/10 transition-all duration-200 ${
//                             viewType === "card" ? "bg-white/10" : ""
//                           }`}
//                           onClick={() => changeViewType("card")}
//                         >
//                           <Columns2 className="w-4 h-4" strokeWidth={1.6} />
//                         </button>
//                       </Tooltips>
//                     </div>
//                   </div> */}
//                 </div>
//               )}
//               {isLoading && (
//                 <div className="text-sm font-light mt-4 text-hgray900 flex flex-row gap-2 items-center">
//                   <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
//                   <div className="animate-textGlow">{queryItem.status}</div>
//                 </div>
//               )}
//             </div>
//           </>
//         )}
//         <CandidateViews items={items} userId={userId} queryItem={queryItem} />
//         {/* pageReady가 false면: target page까지 prefetch 중 */}
//         {/* {pageReady &&
//           !isLoading &&
//           viewType === "table" &&
//           items.length > 0 && (
//             <div className="w-full mt-4">
//               <div className="grid grid-cols-12 gap-4 text-sm text-hgray800 font-normal bg-white/5 py-2 px-4 rounded-t-md border border-white/5">
//                 <div className="col-span-4">Person</div>
//                 <div className="col-span-8 flex flex-row items-center justify-start gap-2">
//                   <div className="w-[260px]">Criteria</div>
//                   <div className="w-full">Thinking</div>
//                 </div>
//               </div>
//               <div className="border-x border-white/5">
//                 {items.map((c: any) => (
//                   <CandidateTable
//                     key={c?.id}
//                     c={c as CandidateTypeWithConnection}
//                     userId={userId}
//                     queryItem={queryItem}
//                   />
//                 ))}
//               </div>
//             </div>
//           )}

//         {pageReady && !isLoading && viewType === "card" && items.length > 0 && (
//           <div className="w-full space-y-2 mt-4">
//             <div className="space-y-4">
//               {items.map((c: any) => (
//                 <CandidateCard
//                   key={c?.id}
//                   c={c as CandidateTypeWithConnection}
//                   userId={userId}
//                   queryItem={queryItem}
//                 />
//               ))}
//             </div>
//           </div>
//         )} */}

//         <div className="w-full px-4 flex flex-col gap-1 items-start justify-start py-4 text-[15px] text-hgray900 ">
//           {/* {pageReady && !isLoading && !isNoResultAtall && (
//           <div className="">No results.</div>
//         )} */}
//           {isLessSatisfyingThan5 && (
//             <div className="flex flex-col gap-2 items-start justify-start mt-12">
//               {queryItem?.message
//                 ? queryItem?.message
//                 : "모든 조건을 만족하는 사람을 충분히 찾지 못했어요. 한번 더 실행하면 조건에 해당하는 사람을 더 찾을 수 있어요."}{" "}
//               <span
//                 onClick={() => runMoreSearch()}
//                 className="cursor-pointer hover:underline underline-offset-2 mt-4 text-accenta1 text-[15px] flex flex-row gap-0 items-center justify-start"
//               >
//                 더 찾아보기 <ArrowRight strokeWidth={1.4} size={16} />
//               </span>
//             </div>
//           )}
//           {isNoResultAtall && (
//             <div className="flex flex-col gap-2 items-start justify-start">
//               {queryItem?.message
//                 ? queryItem?.message
//                 : getRandomNoResultMessage()}{" "}
//               {/* {getRandomNoResultMessage()}{" "} */}
//               <span
//                 onClick={() => runMoreSearch()}
//                 className="cursor-pointer hover:underline underline-offset-2 mt-4 text-accenta1 text-[15px] flex flex-row gap-0 items-center justify-start"
//               >
//                 더 찾아보기 <ArrowRight strokeWidth={1.4} size={16} />
//               </span>
//             </div>
//           )}
//           {isLessResultThan10 && (
//             <div className="mt-20 flex flex-col gap-2 items-start justify-start">
//               {queryItem?.message
//                 ? queryItem?.message
//                 : getRandomLessResultMessage()}{" "}
//               <span
//                 onClick={() => runMoreSearch()}
//                 className="cursor-pointer hover:underline underline-offset-2 mt-4 text-accenta1 text-[15px] flex flex-row gap-0 items-center justify-start"
//               >
//                 더 찾아보기 <ArrowRight strokeWidth={1.4} size={16} />
//               </span>
//             </div>
//           )}
//         </div>

//         {!isQueryDetailLoading &&
//           !isLoading &&
//           !isNoResultAtall &&
//           !isLessResultThan10 &&
//           isLessThan10 && (
//             <div className="mt-10 w-full flex flex-col gap-2 items-start justify-start text-[15px] text-hgray700 text-left pl-4">
//               추가 결과가 존재하지 않습니다.
//             </div>
//           )}

//         {!isQueryDetailLoading &&
//           !isLoading &&
//           !isNoResultAtall &&
//           !isLessResultThan10 &&
//           !isLessThan10 && (
//             <div className="flex items-center justify-center w-full py-16 flex-col">
//               <div className="text-sm text-white">
//                 Page {pageIdx + 1}
//                 {isFetchingNextPage ? " (loading...)" : ""}
//                 {pageIdxRaw > MAX_PREFETCH_PAGES ? (
//                   <span className="ml-2 text-xgray400">
//                     (capped to {MAX_PREFETCH_PAGES + 1})
//                   </span>
//                 ) : null}
//               </div>

//               <div className="flex items-center justify-center gap-1 flex-row mt-2">
//                 <button
//                   type="button"
//                   onClick={prevPage}
//                   disabled={!canPrev}
//                   className={`flex items-center justify-center px-8 minw-16 h-16 rounded-sm border border-xgray400 hover:opacity-90 ${
//                     canPrev ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
//                   }`}
//                 >
//                   Previous
//                 </button>

//                 <button
//                   type="button"
//                   onClick={nextPage}
//                   disabled={!canNext || isFetchingNextPage}
//                   className={`flex items-center justify-center px-8 minw-16 h-16 bg-accenta1 text-black rounded-sm hover:opacity-90 ${
//                     canNext && !isFetchingNextPage
//                       ? "cursor-pointer"
//                       : "opacity-40 cursor-not-allowed"
//                   }`}
//                 >
//                   <div>Search next 10 more</div>
//                 </button>
//               </div>
//             </div>
//           )}
//       </div>
//     </AppLayout>
//   );
// }
