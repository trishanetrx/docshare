exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    const { fileName, fileContent } = JSON.parse(event.body);

    // Example: Simulate saving the file (replace with real storage logic)
    console.log(`Saving file: ${fileName}`);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "File uploaded successfully!" }),
    };
};
