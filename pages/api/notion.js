import axios from 'axios';
import Cors from 'cors';
import NodeCache from 'node-cache';

const myCache = new NodeCache();

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST'],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async function handler(req, res) {

  //20.01.2025 – trying to fix HSBC problems with drop-down not showing values in Rcomm topics
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // If the browser sends a preflight OPTIONS request, just respond with 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  //END OF – 20.01.2025 – trying to fix HSBC problems with drop-down not showing values in Rcomm topics
  
  // Run the middleware
  await runMiddleware(req, res, cors)

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const options = {
    method: 'POST',
    url: 'https://api.notion.com/v1/databases/5b767de455d342ff8ab95c8f0615a5c4/query',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    data: {
      "filter": {
        "property": "Date",
        "date": {
          "on_or_after": today
        }
      },
      "sorts": [
        {
          "property": "Date",
          "direction": "ascending"
        }
      ],
      "page_size": 100
    }
  };

  const cacheKey = JSON.stringify(options);
  const cacheContent = myCache.get(cacheKey);

  if (cacheContent) {
    res.send(cacheContent);
  } else {
    try {
      const response = await axios.request(options);
      myCache.set(cacheKey, response.data, 320); // cache for 5 mins
      res.send(response.data);
    } catch (error) {
      res.status(500).send(error);
    }
  }
}
