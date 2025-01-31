// src/utils/api.js
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const fetchMarketData = async () => {
  try {
    const [inflationRes, tbillRes, longTermRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/api/v1/inflation`),
      axios.get(`${BACKEND_URL}/api/v1/tbill`),
      axios.get(`${BACKEND_URL}/api/v1/long_term_rates`)
    ]);

    return {
      inflation: inflationRes.data,
      tbill: tbillRes.data,
      longTermRates: longTermRes.data
    };
  } catch (error) {
    throw new Error('Failed to fetch market data');
  }
};