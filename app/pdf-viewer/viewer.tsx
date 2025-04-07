"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useEffect, useState } from "react";

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);

    setTimeout(() => {
      const highlight = document.querySelector("#highlight");

      highlight?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  console.log(searchParams?.get("s"));

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
            key={index}
            pageNumber={index + 1}
            scale={2}
            customTextRenderer={(textItem) => {
              if (
                textItem.str
                  .replace(/ /g, "")
                  .includes(searchParams?.get("s")?.replace(/ /g, "") ?? "")
              ) {
                return `<span style="font-weight: bold; background-color: yellow; color: black" id="highlight">${textItem.str}</span>`;
              }

              return textItem.str;
            }}
          />
        ))}
      </Document>
    </div>
  );
}
