const { chromium } = require('playwright');
const { cacheGet, cacheSet } = require('./cache');
const { getRandomUserAgent } = require('./user-agents');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  minRequestDelay: 2000,    // Minimum delay between requests (ms)
  maxRequestDelay: 5000,    // Maximum delay between requests (ms)
  cacheTimeMs: 900000,      // Cache results for 15 minutes
  maxRetries: 2,            // Maximum number of retry attempts
  timeout: 30000,           // Page timeout (ms)
};

// Throttle mechanism to prevent too many requests
let lastRequestTime = 0;

/**
 * Generate a random delay between min and max
 */
const getRandomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Wait for throttle to ensure ethical request rates
 */
const throttleRequest = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const randomDelay = getRandomDelay(CONFIG.minRequestDelay, CONFIG.maxRequestDelay);
  
  if (timeSinceLastRequest < randomDelay) {
    const delayNeeded = randomDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  lastRequestTime = Date.now();
};

/**
 * Generate a cache key from search query
 */
const getCacheKey = (query) => {
  return crypto.createHash('md5').update(query).digest('hex');
};

/**
 * Scrape product information using Playwright
 */
async function scrapeProductInfo(query, retryCount = 0) {
  // Check cache first
  const cacheKey = getCacheKey(query);
  const cachedResults = await cacheGet(cacheKey);
  if (cachedResults) {
    console.log(`Using cached results for query: ${query}`);
    return cachedResults;
  }
  
  // Apply throttling for ethical scraping
  await throttleRequest();
  
  // Initialize browser with random user agent
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1280, height: 800 },
  });
  
  try {
    console.log(`Searching for: ${query} (attempt ${retryCount + 1})`);
    
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeout);
    
    // Example: Search for products on a demo site
    await page.goto('https://example-ecommerce-site.com/search');
    
    // Wait for and interact with the search input
    await page.waitForSelector('#search-input');
    await page.fill('#search-input', query);
    await page.click('#search-button');
    
    // Wait for results to load
    await page.waitForSelector('.product-grid', { timeout: CONFIG.timeout });
    
    // Add random scrolling behavior to mimic human interaction
    await page.evaluate(() => {
      window.scrollTo(0, Math.floor(Math.random() * 500));
    });
    
    // Extract product data
    const products = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-item')).map(product => {
        return {
          name: product.querySelector('.product-name')?.textContent.trim() || 'Unknown',
          price: product.querySelector('.product-price')?.textContent.trim() || 'N/A',
          image: product.querySelector('.product-image')?.src || null,
          store: 'Example Store',
          url: product.querySelector('a')?.href || null,
        };
      });
    });
    
    // Cache the results
    await cacheSet(cacheKey, products, CONFIG.cacheTimeMs);
    
    // Clean up resources
    await page.close();
    await browser.close();
    
    return products;
    
  } catch (error) {
    await browser.close();
    
    // Retry logic for resilience
    if (retryCount < CONFIG.maxRetries) {
      console.log(`Error during scraping, retrying (${retryCount + 1}/${CONFIG.maxRetries}):`, error.message);
      return scrapeProductInfo(query, retryCount + 1);
    }
    
    throw new Error(`Failed to fetch product data: ${error.message}`);
  }
}

module.exports = { scrapeProductInfo };

