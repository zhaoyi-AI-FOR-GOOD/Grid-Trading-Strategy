/**
 * 交易行为分析
 * 深入分析价格突破网格边界后的交易执行行为
 */

class TradingBehaviorAnalysis {
    constructor() {
        console.log('🔍 交易行为深度分析');
        console.log('检查价格突破网格边界后的具体交易行为');
        console.log('='.repeat(60));
    }

    /**
     * 模拟实际的价格变化和交易执行过程
     */
    simulateTradingExecution() {
        console.log('\n📊 模拟交易执行过程');
        console.log('-'.repeat(40));
        
        // 模拟参数
        const config = {
            initialCapital: 999896,
            leverage: 2,
            gridCount: 25,
            lowerBound: -10,
            upperBound: 10,
            feeRate: 0.0002
        };
        
        const basePrice = 2272;
        const gridLowerBound = basePrice * (1 + config.lowerBound / 100); // 2044.80
        const gridUpperBound = basePrice * (1 + config.upperBound / 100); // 2499.20
        const finalPrice = 3687.67;
        
        console.log(`基准价格: $${basePrice}`);
        console.log(`网格边界: $${gridLowerBound.toFixed(2)} - $${gridUpperBound.toFixed(2)}`);
        console.log(`最终价格: $${finalPrice}`);
        
        // 生成网格价格水平
        const gridLevels = this.generateGridLevels(gridLowerBound, gridUpperBound, config.gridCount);
        console.log(`网格价格数量: ${gridLevels.length}个`);
        console.log(`网格间距: $${((gridUpperBound - gridLowerBound) / (config.gridCount - 1)).toFixed(2)}`);
        
        // 模拟价格从基准价格逐步上涨的过程
        this.simulatePriceProgression(config, gridLevels, basePrice, gridUpperBound, finalPrice);
    }

    /**
     * 生成网格价格水平
     */
    generateGridLevels(lowerPrice, upperPrice, gridCount) {
        const levels = [];
        const step = (upperPrice - lowerPrice) / (gridCount - 1);
        for (let i = 0; i < gridCount; i++) {
            levels.push(lowerPrice + i * step);
        }
        return levels.sort((a, b) => a - b);
    }

    /**
     * 模拟价格上涨过程中的交易行为
     */
    simulatePriceProgression(config, gridLevels, basePrice, gridUpperBound, finalPrice) {
        console.log('\n📈 价格上涨过程中的交易行为分析');
        console.log('-'.repeat(45));
        
        // 关键价格点
        const pricePoints = [
            { price: basePrice, description: '基准价格(起始)' },
            { price: 2300, description: '网格内交易价格' },
            { price: 2400, description: '接近网格上边界' },
            { price: gridUpperBound, description: '网格上边界' },
            { price: 3000, description: '突破后价格1' },
            { price: 3500, description: '突破后价格2' },
            { price: finalPrice, description: '最终价格' }
        ];
        
        console.log('关键价格点分析:');
        pricePoints.forEach((point, index) => {
            console.log(`\n${index + 1}. ${point.description}: $${point.price}`);
            this.analyzeTradeSignalsAtPrice(point.price, gridLevels, config);
        });
    }

    /**
     * 分析特定价格下的交易信号
     */
    analyzeTradeSignalsAtPrice(currentPrice, gridLevels, config) {
        const lowerBound = gridLevels[0];
        const upperBound = gridLevels[gridLevels.length - 1];
        
        // 检查边界状态
        const isInRange = currentPrice >= lowerBound && currentPrice <= upperBound;
        const exceedsUpper = currentPrice > upperBound;
        const exceedsLower = currentPrice < lowerBound;
        
        console.log(`   边界状态: ${isInRange ? '在范围内' : (exceedsUpper ? '超出上边界' : '超出下边界')}`);
        
        if (exceedsUpper) {
            const exceedAmount = currentPrice - upperBound;
            const exceedPct = (exceedAmount / upperBound) * 100;
            console.log(`   超出幅度: $${exceedAmount.toFixed(2)} (${exceedPct.toFixed(2)}%)`);
        }
        
        // 分析买入信号
        const buySignals = this.analyzeBuySignals(currentPrice, gridLevels);
        console.log(`   买入信号: ${buySignals.count}个网格可买入`);
        if (buySignals.count > 0) {
            console.log(`   买入价格范围: $${buySignals.minPrice.toFixed(2)} - $${buySignals.maxPrice.toFixed(2)}`);
        }
        
        // 分析卖出信号
        const sellSignals = this.analyzeSellSignals(currentPrice, gridLevels, exceedsUpper);
        console.log(`   卖出信号: ${sellSignals.description}`);
        
        // 🚨 关键分析：如果价格超出边界，应该发生什么？
        if (exceedsUpper) {
            console.log(`   🚨 关键点: 价格超出上边界后:`);
            console.log(`      - 应该停止所有新买入`);
            console.log(`      - 应该卖出所有持仓`);
            console.log(`      - 转为"持有模式"获得价格上涨收益`);
        }
    }

    /**
     * 分析买入信号
     */
    analyzeBuySignals(currentPrice, gridLevels) {
        // 模拟shouldBuy函数的逻辑
        const lowerBound = gridLevels[0];
        const upperBound = gridLevels[gridLevels.length - 1];
        
        // 边界检查（修复后的逻辑）
        if (currentPrice < lowerBound || currentPrice > upperBound) {
            return { count: 0, minPrice: 0, maxPrice: 0 };
        }
        
        // 在范围内时，检查可以买入的网格
        const buyableGrids = [];
        const tolerance = 0.001; // 0.1% 容差
        
        gridLevels.forEach((gridPrice, index) => {
            if (currentPrice <= gridPrice + gridPrice * tolerance) {
                buyableGrids.push({ index, price: gridPrice });
            }
        });
        
        return {
            count: buyableGrids.length,
            minPrice: buyableGrids.length > 0 ? Math.min(...buyableGrids.map(g => g.price)) : 0,
            maxPrice: buyableGrids.length > 0 ? Math.max(...buyableGrids.map(g => g.price)) : 0,
            grids: buyableGrids
        };
    }

    /**
     * 分析卖出信号
     */
    analyzeSellSignals(currentPrice, gridLevels, exceedsUpper) {
        const lowerBound = gridLevels[0];
        const upperBound = gridLevels[gridLevels.length - 1];
        
        if (exceedsUpper) {
            return { description: '强制卖出所有持仓 (突破上边界)' };
        }
        
        if (currentPrice < lowerBound) {
            return { description: '持有不动 (突破下边界)' };
        }
        
        // 在范围内的正常网格卖出逻辑
        const sellableGrids = [];
        const tolerance = 0.001;
        
        gridLevels.forEach((gridPrice, index) => {
            if (index < gridLevels.length - 1) {
                const upperGridPrice = gridLevels[index + 1];
                if (currentPrice >= upperGridPrice - upperGridPrice * tolerance) {
                    sellableGrids.push({ index, price: gridPrice, sellAt: upperGridPrice });
                }
            }
        });
        
        return {
            description: `正常网格卖出，${sellableGrids.length}个网格可卖出`,
            grids: sellableGrids
        };
    }

    /**
     * 分析收益异常的可能原因
     */
    analyzeAnomalyReasons() {
        console.log('\n🔍 收益异常的可能原因分析');
        console.log('='.repeat(35));
        
        const reasons = [
            {
                title: '原因1: 边界检查失效',
                description: '如果边界检查代码有bug，可能在价格超出边界后仍在交易',
                likelihood: '中等',
                impact: '极高'
            },
            {
                title: '原因2: 杠杆计算错误',
                description: '杠杆持仓的收益计算可能没有正确扣除借入成本',
                likelihood: '高',
                impact: '高'
            },
            {
                title: '原因3: 持仓累积效应',
                description: '多个网格的持仓在价格大涨时产生复合收益效应',
                likelihood: '高',
                impact: '中等'
            },
            {
                title: '原因4: 数据处理错误',
                description: '价格数据或交易时间序列处理可能有问题',
                likelihood: '低',
                impact: '高'
            }
        ];
        
        reasons.forEach((reason, index) => {
            console.log(`\n${index + 1}. ${reason.title}`);
            console.log(`   描述: ${reason.description}`);
            console.log(`   可能性: ${reason.likelihood} | 影响: ${reason.impact}`);
        });
        
        console.log('\n💡 建议的验证步骤:');
        console.log('1. 检查修复后的边界检查代码是否真正生效');
        console.log('2. 验证价格超出$2499.20后是否还有新交易');
        console.log('3. 检查持仓价值计算的杠杆处理');
        console.log('4. 分析交易时间序列和价格数据');
    }

    /**
     * 运行完整分析
     */
    runCompleteAnalysis() {
        this.simulateTradingExecution();
        this.analyzeAnomalyReasons();
        
        console.log('\n🎯 分析总结');
        console.log('='.repeat(25));
        console.log('✅ 网格边界计算正确');
        console.log('✅ 价格确实大幅突破边界');
        console.log('⚠️  关键在于边界突破后的交易行为');
        console.log('🔧 需要实际测试修复后的边界检查是否生效');
        console.log('📊 建议进行端到端的回测验证');
    }
}

// 运行分析
const analysis = new TradingBehaviorAnalysis();
analysis.runCompleteAnalysis();