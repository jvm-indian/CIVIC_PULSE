import React, { useEffect, useState } from "react";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number; // ms
  duration?: number; // ms
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 1000, className = "" }: FadeInProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ease-out ${visible ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

interface AnimatedHeadingProps {
  text: string;
  delay?: number; // Initial delay in ms
  charDelay?: number; // Delay per character in ms
  duration?: number; // Transition duration in ms
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedHeading({
  text,
  delay = 200,
  charDelay = 30,
  duration = 500,
  className = "",
  style = {}
}: AnimatedHeadingProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const lines = text.split("\n");

  return (
    <h1 className={`${className}`} style={style}>
      {lines.map((line, lineIndex) => {
        let cumulativeCharIndex = 0;
        // Calculate previous lines total length to keep sequential staggered delay
        for (let i = 0; i < lineIndex; i++) {
          cumulativeCharIndex += lines[i].length;
        }

        return (
          <div key={lineIndex} className="block overflow-hidden pb-1 leading-tight">
            {line.split("").map((char, charIndex) => {
              const overallIndex = cumulativeCharIndex + charIndex;
              const individualDelay = overallIndex * charDelay;

              return (
                <span
                  key={charIndex}
                  className="inline-block transition-all ease-out"
                  style={{
                    opacity: animated ? 1 : 0,
                    transform: animated ? "translateX(0)" : "translateX(-18px)",
                    transitionDuration: `${duration}ms`,
                    transitionDelay: `${individualDelay}ms`,
                    display: "inline-block",
                    whiteSpace: "pre"
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </div>
        );
      })}
    </h1>
  );
}
