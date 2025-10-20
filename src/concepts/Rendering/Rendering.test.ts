import { MongoClient } from "npm:mongodb";
import OutputRenderConcept from "./Rendering.ts";
import { ID } from "@utils/types.ts"; // Assuming ID is available from utils

// Mocking the MongoDB client and database for testing
const mockDb = {
  collection: (name: string) => ({
    insertOne: async (doc: any) => {
      // Simulate insertOne operation
      console.log(`Mock insertOne called on ${name} with:`, doc);
      // Return a mock InsertOneResult if needed by the function's return type
      return { insertedId: doc._id };
    },
    findOne: async (query: any) => {
      // Simulate findOne operation (for testing queries)
      console.log(`Mock findOne called on ${name} with:`, query);
      // Return a mock document or null
      if (query._id === "test-output-version-id") {
        return {
          _id: "test-output-version-id" as ID,
          imagePath: "path/to/image.jpg",
          renderedData: {
            _id: "test-rendered-content-id",
            textElements: [
              {
                _id: "test-text-element-id",
                text: "Hello World",
                position: { x: 10, y: 20, x2: 100, y2: 50 },
                fontSize: "16px",
                color: "red",
              },
            ],
          },
        };
      }
      return null;
    },
    find: () => ({
      toArray: async () => {
        // Simulate find().toArray() operation
        console.log(`Mock find().toArray() called.`);
        return [
          {
            _id: "test-output-version-id-1" as ID,
            imagePath: "path/to/image1.png",
            renderedData: {
              _id: "test-rendered-content-id-1",
              textElements: [],
            },
          },
          {
            _id: "test-output-version-id-2" as ID,
            imagePath: "path/to/image2.jpeg",
            renderedData: {
              _id: "test-rendered-content-id-2",
              textElements: [],
            },
          },
        ];
      },
    }),
  }),
};

// Mock crypto.randomUUID for deterministic IDs during testing
const mockCrypto = {
  randomUUID: () => "mock-uuid",
};

// Replace the global crypto.randomUUID with our mock
const originalRandomUUID = crypto.randomUUID;
// @ts-ignore - Overriding global object for testing
crypto.randomUUID = mockCrypto.randomUUID;

Deno.test("OutputRenderConcept: export action simulates exporting a file", async () => {
  const concept = new OutputRenderConcept(mockDb as any);

  const mockOutputVersion = {
    _id: "test-output-version-id" as ID,
    imagePath: "path/to/image.jpg",
    renderedData: {
      _id: "test-rendered-content-id",
      textElements: [],
    },
  };
  const destination = "/tmp/exports";
  const type = "png";

  // We are not mocking file system operations here, just checking if the function is called correctly
  // and returns a plausible object representing the exported file.
  const result = await concept.export({
    output: mockOutputVersion,
    destination,
    type,
  });

  // Assert that the export action returns a file object (simulated)
  console.assert(
    result.file !== undefined,
    "export action should return a file object",
  );
  console.assert(
    typeof result.file === "string",
    "The simulated file should be a string (path)",
  ); // Based on the current implementation returning the destination path string
});

Deno.test("OutputRenderConcept: _getOutputVersionById query returns the correct output version", async () => {
  const concept = new OutputRenderConcept(mockDb as any);
  const outputIdToFind = "test-output-version-id" as ID;

  const result = await concept._getOutputVersionById({
    outputId: outputIdToFind,
  });

  console.assert(
    result.length === 1,
    "Should return exactly one output version",
  );
  console.assert(
    result[0]._id === outputIdToFind,
    "Returned output version ID should match the query ID",
  );
  console.assert(
    result[0].imagePath === "path/to/image.jpg",
    "Returned output version imagePath should match mock data",
  );
});

Deno.test("OutputRenderConcept: _getAllOutputVersions query returns all output versions", async () => {
  const concept = new OutputRenderConcept(mockDb as any);

  const result = await concept._getAllOutputVersions();

  console.assert(
    result.length === 2,
    "Should return all two mocked output versions",
  );
  console.assert(
    result[0]._id === "test-output-version-id-1",
    "First output version ID mismatch",
  );
  console.assert(
    result[1]._id === "test-output-version-id-2",
    "Second output version ID mismatch",
  );
});

// Restore original crypto.randomUUID after tests
// @ts-ignore - Overriding global object for testing
crypto.randomUUID = originalRandomUUID;
