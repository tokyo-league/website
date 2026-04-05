"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ResultImageLightbox({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button type="button" className="result-image-trigger" onClick={() => setIsOpen(true)}>
        <div className="result-feature__image result-feature__image--large">
          <Image src={src} alt={alt} fill sizes="(max-width: 960px) 100vw, 60vw" />
        </div>
        <span className="result-image-trigger__hint">タップして拡大</span>
      </button>

      {isOpen ? (
        <div className="result-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setIsOpen(false)}>
          <button
            type="button"
            className="result-lightbox__close"
            onClick={() => setIsOpen(false)}
            aria-label="閉じる"
          >
            閉じる
          </button>
          <div className="result-lightbox__inner" onClick={(event) => event.stopPropagation()}>
            <Image src={src} alt={alt} fill sizes="100vw" className="result-lightbox__image" />
          </div>
        </div>
      ) : null}
    </>
  );
}
