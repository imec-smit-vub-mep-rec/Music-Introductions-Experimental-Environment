"use client";

import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import Image from "next/image";

export function ThankYouScreen() {
  return (
    <ExperimentLayout background="image">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Thank You!
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Your participation in this music discovery experiment is complete.
            This experiment was designed to study music discovery patterns and
            the role of serendipity in finding new favorite genres.
          </p>
          <div className="bg-white rounded-2xl p-6 border border-white/20">
            <p className="text-lg">
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
              <Image src="/logos/fwo.png" alt="FWO" width={100} height={100} />
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
              <Image src="/logos/vub.jpg" alt="VUB" width={100} height={100} />
            </a>
          </div>
          </div>
        </div>
       
      </div>
    </ExperimentLayout>
  );
}
