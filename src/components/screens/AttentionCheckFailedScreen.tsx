"use client";

import { ExperimentLayout } from "@/components/layout/ExperimentLayout";

export function AttentionCheckFailedScreen() {
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
                Unfortunately, you did not pass the attention checks in this survey. 
                These checks are included to ensure data quality and that participants 
                are carefully reading each question.
              </p>

              <p className="text-gray-700 leading-relaxed">
                <strong>Your participation cannot be completed.</strong>
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <p className="text-amber-800 font-medium">
                  Please return your submission on Prolific:
                </p>
                <ol className="text-amber-700 text-sm mt-2 text-left list-decimal list-inside space-y-1">
                  <li>Close this survey window</li>
                  <li>Go back to Prolific</li>
                  <li>Click &ldquo;Cancel participation&rdquo; or &ldquo;Return submission&rdquo;</li>
                </ol>
              </div>

              <p className="text-gray-500 text-sm mt-4">
                If you believe this was an error, please contact the researcher through Prolific.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}

