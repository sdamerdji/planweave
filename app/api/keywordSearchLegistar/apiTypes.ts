type KeywordSearchLegistarResponse = {
  documents: {
    body: string;
    dateStr: string;
    content: string;
    snippet: string;
    url: string;
  }[];
};
