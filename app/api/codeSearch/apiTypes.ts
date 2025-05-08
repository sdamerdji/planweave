import { PlanningSearchJurisdiction } from "@/src/constants";

export type RequestBody = {
  query: string;
  conversationHistory: {
    searchId: number;
    question: string;
    answer: string;
  }[];
  jurisdiction: PlanningSearchJurisdiction;
};

export type Document = {
  id: number;
  text: string;
  pdfUrl: string | null;
  pdfTitle: string;
  headingText: string;
  bodyText: string;
  jurisdiction: PlanningSearchJurisdiction;
};

export type ResponseBody = {
  responseText: string;
  documents: Document[];
  searchId: number;
};
