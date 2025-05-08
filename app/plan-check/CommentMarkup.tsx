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
  // Ensure imageScaleFactor is valid
  const scaleFactor = imageScaleFactor > 0 ? imageScaleFactor : 1;
  
  // Calculate positions accounting for possible NaN or invalid values
  const getValidPosition = (value: number) => {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  };
  
  const centerY = ((analysis.bbox.y1 + analysis.bbox.y2) / 2) * scaleFactor;
  const centerX = ((analysis.bbox.x1 + analysis.bbox.x2) / 2) * scaleFactor;
  
  const topPosition = isSelected 
    ? getValidPosition(analysis.bbox.y1 * scaleFactor) 
    : getValidPosition(centerY);
    
  const leftPosition = isSelected 
    ? getValidPosition(analysis.bbox.x1 * scaleFactor) 
    : getValidPosition(centerX);
  
  const height = isSelected 
    ? getValidPosition((analysis.bbox.y2 - analysis.bbox.y1) * scaleFactor) 
    : 0;
    
  const width = isSelected 
    ? getValidPosition((analysis.bbox.x2 - analysis.bbox.x1) * scaleFactor) 
    : 0;

  // Log values for debugging
  console.log(`CommentMarkup #${index}:`, { 
    bbox: analysis.bbox, 
    imageScaleFactor: scaleFactor,
    scaledPosition: {
      top: topPosition,
      left: leftPosition,
      height,
      width
    }
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: topPosition,
          left: leftPosition,
          height,
          width,
          transition: "all 0.3s ease",
          backgroundColor: "rgba(73, 105, 245, 0.2)",
          borderWidth: 2,
          borderColor: "rgba(73, 105, 245, 1)",
        }}
      />

      <div
        key={`comment-bubble-${index}`}
        onClick={onSelect}
        style={{
          position: "absolute",
          top: topPosition,
          left: leftPosition,
          transition: "all 0.3s ease",
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
          transform: "translate(-47%, -47%)",
        }}
      >
        {index + 1}
      </div>
    </>
  );
};
