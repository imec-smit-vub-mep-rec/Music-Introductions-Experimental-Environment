"use client";

import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { getProlificData } from "@/lib/session";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function AttentionCheckFailedScreen() {
  const [prolificData, setProlificData] = useState<{
    isProlificSession: boolean;
    prolific_pid?: string;
    prolific_study_id?: string;
    prolific_session_id?: string;
  } | null>(null);

  // Get Prolific data from session or separate storage (only on mount)
  useEffect(() => {
    const data = getProlificData();
    setProlificData(data);
  }, []);

  const isProlificSession = !!prolificData?.isProlificSession;

  const handleProlificCancel = () => {
    const prolificCancelUrl = process.env.NEXT_PUBLIC_PROLIFIC_CANCEL_URL || "";
    if (prolificCancelUrl) {
      window.location.href = prolificCancelUrl;
    }
  };

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Attention Check Failed
            </h1>

            {/* Message */}
            <div className="space-y-4 text-center">
              <p className="text-gray-700 leading-relaxed">
                Unfortunately, you did not pass the attention checks in this
                survey. These checks are included to ensure data quality and
                that participants are carefully reading each question.
              </p>

              {isProlificSession ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 flex flex-col items-center justify-center">
                    <p className="text-amber-800 font-medium">
                      Please return your submission on Prolific by clicking the
                      button below:
                    </p>
                    <button
                      type="button"
                      onClick={handleProlificCancel}
                      className="px-6 py-3 mt-4 flex items-center justify-center rounded-full bg-red-200 text-red-600 hover:bg-red-300 hover:text-red-800 cursor-pointer font-semibold shadow-lg transition-colors"
                    >
                      <XIcon className="w-4 h-4 mr-2" />
                      Cancel Participation
                    </button>
                  </div>

                  <p className="text-gray-500 text-sm mt-4">
                    If you believe this was an error, please contact the
                    researcher through Prolific.
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                    <p className="text-amber-800 font-medium">
                      Please close this window to end your participation.
                    </p>
                  </div>
                  <p className="text-gray-500 text-sm mt-4">
                    If you believe this was an error, please contact the
                    researcher via email at{" "}
                    <a
                      href="mailto:brett.binst@vub.be"
                      className="text-blue-500 hover:text-yellow-200"
                    >
                      brett.binst@vub.be
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
