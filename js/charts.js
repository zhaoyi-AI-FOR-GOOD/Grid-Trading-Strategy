/**
 * 图表可视化模块
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            light: '#f8f9fa',
            dark: '#343a40'
        };
    }

    /**
     * 创建账户价值vs价格图表
     * @param {string} canvasId - 画布ID
     * @param {Array} equityData - 资产价值数据
     */
    createEquityChart(canvasId, equityData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // 销毁已存在的图表
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = equityData.map(d => new Date(d.timestamp).toLocaleDateString());
        const equityValues = equityData.map(d => d.totalValue);
        const priceValues = equityData.map(d => d.price);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '账户总价值 (USDT)',
                        data: equityValues,
                        borderColor: this.colors.primary,
                        backgroundColor: this.colors.primary + '20',
                        yAxisID: 'y',
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: 'ETH价格 (USDT)',
                        data: priceValues,
                        borderColor: this.colors.warning,
                        backgroundColor: this.colors.warning + '20',
                        yAxisID: 'y1',
                        fill: false,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '账户价值 (USDT)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'ETH价格 (USDT)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '账户价值 vs ETH价格走势'
                    },
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.label.includes('账户')) {
                                        label += '$' + context.parsed.y.toLocaleString();
                                    } else {
                                        label += '$' + context.parsed.y.toFixed(2);
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 创建交易历史图表
     * @param {string} canvasId - 画布ID
     * @param {Array} trades - 交易历史
     * @param {Array} equityData - 资产价值数据
     */
    createTradesChart(canvasId, trades, equityData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // 销毁已存在的图表
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // 准备数据
        const labels = equityData.map(d => new Date(d.timestamp).toLocaleDateString());
        const priceData = equityData.map(d => d.price);
        
        // 买入和卖出点
        const buyPoints = trades.filter(t => t.type === 'buy').map(t => ({
            x: new Date(t.timestamp).toLocaleDateString(),
            y: t.price
        }));

        const sellPoints = trades.filter(t => t.type === 'sell').map(t => ({
            x: new Date(t.timestamp).toLocaleDateString(),
            y: t.price
        }));

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ETH价格',
                        data: priceData,
                        borderColor: this.colors.info,
                        backgroundColor: this.colors.info + '10',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 1
                    },
                    {
                        label: '买入点',
                        data: buyPoints,
                        backgroundColor: this.colors.success,
                        borderColor: this.colors.success,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    },
                    {
                        label: '卖出点',
                        data: sellPoints,
                        backgroundColor: this.colors.danger,
                        borderColor: this.colors.danger,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'point',
                    intersect: true,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'ETH价格 (USDT)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '交易历史 - 买卖点分析'
                    },
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += '$' + context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 创建盈亏分布图
     * @param {string} canvasId - 画布ID
     * @param {Array} trades - 交易历史
     */
    createProfitDistributionChart(canvasId, trades) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const sellTrades = trades.filter(t => t.type === 'sell' && t.profit !== undefined);
        
        if (sellTrades.length === 0) {
            return;
        }

        // 销毁已存在的图表
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // 按利润分组
        const profitBins = this.createProfitBins(sellTrades);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: profitBins.labels,
                datasets: [{
                    label: '交易次数',
                    data: profitBins.counts,
                    backgroundColor: profitBins.labels.map(label => 
                        label.includes('-') ? this.colors.danger : this.colors.success
                    ),
                    borderColor: profitBins.labels.map(label => 
                        label.includes('-') ? this.colors.danger : this.colors.success
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '交易次数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '利润区间 (%)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '交易利润分布'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * 创建利润分组
     * @param {Array} sellTrades - 卖出交易
     * @returns {Object} 分组数据
     */
    createProfitBins(sellTrades) {
        const bins = {
            '< -2%': 0,
            '-2% ~ -1%': 0,
            '-1% ~ 0%': 0,
            '0% ~ 1%': 0,
            '1% ~ 2%': 0,
            '2% ~ 3%': 0,
            '> 3%': 0
        };

        sellTrades.forEach(trade => {
            const profitPct = trade.profitPct * 100;
            
            if (profitPct < -2) bins['< -2%']++;
            else if (profitPct < -1) bins['-2% ~ -1%']++;
            else if (profitPct < 0) bins['-1% ~ 0%']++;
            else if (profitPct < 1) bins['0% ~ 1%']++;
            else if (profitPct < 2) bins['1% ~ 2%']++;
            else if (profitPct < 3) bins['2% ~ 3%']++;
            else bins['> 3%']++;
        });

        return {
            labels: Object.keys(bins),
            counts: Object.values(bins)
        };
    }

    /**
     * 创建回撤分析图
     * @param {string} canvasId - 画布ID
     * @param {Array} equityData - 资产价值数据
     */
    createDrawdownChart(canvasId, equityData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // 销毁已存在的图表
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // 计算回撤
        const drawdownData = this.calculateDrawdown(equityData);
        const labels = equityData.map(d => new Date(d.timestamp).toLocaleDateString());

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '回撤 (%)',
                    data: drawdownData,
                    borderColor: this.colors.danger,
                    backgroundColor: this.colors.danger + '20',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '回撤百分比 (%)'
                        },
                        max: 0,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '回撤分析'
                    },
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    /**
     * 计算回撤数据
     * @param {Array} equityData - 资产价值数据
     * @returns {Array} 回撤数据
     */
    calculateDrawdown(equityData) {
        let maxValue = equityData[0].totalValue;
        const drawdownData = [];

        equityData.forEach(point => {
            if (point.totalValue > maxValue) {
                maxValue = point.totalValue;
            }
            
            const drawdown = -(maxValue - point.totalValue) / maxValue * 100;
            drawdownData.push(drawdown);
        });

        return drawdownData;
    }

    /**
     * 更新图表
     * @param {string} canvasId - 画布ID
     * @param {Array} newData - 新数据
     */
    updateChart(canvasId, newData) {
        if (this.charts[canvasId]) {
            const chart = this.charts[canvasId];
            chart.data = newData;
            chart.update();
        }
    }

    /**
     * 销毁图表
     * @param {string} canvasId - 画布ID
     */
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    /**
     * 销毁所有图表
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(canvasId => {
            this.destroyChart(canvasId);
        });
    }

    /**
     * 获取图表截图（base64）
     * @param {string} canvasId - 画布ID
     * @returns {string} base64图片数据
     */
    getChartImage(canvasId) {
        if (this.charts[canvasId]) {
            return this.charts[canvasId].toBase64Image();
        }
        return null;
    }

    /**
     * 设置图表主题
     * @param {string} theme - 主题名称 ('light' 或 'dark')
     */
    setTheme(theme) {
        if (theme === 'dark') {
            this.colors.light = '#2c3e50';
            this.colors.dark = '#ecf0f1';
        } else {
            this.colors.light = '#f8f9fa';
            this.colors.dark = '#343a40';
        }

        // 重新渲染所有图表
        Object.values(this.charts).forEach(chart => {
            chart.update();
        });
    }
}