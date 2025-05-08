import { Card } from "@/components/ui/card";
import { Document } from "@/app/api/codeSearch/apiTypes";
import { PlanningSearchJurisdiction } from "@/src/constants";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
interface DocumentCardProps {
  doc: Document;
  jurisdiction: PlanningSearchJurisdiction;
  onOpenModal: (doc: Document) => void;
}

export function DocumentCard({
  doc,
  jurisdiction,
  onOpenModal,
}: DocumentCardProps) {
  const [contentElement, setContentElement] =
    useState<HTMLParagraphElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    if (!contentElement) {
      return;
    }

    const checkOverflow = () => {
      setHasOverflow(contentElement.scrollHeight > contentElement.clientHeight);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [contentElement]);

  const highlightedBodyText = doc.bodyText.match(/<mark>(.*?)<\/mark>/)?.[1];

  let documentLink = null;
  if (jurisdiction === "oak_ridge_tn") {
    // TODO
  } else if (
    jurisdiction === "johnson_county_ks" &&
    highlightedBodyText &&
    doc.pdfUrl
  ) {
    documentLink = `/pdf-viewer?url=${encodeURIComponent(doc.pdfUrl)}&s=${encodeURIComponent(highlightedBodyText)}`;
  } else {
    documentLink = doc.pdfUrl;
  }
  console.log(doc.bodyText);

  return (
    <Card>
      <div className="p-4">
        <div>
          <div className="text-lg font-semibold">{doc.pdfTitle}</div>
          <div className="text-sm text-gray-500">{doc.headingText}</div>
        </div>
        <div className="relative mt-4">
          <p
            ref={setContentElement}
            className="content-container max-h-80 overflow-y-hidden"
            dangerouslySetInnerHTML={{ __html: doc.bodyText }}
          />
          {hasOverflow && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
        <div className="pt-4 flex gap-4">
          {hasOverflow && (
            <button
              onClick={() => onOpenModal(doc)}
              className="text-blue-500 hover:underline"
            >
              View full citation
            </button>
          )}
          {documentLink && (
            <a
              href={documentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-2"
            >
              <div>Open original</div>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
