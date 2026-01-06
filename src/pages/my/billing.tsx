import React, { useState } from "react";
import AppLayout from "@/components/layout/app";
import { useCredits } from "@/hooks/useCredit";
import RequestCreditModal from "@/components/Modal/RequestCreditModal";
import { useCompanyUserStore } from "@/store/useCompanyUserStore";
import { supabase } from "@/lib/supabase";
import { useCreditRequestHistory } from "@/hooks/useCreditRequestHistory";
import { dateToFormatLong } from "@/utils/textprocess";
import router from "next/router";
import { showToast } from "@/components/toast/toast";

const Billing = () => {
  const { credits } = useCredits();
  const { companyUser } = useCompanyUserStore();
  const { data: creditRequestHistory, refetch: refetchCreditRequestHistory } =
    useCreditRequestHistory(companyUser?.user_id);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onConfirm = async (credit_num: number) => {
    if (!companyUser?.user_id) return false;
    setIsLoading(true);
    const { error } = await supabase.from("credit_request").insert({
      user_id: companyUser.user_id,
      credit_num: credit_num,
    });
    refetchCreditRequestHistory();
    setIsLoading(false);
    return true;
  };

  console.log("creditRequestHistory ", creditRequestHistory);

  return (
    <AppLayout>
      <RequestCreditModal
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onConfirm={(credit_num: number) => onConfirm(credit_num)}
      />
      <div className="px-6 py-8 w-full">
        <div className="text-3xl font-hedvig font-light tracking-tight text-white">
          Credits
        </div>
        <div className="mt-8">
          <div className="rounded-3xl bg-white/5 p-6">
            <div className="flex flex-col items-start justify-center">
              <div className="text-lg text-hgray900 font-normal">
                Credit Usage
              </div>
              <div className="mt-4 w-full flex relative rounded-xl h-2 bg-accenta1/20">
                <div
                  className="w-full flex absolute left-0 top-0 rounded-xl h-2 bg-accenta1 transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      ((credits?.remain_credit ?? 0) /
                        (credits?.charged_credit ?? 1)) *
                        100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 w-full flex flex-row items-start justify-between">
                <div></div>
                <div>
                  <span className="text-accenta1">
                    {credits?.remain_credit}
                  </span>
                  <span className="text-hgray500">
                    {" "}
                    / {credits?.charged_credit}
                  </span>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="mt-4 text-accenta1 bg-accenta1/10 px-5 py-3 rounded-2xl cursor-pointer text-base font-normal"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Request More Credits"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <div className="text-base text-hgray900 font-light">
            Credit Request History (Latest 10)
          </div>

          <div className="mt-3">
            {/* header */}
            {/* <div className="grid grid-cols-12 gap-3 pb-3 text-sm text-white font-light">
              <div className="col-span-4">Credits</div>
              <div className="col-span-5">Requested at</div>
              <div className="col-span-3 text-right">Status</div>
            </div> */}

            {/* rows */}
            <div className="mt-3 flex flex-col gap-2">
              {creditRequestHistory?.length ? (
                creditRequestHistory.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center font-light gap-3 py-4 rounded-2xl hover:bg-white/5 transition-colors px-6 bg-white/5"
                  >
                    <div className="col-span-8 text-white/90">
                      <span className="text-accenta1 font-normal">
                        {item.credit_num}
                      </span>
                      <span className="text-hgray600 ml-1">Credits</span>
                    </div>

                    <div className="col-span-3 text-hgray900 text-sm truncate text-right pr-2">
                      {dateToFormatLong(item.created_at)}
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-normal ${
                          item.is_done
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {item.is_done ? "Done" : "Pending"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-hgray500 text-sm">
                  No requests yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Billing;
