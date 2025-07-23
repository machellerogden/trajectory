// Using global fetch available in Node.js 18+

export class OpenAIProvider {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
    }

    async call({ model = 'gpt-4o', temperature = 0.7, max_tokens = null, prompt }) {
        if (!prompt) {
            throw new Error('Prompt is required');
        }

        const body = {
            model,
            temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };

        if (max_tokens) {
            body.max_tokens = max_tokens;
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI API');
            }

            return {
                content: data.choices[0].message.content,
                model: data.model,
                usage: data.usage
            };

        } catch (error) {
            if (error.message.includes('OpenAI API error')) {
                throw error;
            }
            throw new Error(`Network error calling OpenAI: ${error.message}`);
        }
    }
}

// Provider factory function
export function createProvider(providerName) {
    switch (providerName) {
        case 'openai':
            return new OpenAIProvider();
        default:
            throw new Error(`Unknown provider: ${providerName}`);
    }
}

// Convenience function for direct calls
export async function callLLM(params) {
    const { provider: providerName, ...llmParams } = params;
    const provider = createProvider(providerName);
    return provider.call(llmParams);
}