let sharedTexts = []; // Temporary storage (resets on server restart)

exports.handler = async (event) => {
    if (event.httpMethod === "POST") {
        // Add shared text to storage
        const { title, content } = JSON.parse(event.body);
        sharedTexts.push({ title, content, timestamp: new Date().toISOString() });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Text content shared successfully!" }),
        };
    } else if (event.httpMethod === "GET") {
        // Return all shared texts
        return {
            statusCode: 200,
            body: JSON.stringify(sharedTexts),
        };
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
    };
};
