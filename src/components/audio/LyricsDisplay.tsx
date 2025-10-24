'use client';

import { useState, useEffect, useRef } from 'react';
import { Transcript, Word } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  transcript: Transcript;
  currentTime: number;
  isPlaying: boolean;
  className?: string;
}

export function LyricsDisplay({ 
  transcript, 
  currentTime, 
  isPlaying, 
  className 
}: LyricsDisplayProps) {
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find the currently active word and line based on current time
  useEffect(() => {
    if (!transcript || !isPlaying) return;

    let foundActiveWord: Word | null = null;
    let foundLineIndex = 0;

    // Find the active word
    for (let i = 0; i < transcript.subtitles.length; i++) {
      const subtitle = transcript.subtitles[i];
      for (const word of subtitle.words) {
        if (currentTime >= word.start && currentTime <= word.end) {
          foundActiveWord = word;
          foundLineIndex = i;
          break;
        }
      }
      if (foundActiveWord) break;
    }

    if (foundActiveWord) {
      setActiveWordId(foundActiveWord.id);
      setActiveLineIndex(foundLineIndex);
    } else {
      // If no word is active, find the closest line
      for (let i = 0; i < transcript.subtitles.length; i++) {
        const subtitle = transcript.subtitles[i];
        if (currentTime >= subtitle.timing.start && currentTime <= subtitle.timing.end) {
          setActiveLineIndex(i);
          break;
        }
      }
    }
  }, [currentTime, transcript, isPlaying]);

  // Handle user scrolling
  const handleScroll = () => {
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to re-enable auto-scroll after user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000); // 2 seconds after user stops scrolling
  };

  // Auto-scroll to active line (only if user is not manually scrolling)
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !isUserScrolling) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;
      
      const containerHeight = container.clientHeight;
      const activeLineTop = activeLine.offsetTop;
      const activeLineHeight = activeLine.clientHeight;
      
      // Center the active line in the container
      const scrollTop = activeLineTop - (containerHeight / 2) + (activeLineHeight / 2);
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [activeLineIndex, isUserScrolling]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (!transcript || !transcript.subtitles.length) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-dark-purple/50", className)}>
        <p>No lyrics available</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      onTouchMove={handleScroll}
      onWheel={handleScroll}
      className={cn(
        "h-full overflow-y-auto px-4 py-6",
        "scroll-smooth scrollbar-minimal",
        className
      )}
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="space-y-8">
        {transcript.subtitles.map((subtitle, subtitleIndex) => (
          <div
            key={subtitle.id}
            ref={subtitleIndex === activeLineIndex ? activeLineRef : null}
            className={cn(
              "transition-all duration-300 ease-in-out",
              "text-center leading-normal"
            )}
          >
            <div className="flex flex-wrap justify-center items-center gap-2">
              {subtitle.words.map((word, wordIndex) => {
                const isActive = activeWordId === word.id;
                const isInActiveLine = subtitleIndex === activeLineIndex;
                const isPastLine = subtitleIndex < activeLineIndex;
                const isFutureLine = subtitleIndex > activeLineIndex;

                return (
                  <span
                    key={word.id}
                    className={cn(
                      "transition-all duration-200 ease-in-out",
                      "inline-block text-lg",
                      {
                        
                        // Active line styling (white, larger size)
                        "text-white": isInActiveLine,
                        
                        // Past lines styling (faded, medium size)
                        "text-white/50": isPastLine,
                        
                        // Future lines styling (very faded, medium size)
                        "text-white/30": isFutureLine,
                      }
                    )}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
