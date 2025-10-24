'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter, Bar } from 'react-chartjs-2';
import { BarChart3, AlertCircle } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VisualizationData {
  scatterPlotData: Array<{
    sessionId: number;
    group: string;
    songId: string;
    songIndex: number;
    introductionType: string;
    question: string;
    score: number;
    x: number;
    y: number;
  }>;
  boxPlotData: Record<string, Record<string, number[]>>;
  summaryStats: Record<string, Record<string, {
    mean: number;
    median: number;
    q1: number;
    q3: number;
    min: number;
    max: number;
    count: number;
    stdDev: number;
  }>>;
  uniqueQuestions: string[];
  uniqueIntroductionTypes: string[];
  totalSessions: number;
  totalDataPoints: number;
}

interface VisualizationSectionProps {
  isAuthenticated: boolean;
}

export function VisualizationSection({ isAuthenticated }: VisualizationSectionProps) {
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      loadVisualizationData();
    }
  }, [isAuthenticated]);

  const loadVisualizationData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/visualization');
      if (response.ok) {
        const visualizationData = await response.json();
        setData(visualizationData);
        if (visualizationData.uniqueQuestions.length > 0) {
          setSelectedQuestion(visualizationData.uniqueQuestions[0]);
        }
      } else {
        setError('Failed to load visualization data');
      }
    } catch {
      setError('Failed to load visualization data');
    } finally {
      setLoading(false);
    }
  };

  const getScatterPlotData = () => {
    if (!data || !selectedQuestion) return null;

    const questionData = data.scatterPlotData.filter(d => d.question === selectedQuestion);
    
    const datasets = data.uniqueIntroductionTypes.map((introType, index) => {
      const introData = questionData.filter(d => d.introductionType === introType);
      
      return {
        label: introType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: introData.map(d => ({ x: d.x, y: d.y })),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ][index % 5],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ][index % 5],
        borderWidth: 1,
      };
    });

    return {
      datasets
    };
  };

  const getDistributionData = () => {
    if (!data || !selectedQuestion) return null;

    const questionKey = selectedQuestion;
    const introData = data.boxPlotData[questionKey] || {};
    
    const labels = Object.keys(introData);
    const datasets = labels.map((label, index) => {
      const scores = introData[label] || [];
      const mean = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const stdDev = scores.length > 0 ? Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length) : 0;
      
      return {
        label: label.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: [mean],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ][index % 5],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ][index % 5],
        borderWidth: 1,
        errorBars: {
          y: {
            errorBarRange: [stdDev, stdDev]
          }
        }
      };
    });

    return {
      labels: ['Mean Scores'],
      datasets
    };
  };

  const getMeanComparisonData = () => {
    if (!data || !selectedQuestion) return null;

    const questionKey = selectedQuestion;
    const stats = data.summaryStats[questionKey] || {};
    
    const labels = Object.keys(stats);
    const means = labels.map(label => stats[label]?.mean || 0);
    const stdDevs = labels.map(label => stats[label]?.stdDev || 0);

    return {
      labels: labels.map(label => label.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
      datasets: [
        {
          label: 'Mean Score',
          data: means,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Standard Deviation',
          data: stdDevs,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
      ]
    };
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark-purple"></div>
          <span className="ml-3 text-gray-600">Loading visualization data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.totalDataPoints === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">No song responses found for visualization.</p>
        </div>
      </div>
    );
  }

  const scatterData = getScatterPlotData();
  const distributionData = getDistributionData();
  const meanData = getMeanComparisonData();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Visualization</h2>
          <p className="text-gray-600 mt-1">
            Scores by introduction type and song questions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{data.totalSessions}</span> sessions,{' '}
            <span className="font-medium">{data.totalDataPoints}</span> data points
          </div>
        </div>
      </div>

      {/* Question Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Question to Visualize
        </label>
        <select
          value={selectedQuestion}
          onChange={(e) => setSelectedQuestion(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dark-purple focus:border-dark-purple"
        >
          {data.uniqueQuestions.map(question => (
            <option key={question} value={question}>
              {question.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter Plot */}
        {scatterData && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Score Distribution by Introduction Type</h3>
            <div className="h-80">
              <Scatter
                data={scatterData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: `Scores for: ${selectedQuestion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                    },
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Song Position'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Score'
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Mean Comparison */}
        {meanData && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mean Scores by Introduction Type</h3>
            <div className="h-80">
              <Bar
                data={meanData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: `Mean Scores for: ${selectedQuestion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                    },
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Score'
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Distribution Chart */}
      {distributionData && (
        <div className="mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Score Distribution Comparison</h3>
            <div className="h-80">
              <Bar
                data={distributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: `Distribution for: ${selectedQuestion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                    },
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Mean Score'
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics Table */}
      {data.summaryStats[selectedQuestion] && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Introduction Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mean
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Median
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Std Dev
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(data.summaryStats[selectedQuestion]).map(([introType, stats]) => (
                  <tr key={introType}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {introType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.median.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.stdDev.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.min.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.max.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
