let clipboardData = [];  // Temporarily store content in memory

exports.handler = async (event) => {
    if (event.httpMethod === 'POST') {
        // Parsing the content sent from the frontend
        const { content } = JSON.parse(event.body);

        // Store the pasted content in memory
        clipboardData.push({ content, timestamp: new Date().toISOString() });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Content saved successfully!' }),
        };
    } else if (event.httpMethod === 'GET') {
        // Return the stored content
        return {
            statusCode: 200,
            body: JSON.stringify(clipboardData),
        };
    }

    return {
        statusCode: 405,  // Method Not Allowed
        body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
};
