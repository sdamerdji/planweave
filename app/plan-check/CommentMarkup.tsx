export const CommentMarkup = ({
  index,
  analysis,
  isSelected,
  onSelect,
  imageScaleFactor,
}: {
  index: number;
  analysis: any;
  isSelected: boolean;
  onSelect: () => void;
  imageScaleFactor: number;
}) => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: isSelected
            ? analysis.bbox.y1 * imageScaleFactor
            : ((analysis.bbox.y1 + analysis.bbox.y2) / 2) * imageScaleFactor,
          left: isSelected
            ? analysis.bbox.x1 * imageScaleFactor
            : ((analysis.bbox.x1 + analysis.bbox.x2) / 2) * imageScaleFactor,
          height: isSelected
            ? (analysis.bbox.y2 - analysis.bbox.y1) * imageScaleFactor
            : 0,
          width: isSelected
            ? (analysis.bbox.x2 - analysis.bbox.x1) * imageScaleFactor
            : 0,
          transition: "all 0.3s ease",
          backgroundColor: "rgba(73, 105, 245, 0.2)",
          borderWidth: 2,
          borderColor: "rgba(73, 105, 245, 1)",
        }}
      />

      {!isSelected && (
        <div
          key={`comment-bubble-${index}`}
          onClick={onSelect}
          style={{
            position: "absolute",
            top: ((analysis.bbox.y1 + analysis.bbox.y2) / 2) * imageScaleFactor,
            left:
              ((analysis.bbox.x1 + analysis.bbox.x2) / 2) * imageScaleFactor,
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "rgba(73, 105, 245)",
            borderColor: "black",
            borderWidth: 1,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            zIndex: 1,
            transform: "translate(-50%, -50%)",
          }}
        >
          {index + 1}
        </div>
      )}
    </>
  );
};
