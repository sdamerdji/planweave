type SearchLegistarResponse = {
  responseText: string;
  documents: {
    body: string;
    dateStr: string;
    content: string;
    snippet: string;
    url: string;
  }[];
};
