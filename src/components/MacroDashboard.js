import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MacroDashboard = () => {
  const [data, setData] = useState({
    inflation: null,
    tbill: null,
    longTermRates: null,
    equityMetrics: null,
    equity: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estimatedInflation, setEstimatedInflation] = useState(2.5);
  const [estimatedGrowth, setEstimatedGrowth] = useState(1.5);
  const [payoutRatio, setpayoutRatio] = useState(36.4);

  useEffect(() => {
    // Validate backend URL is configured
    if (!BACKEND_URL) {
        setError('Backend URL not configured');
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [inflationRes, tbillRes, longTermRes, equityMetricsRes, equityRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/v1/inflation`),
          axios.get(`${BACKEND_URL}/api/v1/tbill`),
          axios.get(`${BACKEND_URL}/api/v1/long_term_rates`),
          axios.get(`${BACKEND_URL}/api/v1/equity/metrics`),
          axios.get(`${BACKEND_URL}/api/v1/equity`)
        ]);

        setData({
          inflation: inflationRes.data.rate,
          tbill: tbillRes.data.rate,
          longTermRates: longTermRes.data.rates,
          equityMetrics: equityMetricsRes.data,
          equity: equityRes.data
        });
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load market data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Set up auto-refresh every 5 minutes
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading Market Data...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Bond calculations
  const effectiveRealYield = data.tbill !== null ? (data.tbill - estimatedInflation).toFixed(2) : null;
  const marketInflation = data.longTermRates ? (data.longTermRates.bond_yield_20y - data.longTermRates.tips_yield_20y).toFixed(2) : null;
  const deltaInflation = data.longTermRates ? (marketInflation - estimatedInflation).toFixed(2) : null;
  const deltaGrowth = data.longTermRates ? (data.longTermRates.tips_yield_20y - estimatedGrowth).toFixed(2) : null;
  const estimatedBondReturn = data.longTermRates ? 
    (data.longTermRates.bond_yield_20y + parseFloat(deltaInflation) + parseFloat(deltaGrowth)).toFixed(2) : null;

  // Equity calculations
  const metrics = (() => {
    if (!data.equity || !data.equityMetrics) return null;

    const expectedCape = 1 / (estimatedInflation / 100 + estimatedGrowth / 100);
    const priceToDiv = data.equity.current_sp500_price / data.equity.ttm_dividend.value;
    const currentPE = priceToDiv * payoutRatio / 100;
    const expectedDivYield = (payoutRatio / expectedCape);
    const expectedCapeChange = (-((currentPE - expectedCape) / currentPE) / 10) * 100;
    
    // Updated ROE calculations
    const pastROE = data.equityMetrics.past_returns_cagr - data.equityMetrics.past_cape_cagr;
    const expectedROE = (pastROE - data.equityMetrics.past_inflation_cagr + estimatedInflation / 100) * 100;
    const expectedEarningsGrowth = expectedROE * (1-payoutRatio/100);
    const expectedMarketReturn = expectedDivYield + expectedEarningsGrowth + expectedCapeChange;

    return {
      currentPE,
      expectedCape,
      expectedDivYield,
      expectedCapeChange,
      expectedROE,
      expectedEarningsGrowth,
      expectedMarketReturn
    };
  })();

  // Final calculations using both bond and equity metrics
  const expectedEquityRiskPremium = metrics?.expectedMarketReturn && estimatedBondReturn ? 
    (metrics.expectedMarketReturn - parseFloat(estimatedBondReturn)).toFixed(2) : null;

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Macroeconomic Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left Column - Bonds & Rates */}
          <div className="flex flex-col space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Current Market Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current Inflation Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.inflation !== null ? `${data.inflation.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current T-Bill Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.tbill !== null ? `${data.tbill.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
  
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Parameters</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <label className="block text-gray-600">
                    Estimated Inflation
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedInflation}
                      onChange={(e) => setEstimatedInflation(parseFloat(e.target.value))}
                      className="ml-4 p-1 border rounded"
                    />
                    %
                  </label>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Effective Real T-Bill Yield</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {effectiveRealYield !== null ? `${effectiveRealYield}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
  
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Long-term Parameters</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <label className="block text-gray-600">
                    20-yr Real GDP Growth Estimate
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedGrowth}
                      onChange={(e) => setEstimatedGrowth(parseFloat(e.target.value))}
                      className="ml-4 p-1 border rounded"
                    />
                    %
                  </label>
                </div>
              </div>
            </div>
  
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Long-term Analysis</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">20-year Bond Yield</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.longTermRates?.bond_yield_20y ? `${data.longTermRates.bond_yield_20y.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Horizon Premium (20yr TIPS yield)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.longTermRates?.tips_yield_20y ? `${data.longTermRates.tips_yield_20y.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Market Implied Inflation (=20-yr Bond Yield - 20-yr TIPS Yield)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {marketInflation !== null ? `${marketInflation}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Δ Inflation (=Market Implied - Expected)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {deltaInflation !== null ? `${deltaInflation}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Δ Growth (=Market Implied - Expected)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {deltaGrowth !== null ? `${deltaGrowth}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* Right Column - Equity Metrics */}
          <div className="flex flex-col space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Historical Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past Inflation</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.past_inflation_cagr ? 
                      `${(data.equityMetrics.past_inflation_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past Dividend Yield</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.avg_dividend_yield ? 
                      `${(data.equityMetrics.avg_dividend_yield * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past Earnings Growth</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.past_earnings_cagr ? 
                      `${(data.equityMetrics.past_earnings_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past CAPE Change</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.past_cape_cagr ? 
                      `${(data.equityMetrics.past_cape_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past Market Returns</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.past_returns_cagr ? 
                      `${(data.equityMetrics.past_returns_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Past ROE</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.past_returns_cagr && data.equityMetrics?.past_cape_cagr ? 
                      `${((data.equityMetrics.past_returns_cagr - data.equityMetrics.past_cape_cagr) * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
  
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Current Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current Inflation</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.current_inflation_cagr ? 
                      `${(data.equityMetrics.current_inflation_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current Earnings Growth</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.current_earnings_cagr ? 
                      `${(data.equityMetrics.current_earnings_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current CAPE Change</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.current_cape_cagr ? 
                      `${(data.equityMetrics.current_cape_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-gray-600">Current Market Returns</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.equityMetrics?.current_returns_cagr ? 
                      `${(data.equityMetrics.current_returns_cagr * 100).toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
  
            <div className="bg-white p-4 rounded-lg shadow flex-grow flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Parameters & Expectations</h2>
              <div className="flex flex-col flex-grow">
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <label className="flex items-center text-gray-600">
                    <span className="w-32">Payout Ratio:</span>
                    <input
                      type="number"
                      step="1"
                      value={payoutRatio}
                      onChange={(e) => setpayoutRatio(parseFloat(e.target.value))}
                      className="w-20 p-1 border rounded"
                    />
                    <span className="ml-1">%</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3 flex-grow">
                  {[
                    { label: 'Current P/E', value: metrics?.currentPE?.toFixed(2) },
                    { label: 'Expected CAPE', value: metrics?.expectedCape?.toFixed(2) },
                    { 
                      label: 'Current Dividend Yield', 
                      value: data.equity?.current_sp500_price && data.equity?.ttm_dividend ? 
                        ((data.equity.ttm_dividend.value / data.equity.current_sp500_price) * 100).toFixed(2) : null,
                      suffix: '%'
                    },
                    { label: 'Expected Dividend Yield', value: metrics?.expectedDivYield?.toFixed(2), suffix: '%' },
                    { 
                      label: 'Current ROE',
                      value: data.equityMetrics?.current_returns_cagr && data.equityMetrics?.current_cape_cagr ? 
                        ((data.equityMetrics.current_returns_cagr - data.equityMetrics.current_cape_cagr) * 100).toFixed(2) : null,
                      suffix: '%'
                    },
                    { label: 'Expected ROE', value: metrics?.expectedROE?.toFixed(2), suffix: '%' },
                    { label: 'Expected CAPE Change', value: metrics?.expectedCapeChange?.toFixed(2), suffix: '%' },
                    { label: 'Expected Earnings Growth', value: metrics?.expectedEarningsGrowth?.toFixed(2), suffix: '%' }
                  ].map(({ label, value, suffix = '' }, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-base font-semibold text-blue-600">
                        {value ? `${value}${suffix}` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-xl font-semibold mb-3">
                <div>Estimated Bond Return</div>
                <div className="text-sm">(=20-yr Bond Yield + Δ Inflation + Δ Growth)</div>
              </h2>
              <div className="text-3xl font-bold text-blue-600">
                {estimatedBondReturn ? `${estimatedBondReturn}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-xl font-semibold mb-3">Expected Market Return</h2>
              <div className="text-3xl font-bold text-blue-600">
                {metrics?.expectedMarketReturn ? `${metrics.expectedMarketReturn.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-lg mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-4">Expected Equity Risk Premium</h2>
            <div className="flex justify-center">
              <div className="text-4xl font-bold text-blue-600">
                {expectedEquityRiskPremium ? `${expectedEquityRiskPremium}%` : 'N/A'}
              </div>
            </div>
            <p className="text-center text-gray-600 mt-2">
              Expected Market Return - Estimated Bond Return
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default MacroDashboard;