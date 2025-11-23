import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import './CandlestickChart.css';

export interface CandlestickChartProps {
  symbol?: string;
}

// Generate mock candlestick data
const generateMockData = () => {
  const data = [];
  const basePrice = 2845;
  let currentTime = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // 30 days ago

  for (let i = 0; i < 30; i++) {
    const open = basePrice + (Math.random() - 0.5) * 100;
    const close = open + (Math.random() - 0.5) * 80;
    const high = Math.max(open, close) + Math.random() * 30;
    const low = Math.min(open, close) - Math.random() * 30;

    data.push({
      time: currentTime as any,
      open,
      high,
      low,
      close,
    });

    currentTime += 24 * 60 * 60; // Add 1 day
  }

  return data;
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ symbol = 'ETH/USDC' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a0b3cc',
      },
      grid: {
        vertLines: { color: 'rgba(0, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(0, 255, 255, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      timeScale: {
        borderColor: 'rgba(0, 255, 255, 0.3)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 255, 255, 0.3)',
      },
      crosshair: {
        vertLine: {
          color: '#00ffff',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00ffff',
        },
        horzLine: {
          color: '#00ffff',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00ffff',
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series with cyberpunk colors
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ffff', // Neon cyan for bullish (green equivalent)
      downColor: '#ff00ff', // Neon pink for bearish (red equivalent)
      borderVisible: false,
      wickUpColor: '#00ffff',
      wickDownColor: '#ff00ff',
    });

    seriesRef.current = candlestickSeries;

    // Set mock data
    const mockData = generateMockData();
    candlestickSeries.setData(mockData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="candlestick-chart-container">
      <div ref={chartContainerRef} className="candlestick-chart" />
    </div>
  );
};
