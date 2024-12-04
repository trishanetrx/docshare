let clipboardData = []; // Temporarily store content in memory

exports.handler = async (event) => {
    if (event.httpMethod === 'POST') {
        const { content } = JSON.parse(event.body);
        clipboardData.push({ content, timestamp: new Date().toISOString() });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Content saved successfully!' }),
        };
    } else if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify(clipboardData),
        };
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
};
