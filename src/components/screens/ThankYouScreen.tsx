"use client";

import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { useExperiment } from "@/hooks/useExperiment";
import { getProlificData } from "@/lib/session";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRightIcon } from "lucide-react";

export function ThankYouScreen() {
  const { session } = useExperiment();
  const [prolificData, setProlificData] = useState<{
    isProlificSession: boolean;
    prolific_pid?: string;
    prolific_study_id?: string;
    prolific_session_id?: string;
  } | null>(null);

  // Get Prolific data from session or separate storage
  useEffect(() => {
    const data = getProlificData();
    setProlificData(data);
  }, [session]);

  const isProlificSession = !!prolificData?.isProlificSession;
  const prolificRedirectUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PROLIFIC_REDIRECT_URL
      : undefined;

  // Auto-redirect Prolific users after 1 second
  useEffect(() => {
    if (isProlificSession && prolificRedirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = prolificRedirectUrl;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isProlificSession, prolificRedirectUrl]);

  const handleProlificRedirect = () => {
    if (prolificRedirectUrl) {
      window.location.href = prolificRedirectUrl;
    }
  };

  return (
    <ExperimentLayout background="image">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Thank You!
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            {isProlificSession
              ? "Thank you! You will be automatically redirected to Prolific in a moment. If the redirect doesn't work, please click the button below to submit your answers and return to Prolific."
              : "            Your participation in this music discovery experiment is complete. This experiment was designed to study music discovery patterns and the role of serendipity in finding new favorite genres."}
          </p>
          <div className="bg-white rounded-2xl p-6 border border-white/20">
            {isProlificSession && prolificRedirectUrl && (
              <div className="mb-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleProlificRedirect}
                  className="px-6 py-3 flex items-center justify-center rounded-full bg-black text-white font-semibold shadow-lg hover:bg-gray-800 transition-colors"
                >
                  Submit to Prolific
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Any questions or remarks about this research? Please contact us at{" "}
              <a
                href="mailto:brett.binst@vub.be"
                className="text-blue-500 hover:text-yellow-200"
              >
                brett.binst@vub.be
              </a>
              .
            </p>
            <div className="flex items-center justify-between mt-8">
              <a
                href="https://www.fwo.be"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/logos/fwo.png"
                  alt="FWO"
                  width={100}
                  height={100}
                />
              </a>
              <a
                href="https://smit.research.vub.be/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/logos/smit.png"
                  alt="SMIT"
                  width={100}
                  height={100}
                />
              </a>
              <a
                href="https://www.vub.be"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/logos/vub.jpg"
                  alt="VUB"
                  width={100}
                  height={100}
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
