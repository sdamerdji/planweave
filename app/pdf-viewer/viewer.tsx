"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useCallback, useEffect, useState } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

// this page is a big-ass hack
export default function PDFViewer() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      setSearchParams(urlParams);
    }
  }, []);

  const [numPages, setNumPages] = useState(0);
  const [numPagesLoaded, setNumPagesLoaded] = useState(0);
  const [highlightedSpans, setHighlightedSpans] = useState<
    {
      pageIndex: number;
      itemIndex: number;
    }[]
  >([]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    const searchForHighlight = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const allSpans = document.querySelectorAll("span.text-item");

      let allText = "";
      const charRanges = [];
      for (const span of allSpans) {
        const text = span.textContent?.replace(/\W+/g, "");
        if (text) {
          allText += text;
          charRanges.push({
            start: allText.length - text.length,
            end: allText.length,
            pageIndex: parseInt(span.getAttribute("page-index")!),
            itemIndex: parseInt(span.getAttribute("item-index")!),
          });
        }
      }

      // Get the search term and prepare it for matching
      const searchTerm = searchParams?.get("s");
      if (searchTerm) {
        const searchTermNoWhitespace = searchTerm.replace(/\W+/g, "");

        // Find the search term within allText
        const searchIndex = allText.indexOf(searchTermNoWhitespace);

        if (searchIndex !== -1) {
          // Find all char ranges that overlap with the search term
          const matchingRanges = charRanges.filter((range) => {
            // Check if this range overlaps with the search term
            return (
              (range.start <= searchIndex && range.end > searchIndex) || // Range starts before and ends after search start
              (range.start >= searchIndex &&
                range.start < searchIndex + searchTermNoWhitespace.length) // Range starts within search term
            );
          });

          setHighlightedSpans(matchingRanges);
          console.log(`Found ${matchingRanges.length} matches`);
        } else {
          console.error("Search term not found in document text");
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const highlight = document.querySelector("#highlight");
      highlight?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    if (numPagesLoaded === numPages) {
      searchForHighlight();
    }
  }, [numPagesLoaded, numPages]);

  const handlePageRenderSuccess = useCallback(() => {
    setNumPagesLoaded((old) => old + 1);
  }, []);

  const customTextRenderer = useCallback(
    (textItem: any) => {
      if (
        highlightedSpans.some(
          (span) =>
            span.pageIndex === textItem.pageIndex &&
            span.itemIndex === textItem.itemIndex
        )
      ) {
        return `<span style="font-weight: bold; background-color: yellow; color: black" id="highlight" page-index="${textItem.pageIndex}" item-index="${textItem.itemIndex}" class="text-item">${textItem.str}</span>`;
      }

      return `<span page-index="${textItem.pageIndex}" item-index="${textItem.itemIndex}" class="text-item">${textItem.str}</span>`;
    },
    [highlightedSpans]
  );

  return (
    <div className="mx-auto">
      <Document
        file={
          searchParams
            ? `/api/pdf?url=${encodeURIComponent(
                searchParams?.get("url") ?? ""
              )}`
            : undefined
        }
        onLoadSuccess={onDocumentLoadSuccess}
      >
        {Array.from({ length: numPages }, (_, index) => (
          <Page
            onRenderSuccess={handlePageRenderSuccess}
            key={index}
            pageNumber={index + 1}
            scale={2}
            customTextRenderer={customTextRenderer}
          />
        ))}
      </Document>
    </div>
  );
}
