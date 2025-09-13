import FirecrawlApp from 'firecrawl-js';
import type { Source } from '../types';

if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY environment variable not set");
}

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

interface ResearchResult {
    researchContent: string;
    sources: Source[];
}

export async function researchTopic(topic: string): Promise<ResearchResult> {
    try {
        console.log(`Starting research for topic: "${topic}"`);
        const searchResults = await app.search(`latest information and detailed guides on ${topic}`, {
            pageOptions: {
                fetchPageContent: false // We will scrape manually for more control
            },
            searchOptions: {
                limit: 5 // Get top 5 search results
            }
        });

        if (!searchResults.success || searchResults.data.length === 0) {
            throw new Error("Could not find relevant sources for the topic.");
        }

        const sources: Source[] = [];
        let researchContent = "";
        
        // Scrape the top 3 results for detailed content
        const urlsToScrape = searchResults.data.slice(0, 3).map(res => res.url);

        const scrapePromises = urlsToScrape.map(async (url) => {
            console.log(`Scraping URL: ${url}`);
            const scrapeResult = await app.scrape(url, {
                 pageOptions: {
                    onlyMainContent: true // Get the core content of the page
                 }
            });
            if (scrapeResult.success) {
                sources.push({ title: scrapeResult.data.metadata.title, url });
                return `Source: ${scrapeResult.data.metadata.title}\nURL: ${url}\nContent:\n${scrapeResult.data.markdown}\n\n---\n\n`;
            }
            return "";
        });

        const scrapedContents = await Promise.all(scrapePromises);
        researchContent = scrapedContents.join('');

        if (researchContent.trim() === "") {
             throw new Error("Failed to scrape content from the top sources.");
        }
        
        console.log("Research complete.");
        return { researchContent, sources };

    } catch (error) {
        console.error("Error during Firecrawl research:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during research.";
        throw new Error(`Failed to research topic. Reason: ${errorMessage}`);
    }
}
