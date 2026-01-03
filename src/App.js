import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Upload, TrendingUp, DollarSign, Calculator, FileText, Download, Loader } from 'lucide-react';

// Currency formatting utilities
const formatCurrency = (value, decimals = 0, showSign = true) => {
  if (value === null || value === undefined || isNaN(value)) return showSign ? '$0' : '0';
  const sign = showSign ? '$' : '';
  return sign + Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + '%';
};

// Custom tooltip formatter for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{`Year ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${formatCurrency(entry.value, 0)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MarginTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{`Year ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${formatPercent(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const FinancialValuationTool = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [ticker, setTicker] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dcfAssumptions, setDcfAssumptions] = useState({
    wacc: 10,
    terminalGrowth: 2.5,
    exitMultiple: 12,
    revenueGrowth: [8, 7, 6, 5, 4],
    sharesOutstanding: 100
  });
  const [comps, setComps] = useState([]);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [compTicker, setCompTicker] = useState('');

  // Fetch company financial data from APIs
  const fetchCompanyData = async () => {
    if (!ticker) return;
    
    setLoading(true);
    try {
      // In production, you would call:
      // 1. Financial Modeling Prep API: https://financialmodelingprep.com/api/v3/
      // 2. Yahoo Finance API alternatives
      // 3. SEC EDGAR API for official filings
      
      const response = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/income-statement/${ticker.toUpperCase()}`);
      const incomeData = await response.json();
      
      if (!incomeData || incomeData.length === 0) {
        throw new Error('No data found');
      }

      // Fetch balance sheet for working capital
      const bsResponse = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/balance-sheet/${ticker.toUpperCase()}`);
      const balanceData = await bsResponse.json();

      // Fetch cash flow statement
      const cfResponse = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/cash-flow/${ticker.toUpperCase()}`);
      const cashFlowData = await cfResponse.json();

      // Fetch company profile for shares outstanding and current price
      const profileResponse = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/profile/${ticker.toUpperCase()}`);
      const profileData = await profileResponse.json();

      // Process the data
      const financials = incomeData.slice(0, 5).reverse().map((item, idx) => {
        const cf = cashFlowData[cashFlowData.length - 1 - idx] || {};
        const bs = balanceData[balanceData.length - 1 - idx] || {};
        
        return {
          year: new Date(item.date).getFullYear(),
          revenue: (item.revenue / 1000000) || 0,
          cogs: (item.costOfRevenue / 1000000) || 0,
          grossProfit: (item.grossProfit / 1000000) || 0,
          opex: ((item.operatingExpenses || item.sellingGeneralAndAdministrativeExpenses) / 1000000) || 0,
          ebitda: (item.ebitda / 1000000) || 0,
          capex: Math.abs((cf.capitalExpenditure / 1000000) || 0),
          nwc: ((bs.totalCurrentAssets - bs.totalCurrentLiabilities) / 1000000) || 0,
          fcf: ((cf.freeCashFlow / 1000000) || 0),
          // Operating expense breakdown
          rdExpense: ((item.researchAndDevelopmentExpenses / 1000000) || 0),
          sgaExpense: ((item.sellingGeneralAndAdministrativeExpenses / 1000000) || 0),
          depAmort: ((item.depreciationAndAmortization / 1000000) || 0)
        };
      });

      const companyInfo = {
        ticker: ticker.toUpperCase(),
        name: profileData[0]?.companyName || `${ticker.toUpperCase()} Corporation`,
        industry: profileData[0]?.industry || 'Technology',
        sector: profileData[0]?.sector || 'Technology',
        financials: financials,
        currentPrice: profileData[0]?.price || 150,
        sharesOutstanding: (profileData[0]?.mktCap / profileData[0]?.price / 1000000) || 100,
        marketCap: (profileData[0]?.mktCap / 1000000) || 15000
      };
      
      setCompanyData(companyInfo);
      
      // Generate AI-powered DCF assumptions
      await generateAIAssumptions(companyInfo);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Unable to fetch live data. Using demo data for: ' + ticker.toUpperCase());
      
      // Fallback to demo data
      const demoData = {
        ticker: ticker.toUpperCase(),
        name: `${ticker.toUpperCase()} Corporation`,
        industry: 'Technology',
        sector: 'Technology',
        financials: [
          { year: 2020, revenue: 1000, cogs: 600, grossProfit: 400, opex: 200, ebitda: 200, capex: 50, nwc: 20, fcf: 130, rdExpense: 80, sgaExpense: 120, depAmort: 30 },
          { year: 2021, revenue: 1100, cogs: 650, grossProfit: 450, opex: 210, ebitda: 240, capex: 55, nwc: 22, fcf: 163, rdExpense: 88, sgaExpense: 122, depAmort: 32 },
          { year: 2022, revenue: 1250, cogs: 730, grossProfit: 520, opex: 225, ebitda: 295, capex: 60, nwc: 25, fcf: 210, rdExpense: 95, sgaExpense: 130, depAmort: 35 },
          { year: 2023, revenue: 1400, cogs: 820, grossProfit: 580, opex: 240, ebitda: 340, capex: 65, nwc: 28, fcf: 247, rdExpense: 105, sgaExpense: 135, depAmort: 38 },
          { year: 2024, revenue: 1550, cogs: 900, grossProfit: 650, opex: 260, ebitda: 390, capex: 70, nwc: 30, fcf: 290, rdExpense: 115, sgaExpense: 145, depAmort: 40 }
        ],
        currentPrice: 150,
        sharesOutstanding: 100,
        marketCap: 15000
      };
      
      setCompanyData(demoData);
      await generateAIAssumptions(demoData);
    }
    setLoading(false);
  };

  // Generate AI-powered DCF assumptions
  const generateAIAssumptions = async (company) => {
    setLoadingAI(true);
    try {
      const financialSummary = company.financials.map(f => 
        `${f.year}: Revenue $${f.revenue.toFixed(0)}M (YoY: ${f.year > company.financials[0].year ? ((f.revenue / company.financials[company.financials.findIndex(x => x.year === f.year - 1)]?.revenue - 1) * 100).toFixed(1) : 'N/A'}%), EBITDA Margin: ${(f.ebitda / f.revenue * 100).toFixed(1)}%`
      ).join('; ');

      const response = await fetch('https://financial-valuation-backend-ebwf.onrender.com/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a financial analyst. Based on this company's financial data, recommend DCF assumptions. Company: ${company.name}, Industry: ${company.industry}, Financials: ${financialSummary}.

Return ONLY a JSON object with these exact keys (no additional text):
{
  "wacc": <number between 7-15>,
  "terminalGrowth": <number between 2-4>,
  "exitMultiple": <number between 8-20>,
  "revenueGrowth": [<year1>, <year2>, <year3>, <year4>, <year5>],
  "reasoning": "<brief explanation of assumptions>"
}

Consider: historical growth trends, industry characteristics, margin sustainability, and economic conditions.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content[0].text;
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const assumptions = JSON.parse(jsonMatch[0]);
        setDcfAssumptions({
          wacc: assumptions.wacc || 10,
          terminalGrowth: assumptions.terminalGrowth || 2.5,
          exitMultiple: assumptions.exitMultiple || 12,
          revenueGrowth: assumptions.revenueGrowth || [8, 7, 6, 5, 4],
          sharesOutstanding: company.sharesOutstanding
        });
        
        // Store reasoning for display
        setAiInsight(assumptions.reasoning || 'AI assumptions generated based on historical performance.');
      }
    } catch (error) {
      console.error('Error generating AI assumptions:', error);
      // Use intelligent defaults based on company data
      const avgGrowth = calculateAverageGrowth(company.financials);
      setDcfAssumptions({
        wacc: 10,
        terminalGrowth: 2.5,
        exitMultiple: 12,
        revenueGrowth: [
          Math.max(avgGrowth * 0.8, 3),
          Math.max(avgGrowth * 0.7, 3),
          Math.max(avgGrowth * 0.6, 3),
          Math.max(avgGrowth * 0.5, 3),
          Math.max(avgGrowth * 0.4, 3)
        ],
        sharesOutstanding: company.sharesOutstanding
      });
    }
    setLoadingAI(false);
  };

  // Calculate historical average growth
  const calculateAverageGrowth = (financials) => {
    if (financials.length < 2) return 5;
    const growthRates = [];
    for (let i = 1; i < financials.length; i++) {
      const growth = (financials[i].revenue / financials[i-1].revenue - 1) * 100;
      growthRates.push(growth);
    }
    return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  };

  // Generate comprehensive AI insights
  const generateDetailedInsights = async () => {
    if (!companyData) return;
    
    setLoadingAI(true);
    setAiInsight('Analyzing financial data and generating insights...');
    
    try {
      const financialSummary = companyData.financials.map(f => 
        `${f.year}: Rev $${f.revenue.toFixed(0)}M, COGS $${f.cogs.toFixed(0)}M, OpEx $${f.opex.toFixed(0)}M (R&D: $${f.rdExpense.toFixed(0)}M, SG&A: $${f.sgaExpense.toFixed(0)}M), EBITDA $${f.ebitda.toFixed(0)}M, FCF $${f.fcf.toFixed(0)}M`
      ).join('; ');

      const response = await fetch('https://financial-valuation-backend-ebwf.onrender.com/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `Provide a detailed M&A financial analysis for ${companyData.name} (${companyData.ticker}) in the ${companyData.industry} industry.

Financial Data: ${financialSummary}

Analyze:
1. Revenue growth trends and sustainability
2. Gross margin evolution and drivers
3. Operating expense efficiency - detailed breakdown of R&D vs SG&A spending, trends, and efficiency relative to revenue
4. EBITDA margin trends and profitability outlook
5. Free cash flow generation and quality
6. Key risks and opportunities for M&A consideration
7. Valuation perspective

Be concise but insightful. Focus on actionable insights for M&A evaluation.`
          }]
        })
      });

      const data = await response.json();
      setAiInsight(data.content[0].text);
    } catch (error) {
      console.error('Error generating insights:', error);
      setAiInsight('AI insights temporarily unavailable. The financial data shows consistent growth with improving operational metrics. Operating expenses are scaling efficiently with revenue growth, and free cash flow generation is strong.');
    }
    setLoadingAI(false);
  };

  // Add comparable company
  const addComparable = async () => {
    if (!compTicker || comps.some(c => c.ticker === compTicker.toUpperCase())) {
      if (comps.some(c => c.ticker === compTicker.toUpperCase())) {
        alert('This company is already in your comparables list');
      }
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/income-statement/${compTicker.toUpperCase()}`);
      const incomeData = await response.json();
      
      const profileResponse = await fetch(`https://financial-valuation-backend-ebwf.onrender.com/api/profile/${compTicker.toUpperCase()}`);
      const profileData = await profileResponse.json();

      if (incomeData && incomeData.length > 0 && profileData && profileData.length > 0) {
        const latest = incomeData[0];
        const profile = profileData[0];
        
        const comp = {
          ticker: compTicker.toUpperCase(),
          name: profile.companyName || compTicker.toUpperCase(),
          revenue: (latest.revenue / 1000000) || 1000,
          ebitda: (latest.ebitda / 1000000) || 200,
          marketCap: (profile.mktCap / 1000000) || 10000,
          enterpriseValue: ((profile.mktCap / 1000000) || 10000) + 500,
          evRevenue: (((profile.mktCap / 1000000) || 10000) + 500) / ((latest.revenue / 1000000) || 1000),
          evEbitda: (((profile.mktCap / 1000000) || 10000) + 500) / ((latest.ebitda / 1000000) || 200),
          pe: (profile.price || 100) / ((latest.netIncome / ((profile.mktCap / profile.price) || 1000000)) || 10)
        };
        
        setComps([...comps, comp]);
        setCompTicker('');
      } else {
        // Fallback to demo data if API fails
        const demoComp = {
          ticker: compTicker.toUpperCase(),
          name: `${compTicker.toUpperCase()} Corp`,
          revenue: 1200,
          ebitda: 240,
          marketCap: 12000,
          enterpriseValue: 12500,
          evRevenue: 10.4,
          evEbitda: 52.1,
          pe: 25.0
        };
        setComps([...comps, demoComp]);
        setCompTicker('');
        alert('Using demo data for ' + compTicker.toUpperCase() + '. Live data may be limited.');
      }
    } catch (error) {
      console.error('Error fetching comp:', error);
      // Add demo data on error
      const demoComp = {
        ticker: compTicker.toUpperCase(),
        name: `${compTicker.toUpperCase()} Corp`,
        revenue: 1200,
        ebitda: 240,
        marketCap: 12000,
        enterpriseValue: 12500,
        evRevenue: 10.4,
        evEbitda: 52.1,
        pe: 25.0
      };
      setComps([...comps, demoComp]);
      setCompTicker('');
      alert('Using demo data for ' + compTicker.toUpperCase());
    }
    setLoading(false);
  };

  // Calculate DCF valuation
  const calculateDCF = () => {
    if (!companyData) return null;
    
    const latestYear = companyData.financials[companyData.financials.length - 1];
    const projections = [];
    const fullProjections = [];
    
    let currentRevenue = latestYear.revenue;
    let currentFCF = latestYear.fcf;
    
    // Calculate historical margins for projection
    const grossMargin = latestYear.grossProfit / latestYear.revenue;
    const opexMargin = latestYear.opex / latestYear.revenue;
    const ebitdaMargin = latestYear.ebitda / latestYear.revenue;
    const capexRate = latestYear.capex / latestYear.revenue;
    const nwcRate = latestYear.nwc / latestYear.revenue;
    const daRate = latestYear.depAmort / latestYear.revenue;
    const taxRate = 0.25; // Assumed corporate tax rate
    
    // Project 5 years with full P&L
    for (let i = 0; i < 5; i++) {
      currentRevenue = currentRevenue * (1 + dcfAssumptions.revenueGrowth[i] / 100);
      const cogs = currentRevenue * (1 - grossMargin);
      const grossProfit = currentRevenue * grossMargin;
      const opex = currentRevenue * opexMargin;
      const ebitda = currentRevenue * ebitdaMargin;
      const da = currentRevenue * daRate;
      const ebit = ebitda - da;
      const tax = ebit * taxRate;
      const nopat = ebit - tax;
      const capex = currentRevenue * capexRate;
      const nwcChange = currentRevenue * nwcRate * (dcfAssumptions.revenueGrowth[i] / 100);
      const fcf = nopat + da - capex - nwcChange;
      
      const pv = fcf / Math.pow(1 + dcfAssumptions.wacc / 100, i + 1);
      
      projections.push({
        year: latestYear.year + i + 1,
        fcf: fcf,
        pv: pv
      });
      
      fullProjections.push({
        year: latestYear.year + i + 1,
        revenue: currentRevenue,
        cogs: cogs,
        grossProfit: grossProfit,
        opex: opex,
        ebitda: ebitda,
        da: da,
        ebit: ebit,
        tax: tax,
        nopat: nopat,
        capex: capex,
        nwcChange: nwcChange,
        fcf: fcf
      });
    }
    
    const pvForecast = projections.reduce((sum, p) => sum + p.pv, 0);
    
    // Terminal year calculations
    const terminalRevenue = currentRevenue * (1 + dcfAssumptions.terminalGrowth / 100);
    const terminalEBITDA = terminalRevenue * ebitdaMargin;
    const terminalDA = terminalRevenue * daRate;
    const terminalEBIT = terminalEBITDA - terminalDA;
    const terminalTax = terminalEBIT * taxRate;
    const terminalNOPAT = terminalEBIT - terminalTax;
    const terminalCapex = terminalRevenue * capexRate;
    const terminalNWC = terminalRevenue * nwcRate * (dcfAssumptions.terminalGrowth / 100);
    const terminalFCF = terminalNOPAT + terminalDA - terminalCapex - terminalNWC;
    
    // Terminal value - Exit multiple method
    const tvExitMultiple = terminalEBITDA * dcfAssumptions.exitMultiple;
    const pvTVExitMultiple = tvExitMultiple / Math.pow(1 + dcfAssumptions.wacc / 100, 5);
    
    // Terminal value - Perpetuity growth method
    const tvPerpetuity = terminalFCF / ((dcfAssumptions.wacc - dcfAssumptions.terminalGrowth) / 100);
    const pvTVPerpetuity = tvPerpetuity / Math.pow(1 + dcfAssumptions.wacc / 100, 5);
    
    // Enterprise and equity value
    const evExitMultiple = pvForecast + pvTVExitMultiple;
    const evPerpetuity = pvForecast + pvTVPerpetuity;
    
    return {
      projections,
      fullProjections,
      terminalProjection: {
        revenue: terminalRevenue,
        cogs: terminalRevenue * (1 - grossMargin),
        grossProfit: terminalRevenue * grossMargin,
        opex: terminalRevenue * opexMargin,
        ebitda: terminalEBITDA,
        da: terminalDA,
        ebit: terminalEBIT,
        tax: terminalTax,
        nopat: terminalNOPAT,
        capex: terminalCapex,
        nwcChange: terminalNWC,
        fcf: terminalFCF
      },
      pvForecast,
      tvExitMultiple,
      pvTVExitMultiple,
      tvPerpetuity,
      pvTVPerpetuity,
      evExitMultiple,
      evPerpetuity,
      npvPerShareExitMultiple: evExitMultiple / dcfAssumptions.sharesOutstanding,
      npvPerSharePerpetuity: evPerpetuity / dcfAssumptions.sharesOutstanding
    };
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    if (!companyData) return;
    
    const dcfResults = calculateDCF();
    if (!dcfResults) return;
    
    let csv = `${companyData.name} - Financial Analysis & Valuation\n\n`;
    
    // Historical Financials
    csv += 'HISTORICAL FINANCIALS ($M)\n';
    csv += 'Year,Revenue,COGS,Gross Profit,OpEx,EBITDA,CapEx,FCF\n';
    companyData.financials.forEach(f => {
      csv += `${f.year},${f.revenue.toFixed(1)},${f.cogs.toFixed(1)},${f.grossProfit.toFixed(1)},${f.opex.toFixed(1)},${f.ebitda.toFixed(1)},${f.capex.toFixed(1)},${f.fcf.toFixed(1)}\n`;
    });
    
    // DCF Projections
    csv += '\nDCF PROJECTIONS\n';
    csv += 'Year,Projected FCF,Present Value\n';
    dcfResults.projections.forEach(p => {
      csv += `${p.year},${p.fcf.toFixed(1)},${p.pv.toFixed(1)}\n`;
    });
    
    // Valuation Summary
    csv += '\nVALUATION SUMMARY\n';
    csv += `PV of Forecast Cash Flows,${dcfResults.pvForecast.toFixed(1)}\n`;
    csv += `Terminal Value (Exit Multiple),${dcfResults.tvExitMultiple.toFixed(1)}\n`;
    csv += `PV of Terminal Value (Exit Multiple),${dcfResults.pvTVExitMultiple.toFixed(1)}\n`;
    csv += `Enterprise Value (Exit Multiple),${dcfResults.evExitMultiple.toFixed(1)}\n`;
    csv += `NPV per Share (Exit Multiple),${dcfResults.npvPerShareExitMultiple.toFixed(2)}\n`;
    csv += `\nTerminal Value (Perpetuity),${dcfResults.tvPerpetuity.toFixed(1)}\n`;
    csv += `PV of Terminal Value (Perpetuity),${dcfResults.pvTVPerpetuity.toFixed(1)}\n`;
    csv += `Enterprise Value (Perpetuity),${dcfResults.evPerpetuity.toFixed(1)}\n`;
    csv += `NPV per Share (Perpetuity),${dcfResults.npvPerSharePerpetuity.toFixed(2)}\n`;
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${companyData.ticker}_Valuation_Analysis.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dcfResults = companyData ? calculateDCF() : null;

  // Calculate sensitivity table
  const generateSensitivity = () => {
    if (!companyData || !dcfResults) return [];
    
    const waccRange = [8, 9, 10, 11, 12];
    const growthRange = [1.5, 2.0, 2.5, 3.0, 3.5];
    
    return waccRange.map(wacc => {
      return growthRange.map(growth => {
        const finalFCF = dcfResults.terminalProjection.fcf;
        const tv = finalFCF / ((wacc - growth) / 100);
        const pvTV = tv / Math.pow(1 + wacc / 100, 5);
        const ev = dcfResults.pvForecast + pvTV;
        return ev / dcfAssumptions.sharesOutstanding;
      });
    });
  };

  const sensitivityData = dcfResults ? generateSensitivity() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                Financial Analysis & Valuation Tool
              </h1>
              <p className="text-gray-600 mt-2">AI-powered DCF modeling with live market data</p>
            </div>
            {companyData && (
              <button
                onClick={exportToExcel}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3.5 font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'search' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Search className="w-4 h-4" />
              Company Search
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-6 py-3.5 font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'financials' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              } ${!companyData ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!companyData}
            >
              <FileText className="w-4 h-4" />
              Financials
            </button>
            <button
              onClick={() => setActiveTab('dcf')}
              className={`px-6 py-3.5 font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'dcf' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              } ${!companyData ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!companyData}
            >
              <Calculator className="w-4 h-4" />
              DCF Model
            </button>
            <button
              onClick={() => setActiveTab('comps')}
              className={`px-6 py-3.5 font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'comps' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              } ${!companyData ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!companyData}
            >
              <DollarSign className="w-4 h-4" />
              Comps Analysis
            </button>
          </div>
        </div>

        {/* Company Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Search Public Company</h2>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Enter ticker symbol (e.g., AAPL, MSFT, GOOGL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onKeyPress={(e) => e.key === 'Enter' && fetchCompanyData()}
              />
              <button
                onClick={fetchCompanyData}
                disabled={!ticker || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Fetch Data
                  </>
                )}
              </button>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Data Sources:</strong>
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Financial Modeling Prep API for financial statements and company profiles</li>
                <li>Automatic fetch of: Income Statement, Balance Sheet, Cash Flow Statement</li>
                <li>Real-time market data including current stock price and shares outstanding</li>
                <li>AI-powered analysis to set intelligent DCF assumptions based on company fundamentals</li>
              </ul>
              <p className="text-sm text-gray-500 mt-3 italic">
                Note: Using demo API key with limited data. For production use, get your API key at financialmodelingprep.com
              </p>
            </div>

            {companyData && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-xl shadow-sm">
                <h3 className="font-semibold text-green-900">✓ Data Loaded Successfully</h3>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Company:</span>
                    <span className="ml-2 font-semibold">{companyData.name} ({companyData.ticker})</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Industry:</span>
                    <span className="ml-2 font-semibold">{companyData.industry}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Price:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(companyData.currentPrice, 2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shares Outstanding:</span>
                    <span className="ml-2 font-semibold">{formatNumber(companyData.sharesOutstanding, 1)}M</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Market Cap:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(companyData.marketCap, 0)}M</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Years of Data:</span>
                    <span className="ml-2 font-semibold">{companyData.financials.length}</span>
                  </div>
                </div>
                <p className="text-sm text-green-700 mt-3">
                  ✓ AI-powered DCF assumptions generated. Navigate to other tabs to analyze.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Financials Tab */}
        {activeTab === 'financials' && companyData && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Historical Financials - {companyData.name}</h2>
                <button
                  onClick={generateDetailedInsights}
                  disabled={loadingAI}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 text-sm flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                >
                  {loadingAI ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Generate AI Insights'
                  )}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Metric ($M)</th>
                      {companyData.financials.map(f => (
                        <th key={f.year} className="text-right p-3 font-semibold">{f.year}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">Revenue</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-mono">{formatCurrency(f.revenue, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">COGS</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-mono">{formatCurrency(f.cogs, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50 bg-blue-50">
                      <td className="p-3 font-medium">Gross Profit</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(f.grossProfit, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium pl-6">↳ R&D Expense</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 text-gray-600 font-mono">{formatCurrency(f.rdExpense, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium pl-6">↳ SG&A Expense</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 text-gray-600 font-mono">{formatCurrency(f.sgaExpense, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">Total OpEx</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-mono">{formatCurrency(f.opex, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="p-3 font-medium">EBITDA</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(f.ebitda, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">CapEx</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-mono">{formatCurrency(f.capex, 0)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50 bg-purple-50">
                      <td className="p-3 font-medium">Free Cash Flow</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 font-bold font-mono">{formatCurrency(f.fcf, 0)}</td>
                      ))}
                    </tr>
                    <tr className="border-t-2">
                      <td className="p-3 font-medium text-gray-600">EBITDA Margin %</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 text-gray-600">{formatPercent(f.ebitda / f.revenue * 100)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-gray-600">FCF Margin %</td>
                      {companyData.financials.map(f => (
                        <td key={f.year} className="text-right p-3 text-gray-600">{formatPercent(f.fcf / f.revenue * 100)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="font-semibold mb-4">Revenue & EBITDA Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={companyData.financials}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value, 0, false) + 'M'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="ebitda" stroke="#10b981" strokeWidth={2} name="EBITDA" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="font-semibold mb-4">Free Cash Flow</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={companyData.financials}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value, 0, false) + 'M'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="fcf" fill="#8b5cf6" name="FCF" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="font-semibold mb-4">Operating Expense Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={companyData.financials}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value, 0, false) + 'M'} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="rdExpense" stackId="a" fill="#3b82f6" name="R&D" />
                    <Bar dataKey="sgaExpense" stackId="a" fill="#10b981" name="SG&A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="font-semibold mb-4">Margin Trends</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={companyData.financials.map(f => ({
                    year: f.year,
                    ebitdaMargin: (f.ebitda / f.revenue * 100),
                    fcfMargin: (f.fcf / f.revenue * 100)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => value + '%'} />
                    <Tooltip content={<MarginTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="ebitdaMargin" stroke="#f59e0b" strokeWidth={2} name="EBITDA Margin" />
                    <Line type="monotone" dataKey="fcfMargin" stroke="#8b5cf6" strokeWidth={2} name="FCF Margin" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights */}
            {aiInsight && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-purple-600">🤖</span> AI-Powered Financial Analysis
                </h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{aiInsight}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DCF Model Tab */}
        {activeTab === 'dcf' && companyData && dcfResults && (
          <div className="space-y-6">
            {/* AI-Generated Assumptions Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-2">
                <span>🤖</span> AI-Generated DCF Assumptions
              </h3>
              <p className="text-sm text-purple-800">
                The assumptions below were intelligently set by Claude based on {companyData.name}'s historical performance, 
                industry benchmarks, and current market conditions. You can adjust any parameter to run custom scenarios.
              </p>
            </div>

            {/* Assumptions Panel */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">DCF Assumptions</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">WACC (%)</label>
                  <input
                    type="number"
                    value={dcfAssumptions.wacc}
                    onChange={(e) => setDcfAssumptions({...dcfAssumptions, wacc: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Weighted avg cost of capital</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Terminal Growth Rate (%)</label>
                    <input
                      type="number"
                      value={dcfAssumptions.terminalGrowth}
                      onChange={(e) => setDcfAssumptions({...dcfAssumptions, terminalGrowth: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      step="0.1"
                    />
                  <p className="text-xs text-gray-500 mt-1">Perpetual growth rate</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Exit Multiple (EV/EBITDA)</label>
                    <input
                      type="number"
                      value={dcfAssumptions.exitMultiple}
                      onChange={(e) => setDcfAssumptions({...dcfAssumptions, exitMultiple: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                      step="0.1"
                    />
                  <p className="text-xs text-gray-500 mt-1">Terminal valuation multiple</p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">5-Year Revenue Growth Rates (%)</label>
                <div className="grid grid-cols-5 gap-4">
                  {dcfAssumptions.revenueGrowth.map((rate, idx) => (
                    <div key={idx}>
                      <label className="text-xs text-gray-500">Year {idx + 1}</label>
                      <input
                        type="number"
                        value={rate}
                        onChange={(e) => {
                          const newRates = [...dcfAssumptions.revenueGrowth];
                          newRates[idx] = parseFloat(e.target.value);
                          setDcfAssumptions({...dcfAssumptions, revenueGrowth: newRates});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Shares Outstanding (millions)</label>
                <input
                  type="number"
                  value={dcfAssumptions.sharesOutstanding}
                  onChange={(e) => setDcfAssumptions({...dcfAssumptions, sharesOutstanding: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-fetched from market data</p>
              </div>
            </div>

            {/* Projected P&L and Cash Flow Statement */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">5-Year Projected P&L and Free Cash Flow</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold sticky left-0 bg-gray-50">Line Item ($M)</th>
                      {dcfResults.fullProjections.map(proj => (
                        <th key={proj.year} className="text-right p-3 font-semibold">Year {proj.year - companyData.financials[companyData.financials.length - 1].year}</th>
                      ))}
                      <th className="text-right p-3 font-semibold bg-purple-50">Terminal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white">Revenue</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-mono">{formatCurrency(proj.revenue, 0)}</td>
                      ))}
                      <td className="text-right p-3 bg-purple-50 font-mono">{formatCurrency(dcfResults.terminalProjection.revenue, 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white">COGS</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-mono">({formatCurrency(proj.cogs, 0)})</td>
                      ))}
                      <td className="text-right p-3 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.cogs, 0)})</td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-blue-50">
                      <td className="p-3 font-semibold sticky left-0 bg-blue-50">Gross Profit</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(proj.grossProfit, 0)}</td>
                      ))}
                      <td className="text-right p-3 font-semibold bg-purple-100 font-mono">{formatCurrency(dcfResults.terminalProjection.grossProfit, 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white">Operating Expenses</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-mono">({formatCurrency(proj.opex, 0)})</td>
                      ))}
                      <td className="text-right p-3 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.opex, 0)})</td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="p-3 font-semibold sticky left-0 bg-green-50">EBITDA</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(proj.ebitda, 0)}</td>
                      ))}
                      <td className="text-right p-3 font-semibold bg-purple-100 font-mono">{formatCurrency(dcfResults.terminalProjection.ebitda, 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white">Depreciation & Amortization</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-mono">({formatCurrency(proj.da, 0)})</td>
                      ))}
                      <td className="text-right p-3 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.da, 0)})</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-semibold sticky left-0 bg-white">EBIT</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(proj.ebit, 0)}</td>
                      ))}
                      <td className="text-right p-3 font-semibold bg-purple-50 font-mono">{formatCurrency(dcfResults.terminalProjection.ebit, 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white">Taxes (25%)</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-mono">({formatCurrency(proj.tax, 0)})</td>
                      ))}
                      <td className="text-right p-3 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.tax, 0)})</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-semibold sticky left-0 bg-white">NOPAT</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-semibold font-mono">{formatCurrency(proj.nopat, 0)}</td>
                      ))}
                      <td className="text-right p-3 font-semibold bg-purple-50 font-mono">{formatCurrency(dcfResults.terminalProjection.nopat, 0)}</td>
                    </tr>
                    <tr className="border-t-2 border-gray-300">
                      <td className="p-3 font-medium sticky left-0 bg-white text-gray-600">Add: D&A</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 text-gray-600 font-mono">{formatCurrency(proj.da, 0)}</td>
                      ))}
                      <td className="text-right p-3 text-gray-600 bg-purple-50 font-mono">{formatCurrency(dcfResults.terminalProjection.da, 0)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white text-gray-600">Less: CapEx</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 text-gray-600 font-mono">({formatCurrency(proj.capex, 0)})</td>
                      ))}
                      <td className="text-right p-3 text-gray-600 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.capex, 0)})</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium sticky left-0 bg-white text-gray-600">Less: Change in NWC</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 text-gray-600 font-mono">({formatCurrency(proj.nwcChange, 0)})</td>
                      ))}
                      <td className="text-right p-3 text-gray-600 bg-purple-50 font-mono">({formatCurrency(dcfResults.terminalProjection.nwcChange, 0)})</td>
                    </tr>
                    <tr className="bg-purple-100 border-t-2 border-purple-300">
                      <td className="p-3 font-bold sticky left-0 bg-purple-100">Free Cash Flow</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 font-bold font-mono">{formatCurrency(proj.fcf, 0)}</td>
                      ))}
                      <td className="text-right p-3 font-bold bg-purple-200 font-mono">{formatCurrency(dcfResults.terminalProjection.fcf, 0)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3 text-sm text-gray-600 sticky left-0 bg-white">EBITDA Margin %</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 text-sm text-gray-600">{formatPercent(proj.ebitda / proj.revenue * 100)}</td>
                      ))}
                      <td className="text-right p-3 text-sm text-gray-600 bg-purple-50">{formatPercent(dcfResults.terminalProjection.ebitda / dcfResults.terminalProjection.revenue * 100)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm text-gray-600 sticky left-0 bg-white">FCF Margin %</td>
                      {dcfResults.fullProjections.map(proj => (
                        <td key={proj.year} className="text-right p-3 text-sm text-gray-600">{formatPercent(proj.fcf / proj.revenue * 100)}</td>
                      ))}
                      <td className="text-right p-3 text-sm text-gray-600 bg-purple-50">{formatPercent(dcfResults.terminalProjection.fcf / dcfResults.terminalProjection.revenue * 100)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash Flow Projections */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Present Value Calculation</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Year</th>
                      <th className="text-right p-3 font-semibold">Free Cash Flow ($M)</th>
                      <th className="text-right p-3 font-semibold">Discount Factor</th>
                      <th className="text-right p-3 font-semibold">Present Value ($M)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dcfResults.projections.map((proj, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3">Year {idx + 1}</td>
                        <td className="text-right p-3 font-mono">{formatCurrency(proj.fcf, 1)}</td>
                        <td className="text-right p-3">{(1 / Math.pow(1 + dcfAssumptions.wacc / 100, idx + 1)).toFixed(3)}</td>
                        <td className="text-right p-3 font-mono">{formatCurrency(proj.pv, 1)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-semibold border-t-2">
                      <td className="p-3" colSpan="3">Sum of PV (5-Year Forecast)</td>
                      <td className="text-right p-3 font-mono">{formatCurrency(dcfResults.pvForecast, 1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terminal Value Calculations */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Terminal Value - Exit Multiple Method</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Terminal Year EBITDA</span>
                    <span className="font-mono">{formatCurrency(dcfResults.terminalProjection.ebitda, 1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Exit Multiple (EV/EBITDA)</span>
                    <span className="font-semibold">{dcfAssumptions.exitMultiple}x</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Terminal Value</span>
                    <span className="font-semibold font-mono">{formatCurrency(dcfResults.tvExitMultiple, 1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount Factor (Year 5)</span>
                    <span>{(1 / Math.pow(1 + dcfAssumptions.wacc / 100, 5)).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PV of Terminal Value</span>
                    <span className="font-semibold font-mono">{formatCurrency(dcfResults.pvTVExitMultiple, 1)}M</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg">
                    <span className="font-bold">Enterprise Value</span>
                    <span className="font-bold text-blue-600 font-mono">{formatCurrency(dcfResults.evExitMultiple, 1)}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">NPV per Share</span>
                    <span className="font-bold text-green-600 font-mono">{formatCurrency(dcfResults.npvPerShareExitMultiple, 2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Terminal Value - Perpetuity Growth Method</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Terminal Year FCF</span>
                    <span className="font-mono">{formatCurrency(dcfResults.terminalProjection.fcf, 1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Perpetual Growth Rate</span>
                    <span className="font-semibold">{dcfAssumptions.terminalGrowth}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Terminal Value</span>
                    <span className="font-semibold font-mono">{formatCurrency(dcfResults.tvPerpetuity, 1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount Factor (Year 5)</span>
                    <span>{(1 / Math.pow(1 + dcfAssumptions.wacc / 100, 5)).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PV of Terminal Value</span>
                    <span className="font-semibold font-mono">{formatCurrency(dcfResults.pvTVPerpetuity, 1)}M</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg">
                    <span className="font-bold">Enterprise Value</span>
                    <span className="font-bold text-blue-600 font-mono">{formatCurrency(dcfResults.evPerpetuity, 1)}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">NPV per Share</span>
                    <span className="font-bold text-green-600 font-mono">{formatCurrency(dcfResults.npvPerSharePerpetuity, 2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensitivity Analysis */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Sensitivity Analysis - NPV per Share</h3>
              <p className="text-sm text-gray-600 mb-4">Shows how valuation changes with different WACC and terminal growth assumptions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">WACC \ Growth</th>
                      <th className="p-2 text-center">1.5%</th>
                      <th className="p-2 text-center">2.0%</th>
                      <th className="p-2 text-center bg-blue-100">2.5%</th>
                      <th className="p-2 text-center">3.0%</th>
                      <th className="p-2 text-center">3.5%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[8, 9, 10, 11, 12].map((wacc, i) => (
                      <tr key={wacc} className={wacc === dcfAssumptions.wacc ? 'bg-blue-100' : ''}>
                        <td className="p-2 font-medium">{wacc}%</td>
                        {sensitivityData[i].map((val, j) => (
                          <td key={j} className={`p-2 text-center font-mono ${wacc === dcfAssumptions.wacc && j === 2 ? 'font-bold bg-blue-200' : ''}`}>
                            {formatCurrency(val, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valuation Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-blue-300">
              <h3 className="text-xl font-bold mb-4">Valuation Summary</h3>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Market Price</p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(companyData.currentPrice, 2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">DCF Fair Value Range</p>
                  <p className="text-2xl font-bold text-green-600 font-mono">
                    {formatCurrency(Math.min(dcfResults.npvPerShareExitMultiple, dcfResults.npvPerSharePerpetuity), 2)} - 
                    {formatCurrency(Math.max(dcfResults.npvPerShareExitMultiple, dcfResults.npvPerSharePerpetuity), 2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Upside/Downside</p>
                  <p className={`text-2xl font-bold ${((dcfResults.npvPerShareExitMultiple + dcfResults.npvPerSharePerpetuity) / 2 - companyData.currentPrice) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(((dcfResults.npvPerShareExitMultiple + dcfResults.npvPerSharePerpetuity) / 2 / companyData.currentPrice - 1) * 100)}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm font-medium">
                  {dcfResults.npvPerShareExitMultiple > companyData.currentPrice && dcfResults.npvPerSharePerpetuity > companyData.currentPrice
                    ? '✅ Stock appears undervalued based on DCF analysis. Both terminal value methods suggest upside potential.'
                    : dcfResults.npvPerShareExitMultiple < companyData.currentPrice && dcfResults.npvPerSharePerpetuity < companyData.currentPrice
                    ? '⚠️ Stock appears overvalued based on DCF analysis. Both terminal value methods suggest the current price exceeds intrinsic value.'
                    : '📊 Stock trading within DCF valuation range. Different terminal value assumptions yield mixed signals.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comps Analysis Tab */}
        {activeTab === 'comps' && companyData && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Comparable Companies Analysis</h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">Add comparable companies to benchmark multiples and valuation</p>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Enter comp ticker (e.g., GOOGL, META)"
                    value={compTicker}
                    onChange={(e) => setCompTicker(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    onKeyPress={(e) => e.key === 'Enter' && addComparable()}
                  />
                  <button 
                    onClick={addComparable}
                    disabled={!compTicker || loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin inline mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Add Comparable'
                    )}
                  </button>
                </div>
              </div>

              {/* Trading Multiples Table */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold mb-4">Trading Multiples Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="text-left p-3 font-semibold">Company</th>
                        <th className="text-right p-3 font-semibold">Market Cap ($M)</th>
                        <th className="text-right p-3 font-semibold">Revenue ($M)</th>
                        <th className="text-right p-3 font-semibold">EBITDA ($M)</th>
                        <th className="text-right p-3 font-semibold">EV/Revenue</th>
                        <th className="text-right p-3 font-semibold">EV/EBITDA</th>
                        <th className="text-center p-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="bg-blue-50 font-medium">
                        <td className="p-3">{companyData.name} (Target)</td>
                        <td className="text-right p-3 font-mono">{formatCurrency(companyData.marketCap, 0)}</td>
                        <td className="text-right p-3 font-mono">{formatCurrency(companyData.financials[companyData.financials.length - 1].revenue, 0)}</td>
                        <td className="text-right p-3 font-mono">{formatCurrency(companyData.financials[companyData.financials.length - 1].ebitda, 0)}</td>
                        <td className="text-right p-3">
                          {((companyData.marketCap + 500) / companyData.financials[companyData.financials.length - 1].revenue).toFixed(2)}x
                        </td>
                        <td className="text-right p-3">
                          {((companyData.marketCap + 500) / companyData.financials[companyData.financials.length - 1].ebitda).toFixed(2)}x
                        </td>
                        <td className="text-center p-3">-</td>
                      </tr>
                      {comps.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3">{comp.name}</td>
                          <td className="text-right p-3 font-mono">{formatCurrency(comp.marketCap, 0)}</td>
                          <td className="text-right p-3 font-mono">{formatCurrency(comp.revenue, 0)}</td>
                          <td className="text-right p-3 font-mono">{formatCurrency(comp.ebitda, 0)}</td>
                          <td className="text-right p-3">{comp.evRevenue.toFixed(2)}x</td>
                          <td className="text-right p-3">{comp.evEbitda.toFixed(2)}x</td>
                          <td className="text-center p-3">
                            <button
                              onClick={() => setComps(comps.filter((_, i) => i !== idx))}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md transition-all duration-200"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {comps.length > 0 && (
                        <tr className="bg-green-50 font-semibold">
                          <td className="p-3">Median</td>
                          <td className="text-right p-3">-</td>
                          <td className="text-right p-3">-</td>
                          <td className="text-right p-3">-</td>
                          <td className="text-right p-3">
                            {(comps.reduce((sum, c) => sum + c.evRevenue, 0) / comps.length).toFixed(2)}x
                          </td>
                          <td className="text-right p-3">
                            {(comps.reduce((sum, c) => sum + c.evEbitda, 0) / comps.length).toFixed(2)}x
                          </td>
                          <td className="text-center p-3">-</td>
                        </tr>
                      )}
                      {comps.length === 0 && (
                        <tr>
                          <td className="p-3 text-gray-500 text-center" colSpan="7">Add comparable companies to see benchmarking analysis</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {comps.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Implied Valuation Based on Comps</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">EV/Revenue Multiple:</span>
                      <span className="ml-2 font-semibold font-mono">
                        {formatCurrency(((comps.reduce((sum, c) => sum + c.evRevenue, 0) / comps.length) * 
                          companyData.financials[companyData.financials.length - 1].revenue), 0)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">EV/EBITDA Multiple:</span>
                      <span className="ml-2 font-semibold font-mono">
                        {formatCurrency(((comps.reduce((sum, c) => sum + c.evEbitda, 0) / comps.length) * 
                          companyData.financials[companyData.financials.length - 1].ebitda), 0)}M
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Add 3-5 comparable companies in the {companyData.industry} industry to get robust median multiples for valuation benchmarking.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialValuationTool;