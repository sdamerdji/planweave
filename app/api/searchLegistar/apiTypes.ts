type SearchLegistarResponse = {
  responseText: string;
  documents: {
    title: string;
    content: string;
    snippet: string;
    url: string;
  }[];
};
