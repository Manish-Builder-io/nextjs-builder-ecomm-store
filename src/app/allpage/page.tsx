import { builder } from "@builder.io/sdk";

// Builder Public API Key set in .env file
builder.init("a9d340d6b68d48e2afc285a7bb99fb7e");

export default async function Page() {
  const builderModelName = "page";

  try {
    // Get all content from Builder
    const allContent = await builder.getAll(builderModelName, {
      userAttributes: {
        locale: "fr-FR"
      }
    });

    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">All Content (JSON)</h1>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
          <code>{JSON.stringify(allContent, null, 2)}</code>
        </pre>
      </div>
    );
  } catch (error) {
    console.error('Error fetching Builder content:', error);
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
        <pre className="bg-red-50 dark:bg-red-900 p-4 rounded-lg overflow-auto">
          <code>{JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}</code>
        </pre>
      </div>
    );
  }
}
