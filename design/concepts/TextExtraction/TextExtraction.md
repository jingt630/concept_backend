
### Concept 2

**Concept** TextExtraction

**Purpose** Extract text from uploaded media for the AI to learn and translate

**Principle** Given a MediaFile, AI would run extraction to recognize text within the media, and produce a transcript with metadata for the media. One media can have many ExtractionResults.

**State**
a set of ExtractionResults with
        - imagePath (FilePath)
        - list of extractedText List(String)
        - list of position List(Location)[^3]
        - extractedTextSize(number)

    a set of Location with
        - an ExtractionResult
        - two Coordinate (Number,Number)

[^3:] the length of both list should be the same

**Actions**

extractTextFromMedia(image:FilePath): (result: ExtractionResult)
  **require:** image exists and accessible
  **effect:** create new ExtractionResults that is associated with the image

editExtractText(index:number, extractedText:List(String))
  **require** 0<= index < extractedTextSize
  **effect** modify extractedText in extraction to newText

editLocation(index: number, positionList: List(Location), fromCoord: Coordinate, toCoord: Coordinate)
  **require** 0<= index < extractedTextSize, the coordinates doesn't include negative numbers
  **effect** modify the ith coordinate pait in position list, with the new given fromCoord and toCoord, that gives us the area of image that the extractedText occupies if a rectangle is drawn from FromCoord to ToCoord

addExtractionTxt(media: FilePath, fromCoord: Coordinate, toCoord: Coordinate):(result: ExtractionResult)
  **require** media exists, numbers are non-negative.
  **effect** Push a new text elem to extractedText List and push a new coordinate pair to position List to the extractionResult associated with media.

deleteExtraction(index: Number, image:FilePath)
  **require** 0<= index < extractedTextSize, and valid mediaFile can be reached by the image filepath.
  **effect** remove the extractedResult text at index, also remove the position at index in position list for the extractionResult associated with imagePath
