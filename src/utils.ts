export const asterisksToBold = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
};
