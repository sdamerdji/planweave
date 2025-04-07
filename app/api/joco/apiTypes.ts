export type RequestBody = {
  query: string;
  conversationHistory: {
    searchId: number;
    question: string;
    answer: string;
  }[];
};

export type Document = {
  id: number;
  text: string;
  pdfUrl: string;
  pdfTitle: string;
  headingText: string;
  bodyText: string;
  jurisdiction: string;
};

export type ResponseBody = {
  responseText: string;
  documents: Document[];
  searchId: number;
};
