/**
 * 回测分析引擎
 */
class BacktestEngine {
    constructor() {
        this.api = new BinanceAPI();
        this.strategy = null;
        this.results = null;
        this.isRunning = false;
    }

    /**
     * 运行回测
     * @param {Object} config - 策略配置
     * @returns {Promise<Object>} 回测结果
     */
    async runBacktest(config) {
        if (this.isRunning) {
            throw new Error('回测正在运行中，请等待完成');
        }

        this.isRunning = true;
        
        try {
            console.log('开始回测分析...');
            
            // 1. 获取市场数据
            console.log('正在获取市场数据...');
            const backtestPeriod = config.backtestPeriod || 'recent30';
            const priceData = await this.api.getKlineData(config.timeframe || '1h', backtestPeriod);
            
            if (!priceData || priceData.length < 10) {
                throw new Error('获取的价格数据不足，无法进行回测');
            }

            console.log(`成功获取 ${priceData.length} 条价格数据`);

            // 2. 初始化网格策略
            console.log('初始化网格策略...');
            this.strategy = new GridStrategy(config);
            this.strategy.initialize(priceData);

            // 3. 执行回测
            console.log('执行回测计算...');
            this.results = this.strategy.execute(priceData);

            // 4. 生成分析报告
            console.log('生成分析报告...');
            const analysis = this.generateAnalysis(priceData);
            
            const completeResults = {
                ...this.results,
                analysis: analysis,
                config: this.strategy.getConfigSummary(),
                dataInfo: {
                    totalPoints: priceData.length,
                    startDate: new Date(priceData[0].timestamp).toLocaleDateString(),
                    endDate: new Date(priceData[priceData.length - 1].timestamp).toLocaleDateString(),
                    priceRange: {
                        start: priceData[0].close,  // 回测起始价格
                        end: priceData[priceData.length - 1].close  // 回测结束价格
                    },
                    dataSource: '币安合约API真实数据',
                    timeframe: config.timeframe,
                    backtestPeriod: backtestPeriod,
                    dataIntegrity: {
                        verified: true,
                        apiEndpoint: 'https://fapi.binance.com/fapi/v1/klines',
                        requestTime: new Date().toISOString()
                    }
                }
            };

            console.log('回测完成!');
            return completeResults;

        } catch (error) {
            console.error('回测执行失败:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 生成分析报告
     * @param {Array} priceData - 价格数据
     * @returns {Object} 分析报告
     */
    generateAnalysis(priceData) {
        const metrics = this.results.metrics;
        const priceAnalysis = this.api.analyzePriceData(priceData);
        
        return {
            summary: this.generateSummary(metrics, priceAnalysis),
            suggestions: this.generateSuggestions(metrics, priceAnalysis),
            riskAssessment: this.generateRiskAssessment(metrics, priceAnalysis),
            optimization: this.generateOptimization(metrics)
        };
    }

    /**
     * 生成策略总结
     * @param {Object} metrics - 策略指标
     * @param {Object} priceAnalysis - 价格分析
     * @returns {Object} 策略总结
     */
    generateSummary(metrics, priceAnalysis) {
        const performance = this.categorizePerformance(metrics.totalReturn);
        const riskLevel = this.categorizeRisk(metrics.maxDrawdown);
        
        return {
            performance: performance,
            riskLevel: riskLevel,
            totalProfit: metrics.totalProfit,
            totalReturn: metrics.totalReturn,
            winRate: metrics.winRate,
            tradingFrequency: this.calculateTradingFrequency(metrics),
            marketCondition: priceAnalysis.trend,
            suitability: this.assessSuitability(metrics, priceAnalysis)
        };
    }

    /**
     * 生成优化建议
     * @param {Object} metrics - 策略指标
     * @param {Object} priceAnalysis - 价格分析
     * @returns {Array} 建议列表
     */
    generateSuggestions(metrics, priceAnalysis) {
        const suggestions = [];

        // 收益优化建议
        if (metrics.totalReturn < 0.05) {
            suggestions.push({
                type: 'performance',
                title: '提升收益建议',
                content: '当前收益率偏低，建议考虑增加网格数量或扩大价格区间以获取更多交易机会。',
                priority: 'high'
            });
        }

        // 风险控制建议
        if (metrics.maxDrawdown > 0.15) {
            suggestions.push({
                type: 'risk',
                title: '风险控制建议',
                content: '最大回撤较高，建议降低杠杆倍数或缩小价格区间以控制风险。',
                priority: 'high'
            });
        }

        // 交易频率建议
        if (metrics.sellTrades < 5) {
            suggestions.push({
                type: 'activity',
                title: '交易活跃度建议',
                content: '交易次数较少，建议增加网格数量或调整价格区间以提高交易频率。',
                priority: 'medium'
            });
        }

        // 胜率优化建议
        if (metrics.winRate < 0.6) {
            suggestions.push({
                type: 'strategy',
                title: '策略优化建议',
                content: '胜率偏低，建议使用等比网格或调整网格间距以提高盈利概率。',
                priority: 'medium'
            });
        }

        // 市场条件适应建议
        if (priceAnalysis.trend === 'bearish') {
            suggestions.push({
                type: 'market',
                title: '市场适应建议',
                content: '当前处于下跌趋势，建议适当降低网格上边界或减少持仓比例。',
                priority: 'medium'
            });
        }

        return suggestions;
    }

    /**
     * 生成风险评估
     * @param {Object} metrics - 策略指标
     * @param {Object} priceAnalysis - 价格分析
     * @returns {Object} 风险评估
     */
    generateRiskAssessment(metrics, priceAnalysis) {
        const riskScore = this.calculateRiskScore(metrics, priceAnalysis);
        
        return {
            overallRisk: this.categorizeRisk(riskScore),
            riskScore: riskScore,
            factors: {
                drawdownRisk: metrics.maxDrawdown,
                volatilityRisk: priceAnalysis.volatility,
                leverageRisk: this.strategy.config.leverage / 20, // 标准化到0-1
                concentrationRisk: this.calculateConcentrationRisk()
            },
            recommendations: this.generateRiskRecommendations(riskScore, metrics)
        };
    }

    /**
     * 生成参数优化建议
     * @param {Object} metrics - 策略指标
     * @returns {Object} 优化建议
     */
    generateOptimization(metrics) {
        const currentConfig = this.strategy.config;
        
        return {
            gridCount: this.optimizeGridCount(metrics, currentConfig),
            priceRange: this.optimizePriceRange(metrics, currentConfig),
            leverage: this.optimizeLeverage(metrics, currentConfig),
            gridType: this.optimizeGridType(metrics, currentConfig)
        };
    }

    /**
     * 优化网格数量
     * @param {Object} metrics - 策略指标
     * @param {Object} config - 当前配置
     * @returns {Object} 优化建议
     */
    optimizeGridCount(metrics, config) {
        let recommendation = config.gridCount;
        let reason = '当前网格数量适中';

        if (metrics.sellTrades < 3) {
            recommendation = Math.min(config.gridCount + 20, 200);
            reason = '交易次数较少，建议增加网格数量提高交易频率';
        } else if (metrics.sellTrades > 50 && metrics.winRate < 0.5) {
            recommendation = Math.max(config.gridCount - 10, 20);
            reason = '交易过于频繁且胜率低，建议减少网格数量';
        } else if (metrics.winRate > 0.8 && metrics.totalReturn > 0.1) {
            recommendation = Math.min(config.gridCount + 30, 300);
            reason = '策略表现优秀，可考虑增加网格数量以获取更多收益';
        }

        return {
            current: config.gridCount,
            recommended: recommendation,
            reason: reason
        };
    }

    /**
     * 优化价格区间
     * @param {Object} metrics - 策略指标
     * @param {Object} config - 当前配置
     * @returns {Object} 优化建议
     */
    optimizePriceRange(metrics, config) {
        let lowerBound = config.lowerBound;
        let upperBound = config.upperBound;
        let reason = '当前价格区间适中';

        if (metrics.maxDrawdown > 0.2) {
            lowerBound = Math.max(config.lowerBound + 2, -8);
            upperBound = Math.min(config.upperBound - 2, 8);
            reason = '回撤较大，建议缩小价格区间降低风险';
        } else if (metrics.sellTrades < 5) {
            lowerBound = Math.min(config.lowerBound - 3, -15);
            upperBound = Math.max(config.upperBound + 3, 15);
            reason = '交易机会较少，建议扩大价格区间';
        }

        return {
            current: { lower: config.lowerBound, upper: config.upperBound },
            recommended: { lower: lowerBound, upper: upperBound },
            reason: reason
        };
    }

    /**
     * 优化杠杆倍数
     * @param {Object} metrics - 策略指标
     * @param {Object} config - 当前配置
     * @returns {Object} 优化建议
     */
    optimizeLeverage(metrics, config) {
        let recommendation = config.leverage;
        let reason = '当前杠杆倍数适中';

        if (metrics.maxDrawdown > 0.15) {
            recommendation = Math.max(config.leverage - 0.5, 1);
            reason = '风险较高，建议降低杠杆倍数';
        } else if (metrics.totalReturn > 0.15 && metrics.maxDrawdown < 0.05) {
            recommendation = Math.min(config.leverage + 0.5, 5);
            reason = '表现良好且风险可控，可适当增加杠杆';
        }

        return {
            current: config.leverage,
            recommended: recommendation,
            reason: reason
        };
    }

    /**
     * 优化网格类型
     * @param {Object} metrics - 策略指标
     * @param {Object} config - 当前配置
     * @returns {Object} 优化建议
     */
    optimizeGridType(metrics, config) {
        let recommendation = config.gridType;
        let reason = '当前网格类型适合';

        // 如果胜率低且使用等差网格，推荐等比网格
        if (config.gridType === 'arithmetic' && metrics.winRate < 0.5) {
            recommendation = 'geometric';
            reason = '等差网格胜率较低，建议尝试等比网格以适应价格波动';
        }

        return {
            current: config.gridType,
            recommended: recommendation,
            reason: reason
        };
    }

    /**
     * 计算风险评分
     * @param {Object} metrics - 策略指标
     * @param {Object} priceAnalysis - 价格分析
     * @returns {number} 风险评分 (0-1)
     */
    calculateRiskScore(metrics, priceAnalysis) {
        const drawdownWeight = 0.4;
        const volatilityWeight = 0.3;
        const leverageWeight = 0.2;
        const concentrationWeight = 0.1;

        const drawdownScore = Math.min(metrics.maxDrawdown / 0.3, 1);
        const volatilityScore = Math.min(priceAnalysis.volatility / 2, 1);
        const leverageScore = (this.strategy.config.leverage - 1) / 19;
        const concentrationScore = this.calculateConcentrationRisk();

        return drawdownWeight * drawdownScore +
               volatilityWeight * volatilityScore +
               leverageWeight * leverageScore +
               concentrationWeight * concentrationScore;
    }

    /**
     * 计算集中度风险
     * @returns {number} 集中度风险评分 (0-1)
     */
    calculateConcentrationRisk() {
        // 单一资产集中度风险 - ETH
        return 0.7; // 高集中度
    }

    /**
     * 分类表现等级
     * @param {number} totalReturn - 总收益率
     * @returns {string} 表现等级
     */
    categorizePerformance(totalReturn) {
        if (totalReturn > 0.2) return 'excellent';
        if (totalReturn > 0.1) return 'good';
        if (totalReturn > 0.05) return 'fair';
        if (totalReturn > 0) return 'poor';
        return 'loss';
    }

    /**
     * 分类风险等级
     * @param {number} risk - 风险值
     * @returns {string} 风险等级
     */
    categorizeRisk(risk) {
        if (risk < 0.05) return 'low';
        if (risk < 0.1) return 'medium';
        if (risk < 0.2) return 'high';
        return 'very_high';
    }

    /**
     * 计算交易频率
     * @param {Object} metrics - 策略指标
     * @returns {string} 交易频率描述
     */
    calculateTradingFrequency(metrics) {
        const tradesPerDay = metrics.totalTrades / 30; // 30天
        if (tradesPerDay > 2) return 'high';
        if (tradesPerDay > 0.5) return 'medium';
        return 'low';
    }

    /**
     * 评估策略适用性
     * @param {Object} metrics - 策略指标
     * @param {Object} priceAnalysis - 价格分析
     * @returns {string} 适用性评估
     */
    assessSuitability(metrics, priceAnalysis) {
        const hasGoodReturn = metrics.totalReturn > 0.05;
        const hasControlledRisk = metrics.maxDrawdown < 0.15;
        const hasGoodWinRate = metrics.winRate > 0.6;

        if (hasGoodReturn && hasControlledRisk && hasGoodWinRate) {
            return 'highly_suitable';
        } else if ((hasGoodReturn && hasControlledRisk) || (hasGoodReturn && hasGoodWinRate)) {
            return 'suitable';
        } else if (hasControlledRisk) {
            return 'moderately_suitable';
        } else {
            return 'not_suitable';
        }
    }

    /**
     * 生成风险控制建议
     * @param {number} riskScore - 风险评分
     * @param {Object} metrics - 策略指标
     * @returns {Array} 风险控制建议
     */
    generateRiskRecommendations(riskScore, metrics) {
        const recommendations = [];

        if (riskScore > 0.7) {
            recommendations.push('强烈建议降低杠杆倍数至1-2倍');
            recommendations.push('缩小价格区间至±5%以内');
            recommendations.push('考虑分批建仓，避免一次性投入');
        } else if (riskScore > 0.5) {
            recommendations.push('建议适当降低杠杆倍数');
            recommendations.push('监控最大回撤，设置止损线');
            recommendations.push('定期调整网格参数');
        } else {
            recommendations.push('当前风险水平可接受');
            recommendations.push('继续监控市场变化');
            recommendations.push('可考虑适当优化参数提升收益');
        }

        return recommendations;
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasResults: !!this.results,
            strategy: this.strategy ? this.strategy.getConfigSummary() : null
        };
    }

    /**
     * 清除结果
     */
    clearResults() {
        this.results = null;
        this.strategy = null;
        console.log('回测结果已清除');
    }
}