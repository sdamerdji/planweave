import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Document } from "@/app/api/codeSearch/apiTypes";

interface DocumentModalProps {
  onClose: () => void;
  doc: Document;
}

export function DocumentModal({ onClose, doc }: DocumentModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc.pdfTitle}</DialogTitle>
          <div className="text-sm text-gray-500">{doc.headingText}</div>
        </DialogHeader>
        <div className="mt-4">
          <div
            className="content-container"
            dangerouslySetInnerHTML={{ __html: doc.bodyText }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
