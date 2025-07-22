/**
 * 网格交易回测结果分析工具
 * 用于验证网格交易策略的收益率计算合理性
 */

class GridTradingAnalyzer {
    constructor() {
        this.tolerance = 0.01; // 1%的计算容差
    }

    /**
     * 分析网格交易回测结果的合理性
     * @param {Object} backTestResults - 回测结果数据
     * @returns {Object} 分析报告
     */
    analyzeBacktestResults(backTestResults) {
        const analysis = {
            inputValidation: this.validateInputs(backTestResults),
            priceBreakoutAnalysis: this.analyzePriceBreakout(backTestResults),
            leverageEffectAnalysis: this.analyzeLeverageEffect(backTestResults),
            tradingFrequencyAnalysis: this.analyzeTradingFrequency(backTestResults),
            profitabilityValidation: this.validateProfitability(backTestResults),
            riskAssessment: this.assessRisks(backTestResults),
            overallConclusion: null
        };

        // 生成总体结论
        analysis.overallConclusion = this.generateConclusion(analysis);
        
        return analysis;
    }

    /**
     * 验证输入参数的合理性
     */
    validateInputs(results) {
        const validation = {
            status: 'valid',
            issues: [],
            warnings: []
        };

        const { basePrice, gridRange, gridCount, leverage, initialCapital } = results.config;
        const { finalPrice, totalTrades } = results.performance;

        // 检查基本参数
        if (basePrice <= 0) validation.issues.push('基准价格必须大于0');
        if (gridCount < 5 || gridCount > 1000) validation.warnings.push('网格数量可能不合理');
        if (leverage < 1 || leverage > 20) validation.warnings.push('杠杆倍数超出常见范围');
        if (initialCapital < 1000) validation.issues.push('初始资金太少，可能影响分析准确性');

        // 检查网格范围
        if (gridRange) {
            const lowerBound = gridRange.lower;
            const upperBound = gridRange.upper;
            const priceRange = upperBound - lowerBound;
            const gridSpacing = priceRange / (gridCount - 1);
            
            if (gridSpacing < basePrice * 0.001) {
                validation.warnings.push('网格间距过小，可能导致过度交易');
            }
            
            if (priceRange < basePrice * 0.1) {
                validation.warnings.push('网格范围过窄，可能限制策略效果');
            }
        }

        validation.status = validation.issues.length > 0 ? 'invalid' : 
                           validation.warnings.length > 0 ? 'warning' : 'valid';

        return validation;
    }

    /**
     * 分析价格突破网格边界的影响
     */
    analyzePriceBreakout(results) {
        const { basePrice, gridRange } = results.config;
        const { finalPrice, ethReturn } = results.performance;

        const analysis = {
            hasBreakout: false,
            breakoutType: null,
            breakoutImpact: null,
            strategyBehavior: null,
            reasonableness: 'unknown'
        };

        if (!gridRange) {
            analysis.reasonableness = 'cannot_analyze';
            return analysis;
        }

        const { lower: lowerBound, upper: upperBound } = gridRange;
        
        // 检查是否突破边界
        if (finalPrice > upperBound) {
            analysis.hasBreakout = true;
            analysis.breakoutType = 'upward';
            analysis.breakoutImpact = 'positive_for_spot_holding';
        } else if (finalPrice < lowerBound) {
            analysis.hasBreakout = true;
            analysis.breakoutType = 'downward';
            analysis.breakoutImpact = 'negative_for_spot_holding';
        }

        // 分析突破对策略的影响
        if (analysis.hasBreakout) {
            if (analysis.breakoutType === 'upward') {
                analysis.strategyBehavior = {
                    description: '价格突破上边界后，网格策略应该停止新的买入，持有的仓位获得超额收益',
                    expectedPerformance: '策略应该跑赢现货持有，因为网格策略在上涨过程中会逐步减仓获利',
                    riskLevel: 'low_to_moderate'
                };
            } else {
                analysis.strategyBehavior = {
                    description: '价格突破下边界后，网格策略可能面临较大亏损风险',
                    expectedPerformance: '策略可能跑输现货持有，特别是使用杠杆的情况下',
                    riskLevel: 'high'
                };
            }
        } else {
            analysis.strategyBehavior = {
                description: '价格在网格范围内，策略按设计正常运行',
                expectedPerformance: '策略应能捕获价格波动的震荡收益',
                riskLevel: 'moderate'
            };
        }

        analysis.reasonableness = 'analyzed';
        return analysis;
    }

    /**
     * 分析杠杆对收益的放大效果
     */
    analyzeLeverageEffect(results) {
        const { leverage } = results.config;
        const { gridReturn, ethReturn, excessReturn } = results.performance;

        const analysis = {
            leverageRatio: leverage,
            expectedAmplification: null,
            actualAmplification: null,
            leverageEfficiency: null,
            risks: []
        };

        // 理论上杠杆应该放大收益和风险
        analysis.expectedAmplification = leverage;

        // 计算实际放大效果（相对于现货收益）
        if (Math.abs(ethReturn) > 0.01) { // 现货收益不为0
            analysis.actualAmplification = Math.abs(gridReturn) / Math.abs(ethReturn);
        }

        // 评估杠杆效率
        if (analysis.actualAmplification !== null) {
            const efficiency = analysis.actualAmplification / leverage;
            
            if (efficiency < 0.5) {
                analysis.leverageEfficiency = 'low';
                analysis.risks.push('杠杆效率低下，可能存在资金利用率问题');
            } else if (efficiency < 0.8) {
                analysis.leverageEfficiency = 'moderate';
            } else if (efficiency <= 1.2) {
                analysis.leverageEfficiency = 'normal';
            } else {
                analysis.leverageEfficiency = 'high';
                analysis.risks.push('杠杆放大效果异常，需要检查计算逻辑');
            }
        }

        // 杠杆风险评估
        if (leverage > 5) {
            analysis.risks.push('高杠杆倍数增加了爆仓风险');
        }
        
        if (leverage > 1 && Math.abs(excessReturn) > 100) {
            analysis.risks.push('超额收益率异常高，可能存在计算错误');
        }

        return analysis;
    }

    /**
     * 分析交易频率的合理性
     */
    analyzeTradingFrequency(results) {
        const { gridCount, initialCapital } = results.config;
        const { totalTrades, backtestDays } = results.performance;

        const analysis = {
            totalTrades: totalTrades,
            averageTradesPerDay: backtestDays ? totalTrades / backtestDays : null,
            tradesPerGrid: totalTrades / gridCount,
            frequency: null,
            reasonableness: 'unknown',
            implications: []
        };

        // 评估交易频率
        if (analysis.averageTradesPerDay !== null) {
            if (analysis.averageTradesPerDay > 20) {
                analysis.frequency = 'very_high';
                analysis.implications.push('极高的交易频率可能导致过度的手续费负担');
            } else if (analysis.averageTradesPerDay > 10) {
                analysis.frequency = 'high';
                analysis.implications.push('高交易频率，需要注意手续费成本');
            } else if (analysis.averageTradesPerDay > 3) {
                analysis.frequency = 'moderate';
            } else {
                analysis.frequency = 'low';
                analysis.implications.push('低交易频率可能表明网格设置不够活跃');
            }
        }

        // 每个网格的交易次数分析
        if (analysis.tradesPerGrid > 10) {
            analysis.implications.push('每个网格交易次数过多，可能存在震荡过度交易');
        } else if (analysis.tradesPerGrid < 1) {
            analysis.implications.push('部分网格可能未被激活，资金利用率较低');
        }

        analysis.reasonableness = 'analyzed';
        return analysis;
    }

    /**
     * 验证收益率计算的合理性
     */
    validateProfitability(results) {
        const { leverage, gridCount, initialCapital } = results.config;
        const { gridReturn, ethReturn, excessReturn, totalTrades } = results.performance;

        const validation = {
            gridReturnReasonable: null,
            excessReturnReasonable: null,
            mathematicalConsistency: null,
            redFlags: [],
            expectedRange: null
        };

        // 检查网格收益率的合理性
        const absGridReturn = Math.abs(gridReturn);
        const absEthReturn = Math.abs(ethReturn);

        // 计算预期收益范围（基于经验数据）
        validation.expectedRange = {
            minGridReturn: Math.min(-50, ethReturn - 30), // 最差情况
            maxGridReturn: Math.max(100, ethReturn * leverage * 1.2), // 最好情况
            reasonableExcessReturn: [-20, 50] // 合理的超额收益范围
        };

        // 验证网格收益率
        if (absGridReturn > 500) {
            validation.gridReturnReasonable = false;
            validation.redFlags.push('网格策略收益率异常高（>500%），可能存在计算错误');
        } else if (absGridReturn > absEthReturn * leverage * 2) {
            validation.gridReturnReasonable = false;
            validation.redFlags.push('网格收益率超过杠杆放大后现货收益的2倍，不符合理论预期');
        } else {
            validation.gridReturnReasonable = true;
        }

        // 验证超额收益
        if (Math.abs(excessReturn) > 200) {
            validation.excessReturnReasonable = false;
            validation.redFlags.push('超额收益率过高，需要检查计算逻辑');
        } else if (excessReturn > validation.expectedRange.reasonableExcessReturn[1] && leverage === 1) {
            validation.excessReturnReasonable = false;
            validation.redFlags.push('无杠杆情况下超额收益率异常');
        } else {
            validation.excessReturnReasonable = true;
        }

        // 数学一致性检查
        const calculatedExcess = gridReturn - ethReturn;
        if (Math.abs(calculatedExcess - excessReturn) > 1) {
            validation.mathematicalConsistency = false;
            validation.redFlags.push('超额收益计算不一致');
        } else {
            validation.mathematicalConsistency = true;
        }

        // 交易成本合理性检查
        const estimatedTradingCost = totalTrades * 0.0004; // 假设每次交易0.04%成本
        if (gridReturn > ethReturn + estimatedTradingCost * 10) {
            validation.redFlags.push('收益率未充分考虑交易成本影响');
        }

        return validation;
    }

    /**
     * 评估策略风险
     */
    assessRisks(results) {
        const { leverage } = results.config;
        const { gridReturn, maxDrawdown } = results.performance;

        const riskAssessment = {
            leverageRisk: null,
            drawdownRisk: null,
            concentrationRisk: null,
            overallRisk: null,
            recommendations: []
        };

        // 杠杆风险
        if (leverage > 10) {
            riskAssessment.leverageRisk = 'very_high';
            riskAssessment.recommendations.push('考虑降低杠杆倍数以控制风险');
        } else if (leverage > 5) {
            riskAssessment.leverageRisk = 'high';
        } else if (leverage > 2) {
            riskAssessment.leverageRisk = 'moderate';
        } else {
            riskAssessment.leverageRisk = 'low';
        }

        // 回撤风险
        if (maxDrawdown > 50) {
            riskAssessment.drawdownRisk = 'very_high';
            riskAssessment.recommendations.push('最大回撤过大，策略风险控制需要改进');
        } else if (maxDrawdown > 20) {
            riskAssessment.drawdownRisk = 'high';
        } else if (maxDrawdown > 10) {
            riskAssessment.drawdownRisk = 'moderate';
        } else {
            riskAssessment.drawdownRisk = 'low';
        }

        // 集中度风险（单一资产）
        riskAssessment.concentrationRisk = 'high';
        riskAssessment.recommendations.push('策略集中于单一加密货币，建议分散投资');

        // 综合风险评级
        const riskFactors = [riskAssessment.leverageRisk, riskAssessment.drawdownRisk];
        const highRiskCount = riskFactors.filter(r => r === 'high' || r === 'very_high').length;
        
        if (highRiskCount >= 2) {
            riskAssessment.overallRisk = 'high';
        } else if (highRiskCount === 1) {
            riskAssessment.overallRisk = 'moderate';
        } else {
            riskAssessment.overallRisk = 'low';
        }

        return riskAssessment;
    }

    /**
     * 生成总体结论
     */
    generateConclusion(analysis) {
        const conclusion = {
            overallValidity: null,
            keyFindings: [],
            criticalIssues: [],
            recommendations: [],
            confidenceLevel: null
        };

        // 收集所有红旗警告
        const allRedFlags = [
            ...analysis.inputValidation.issues,
            ...(analysis.profitabilityValidation.redFlags || [])
        ];

        const allWarnings = [
            ...analysis.inputValidation.warnings,
            ...(analysis.leverageEffectAnalysis.risks || []),
            ...(analysis.tradingFrequencyAnalysis.implications || [])
        ];

        // 评估整体有效性
        if (allRedFlags.length > 0) {
            conclusion.overallValidity = 'questionable';
            conclusion.criticalIssues = allRedFlags;
        } else if (allWarnings.length > 2) {
            conclusion.overallValidity = 'conditional';
        } else {
            conclusion.overallValidity = 'acceptable';
        }

        // 关键发现
        if (analysis.priceBreakoutAnalysis.hasBreakout) {
            conclusion.keyFindings.push(
                `价格突破了网格边界（${analysis.priceBreakoutAnalysis.breakoutType}），这解释了策略的${
                    analysis.priceBreakoutAnalysis.breakoutType === 'upward' ? '超额' : '不佳'
                }表现`
            );
        }

        if (analysis.leverageEffectAnalysis.leverageEfficiency) {
            conclusion.keyFindings.push(
                `杠杆效率为${analysis.leverageEffectAnalysis.leverageEfficiency}，${
                    analysis.leverageEffectAnalysis.actualAmplification ? 
                    `实际放大倍数${analysis.leverageEffectAnalysis.actualAmplification.toFixed(2)}x` : ''
                }`
            );
        }

        if (analysis.tradingFrequencyAnalysis.frequency === 'very_high') {
            conclusion.keyFindings.push('交易频率过高，手续费负担可能影响最终收益');
        }

        // 推荐建议
        conclusion.recommendations = [
            ...analysis.riskAssessment.recommendations,
            '建议进行多时间段、多市场环境下的回测验证',
            '考虑加入风险管理机制，如止损和仓位管理'
        ];

        // 置信度评估
        const positiveFactors = [
            analysis.inputValidation.status === 'valid',
            analysis.profitabilityValidation.mathematicalConsistency,
            analysis.profitabilityValidation.gridReturnReasonable,
            analysis.profitabilityValidation.excessReturnReasonable
        ].filter(Boolean).length;

        if (positiveFactors >= 3 && allRedFlags.length === 0) {
            conclusion.confidenceLevel = 'high';
        } else if (positiveFactors >= 2 && allRedFlags.length <= 1) {
            conclusion.confidenceLevel = 'medium';
        } else {
            conclusion.confidenceLevel = 'low';
        }

        return conclusion;
    }

    /**
     * 生成格式化的分析报告
     */
    generateReport(analysisResults) {
        const report = [];
        
        report.push('# 网格交易回测结果分析报告\n');
        report.push(`**分析时间**: ${new Date().toLocaleString()}\n`);
        report.push(`**整体评估**: ${this.getValidityDescription(analysisResults.overallConclusion.overallValidity)}\n`);
        report.push(`**置信度**: ${analysisResults.overallConclusion.confidenceLevel.toUpperCase()}\n\n`);

        // 关键发现
        if (analysisResults.overallConclusion.keyFindings.length > 0) {
            report.push('## 🔍 关键发现\n');
            analysisResults.overallConclusion.keyFindings.forEach(finding => {
                report.push(`- ${finding}\n`);
            });
            report.push('\n');
        }

        // 价格突破分析
        if (analysisResults.priceBreakoutAnalysis.hasBreakout) {
            report.push('## 📈 价格突破边界分析\n');
            report.push(`**突破类型**: ${analysisResults.priceBreakoutAnalysis.breakoutType === 'upward' ? '上突破' : '下突破'}\n`);
            report.push(`**策略行为**: ${analysisResults.priceBreakoutAnalysis.strategyBehavior.description}\n`);
            report.push(`**风险等级**: ${analysisResults.priceBreakoutAnalysis.strategyBehavior.riskLevel}\n\n`);
        }

        // 杠杆效应分析
        if (analysisResults.leverageEffectAnalysis.actualAmplification) {
            report.push('## ⚖️ 杠杆效应分析\n');
            report.push(`**理论放大倍数**: ${analysisResults.leverageEffectAnalysis.expectedAmplification}x\n`);
            report.push(`**实际放大倍数**: ${analysisResults.leverageEffectAnalysis.actualAmplification.toFixed(2)}x\n`);
            report.push(`**杠杆效率**: ${analysisResults.leverageEffectAnalysis.leverageEfficiency}\n\n`);
        }

        // 交易频率分析
        report.push('## 🔄 交易频率分析\n');
        report.push(`**总交易次数**: ${analysisResults.tradingFrequencyAnalysis.totalTrades}\n`);
        if (analysisResults.tradingFrequencyAnalysis.averageTradesPerDay) {
            report.push(`**日均交易次数**: ${analysisResults.tradingFrequencyAnalysis.averageTradesPerDay.toFixed(2)}\n`);
        }
        report.push(`**每网格交易次数**: ${analysisResults.tradingFrequencyAnalysis.tradesPerGrid.toFixed(2)}\n`);
        report.push(`**频率评估**: ${this.getFrequencyDescription(analysisResults.tradingFrequencyAnalysis.frequency)}\n\n`);

        // 风险评估
        report.push('## ⚠️ 风险评估\n');
        report.push(`**杠杆风险**: ${this.getRiskDescription(analysisResults.riskAssessment.leverageRisk)}\n`);
        report.push(`**回撤风险**: ${this.getRiskDescription(analysisResults.riskAssessment.drawdownRisk)}\n`);
        report.push(`**综合风险**: ${this.getRiskDescription(analysisResults.riskAssessment.overallRisk)}\n\n`);

        // 问题和建议
        if (analysisResults.overallConclusion.criticalIssues.length > 0) {
            report.push('## ❌ 发现的问题\n');
            analysisResults.overallConclusion.criticalIssues.forEach(issue => {
                report.push(`- ⚠️ ${issue}\n`);
            });
            report.push('\n');
        }

        if (analysisResults.overallConclusion.recommendations.length > 0) {
            report.push('## 💡 改进建议\n');
            analysisResults.overallConclusion.recommendations.forEach(rec => {
                report.push(`- ${rec}\n`);
            });
            report.push('\n');
        }

        return report.join('');
    }

    // 辅助方法
    getValidityDescription(validity) {
        const descriptions = {
            'acceptable': '✅ 合理可接受',
            'conditional': '⚠️ 有条件接受',
            'questionable': '❌ 存在疑问'
        };
        return descriptions[validity] || validity;
    }

    getFrequencyDescription(frequency) {
        const descriptions = {
            'very_high': '极高',
            'high': '高',
            'moderate': '中等',
            'low': '低'
        };
        return descriptions[frequency] || frequency;
    }

    getRiskDescription(risk) {
        const descriptions = {
            'very_high': '极高',
            'high': '高',
            'moderate': '中等',
            'low': '低'
        };
        return descriptions[risk] || risk;
    }
}

// 测试用例：分析用户提供的回测结果
function analyzeUserBacktestResults() {
    const userResults = {
        config: {
            basePrice: 2272,
            gridRange: {
                lower: 2044.80,
                upper: 2499.20
            },
            gridCount: 25,
            leverage: 2,
            initialCapital: 999896
        },
        performance: {
            totalTrades: 93,
            gridReturn: 198.78, // 网格策略总收益%
            ethReturn: 62.31,   // ETH现货收益%
            excessReturn: 136.47, // 超额收益%
            finalPrice: 3687.67, // 最终ETH价格
            maxDrawdown: 15.2,   // 假设最大回撤
            backtestDays: 90     // 假设90天回测期
        }
    };

    const analyzer = new GridTradingAnalyzer();
    const analysis = analyzer.analyzeBacktestResults(userResults);
    const report = analyzer.generateReport(analysis);
    
    console.log(report);
    return analysis;
}

// 运行分析
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GridTradingAnalyzer, analyzeUserBacktestResults };
    
    // 如果直接运行此文件，执行分析
    if (require.main === module) {
        console.log('='.repeat(60));
        console.log('网格交易回测结果分析工具');
        console.log('='.repeat(60));
        analyzeUserBacktestResults();
    }
} else {
    // 浏览器环境
    window.GridTradingAnalyzer = GridTradingAnalyzer;
    window.analyzeUserBacktestResults = analyzeUserBacktestResults;
}