/**
 * 网格交易策略自动化测试套件
 * 验证每个数据的正确性
 */

class GridStrategyTestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        
        console.log('🧪 网格交易策略自动化测试套件启动');
        console.log('='.repeat(60));
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('\n🚀 开始运行完整测试套件...\n');
        
        // 1. 基础配置测试
        await this.testBasicConfiguration();
        
        // 2. 网格初始化测试  
        await this.testGridInitialization();
        
        // 3. 买卖逻辑测试
        await this.testBuySellLogic();
        
        // 4. 交易执行测试
        await this.testTradeExecution();
        
        // 5. 利润计算测试
        await this.testProfitCalculation();
        
        // 6. 边界情况测试
        await this.testEdgeCases();
        
        // 7. 数学关系验证测试
        await this.testMathematicalRelationships();
        
        // 8. 性能和一致性测试
        await this.testPerformanceAndConsistency();
        
        // 生成测试报告
        return this.generateTestReport();
    }

    /**
     * 测试基础配置
     */
    async testBasicConfiguration() {
        console.log('📋 测试1: 基础配置验证');
        console.log('-'.repeat(30));
        
        const testConfig = {
            initialCapital: 1000000,
            lowerBound: -10,
            upperBound: 10,
            gridCount: 25,
            gridType: 'arithmetic',
            leverage: 2,
            feeRate: 0.0002
        };
        
        const strategy = new GridStrategy(testConfig);
        
        // 验证配置正确性
        this.assert('配置-初始资金', strategy.config.initialCapital, 1000000);
        this.assert('配置-下边界', strategy.config.lowerBound, -10);
        this.assert('配置-上边界', strategy.config.upperBound, 10);
        this.assert('配置-网格数量', strategy.config.gridCount, 25);
        this.assert('配置-网格类型', strategy.config.gridType, 'arithmetic');
        this.assert('配置-杠杆倍数', strategy.config.leverage, 2);
        this.assert('配置-手续费率', strategy.config.feeRate, 0.0002);
        
        console.log('✅ 基础配置测试完成\n');
    }

    /**
     * 测试网格初始化
     */
    async testGridInitialization() {
        console.log('🚀 测试2: 网格初始化验证');
        console.log('-'.repeat(30));
        
        const strategy = new GridStrategy({
            initialCapital: 1000000,
            lowerBound: -10,
            upperBound: 10,
            gridCount: 25,
            leverage: 2
        });
        
        const mockPriceData = [{ close: 2000, timestamp: Date.now() }];
        strategy.initialize(mockPriceData);
        
        // 验证基准价格
        this.assert('初始化-基准价格', strategy.basePrice, 2000);
        
        // 验证网格数量
        this.assert('初始化-网格数量', strategy.gridLevels.length, 25);
        this.assert('初始化-持仓数量', strategy.positions.length, 25);
        
        // 验证价格边界
        const expectedLower = 2000 * 0.9; // -10%
        const expectedUpper = 2000 * 1.1; // +10%
        this.assertApproximately('初始化-下边界价格', strategy.gridLevels[0], expectedLower, 1);
        this.assertApproximately('初始化-上边界价格', strategy.gridLevels[24], expectedUpper, 1);
        
        // 验证资金分配
        let totalETH = 0;
        let totalUSDT = strategy.balance;
        
        strategy.positions.forEach(position => {
            totalETH += position.ethAmount || 0;
            totalUSDT += position.usdtAmount || 0;
        });
        
        const totalValue = totalETH * 2000 + totalUSDT;
        this.assertApproximately('初始化-资金守恒', totalValue, 1000000, 1000);
        
        // 验证初始持仓分配
        const baseGridIndex = strategy.findBaseGridIndex();
        let ethGrids = 0;
        let usdtGrids = 0;
        
        strategy.positions.forEach((position, index) => {
            if (position.ethAmount > 0) ethGrids++;
            if (position.usdtAmount > 0) usdtGrids++;
            
            // 验证状态正确性
            const expectedStatus = index > baseGridIndex ? 'waiting_buy' : 'holding_eth';
            this.assert(`初始化-网格${index}状态`, position.status, expectedStatus);
        });
        
        console.log(`💰 ETH网格数: ${ethGrids}, USDT网格数: ${usdtGrids}`);
        console.log('✅ 网格初始化测试完成\n');
    }

    /**
     * 测试买卖逻辑
     */
    async testBuySellLogic() {
        console.log('📈 测试3: 买卖逻辑验证');
        console.log('-'.repeat(30));
        
        const strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 25,
            lowerBound: -10,
            upperBound: 10
        });
        
        strategy.initialize([{ close: 2000, timestamp: Date.now() }]);
        
        // 测试卖出触发逻辑
        const ethPosition = strategy.positions.find(p => p.ethAmount > 0);
        if (ethPosition) {
            const shouldSellAtLowPrice = strategy.shouldSell(ethPosition.sellPrice - 10, ethPosition.gridIndex, ethPosition);
            const shouldSellAtHighPrice = strategy.shouldSell(ethPosition.sellPrice + 1, ethPosition.gridIndex, ethPosition);
            
            this.assert('买卖逻辑-低价不卖出', shouldSellAtLowPrice, false);
            this.assert('买卖逻辑-高价卖出', shouldSellAtHighPrice, true);
        }
        
        // 测试买入触发逻辑
        const usdtPosition = strategy.positions.find(p => p.usdtAmount > 0);
        if (usdtPosition) {
            const shouldBuyAtHighPrice = strategy.shouldBuy(usdtPosition.buyPrice + 10, usdtPosition.gridPrice, usdtPosition);
            const shouldBuyAtLowPrice = strategy.shouldBuy(usdtPosition.buyPrice - 1, usdtPosition.gridPrice, usdtPosition);
            
            this.assert('买卖逻辑-高价不买入', shouldBuyAtHighPrice, false);
            this.assert('买卖逻辑-低价买入', shouldBuyAtLowPrice, true);
        }
        
        console.log('✅ 买卖逻辑测试完成\n');
    }

    /**
     * 测试交易执行
     */
    async testTradeExecution() {
        console.log('⚡ 测试4: 交易执行验证');
        console.log('-'.repeat(30));
        
        const strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 25,
            lowerBound: -10,
            upperBound: 10
        });
        
        strategy.initialize([{ close: 2000, timestamp: Date.now() }]);
        
        // 找到持有ETH的网格进行卖出测试
        const ethPosition = strategy.positions.find(p => p.ethAmount > 0);
        if (ethPosition) {
            const originalETH = ethPosition.ethAmount;
            const originalUSDT = ethPosition.usdtAmount;
            const sellPrice = 2100;
            
            const trade = strategy.executeSell(ethPosition.gridIndex, { 
                close: sellPrice, 
                timestamp: Date.now() 
            });
            
            this.assert('交易执行-卖出交易生成', trade !== null, true);
            this.assert('交易执行-交易类型', trade.type, 'sell');
            this.assert('交易执行-ETH清零', ethPosition.ethAmount, 0);
            this.assert('交易执行-获得USDT', ethPosition.usdtAmount > originalUSDT, true);
            this.assert('交易执行-状态变更', ethPosition.status, 'waiting_buy');
            
            // 验证利润计算
            const expectedRevenue = originalETH * sellPrice;
            const expectedCost = originalETH * (ethPosition.actualBuyPrice || strategy.basePrice);
            const expectedGrossProfit = expectedRevenue - expectedCost;
            const expectedFee = expectedRevenue * strategy.config.feeRate;
            const expectedNetProfit = expectedGrossProfit - expectedFee;
            
            this.assertApproximately('交易执行-利润计算', trade.profit, expectedNetProfit, 0.01);
        }
        
        // 找到持有USDT的网格进行买入测试
        const usdtPosition = strategy.positions.find(p => p.usdtAmount > 0);
        if (usdtPosition) {
            const originalUSDT = usdtPosition.usdtAmount;
            const buyPrice = 1900;
            
            const trade = strategy.executeBuy(usdtPosition.gridIndex, {
                close: buyPrice,
                timestamp: Date.now()
            });
            
            this.assert('交易执行-买入交易生成', trade !== null, true);
            this.assert('交易执行-交易类型', trade.type, 'buy');
            this.assert('交易执行-USDT清零', usdtPosition.usdtAmount, 0);
            this.assert('交易执行-获得ETH', usdtPosition.ethAmount > 0, true);
            this.assert('交易执行-状态变更', usdtPosition.status, 'holding_eth');
        }
        
        console.log('✅ 交易执行测试完成\n');
    }

    /**
     * 测试利润计算
     */
    async testProfitCalculation() {
        console.log('💰 测试5: 利润计算验证');
        console.log('-'.repeat(30));
        
        // 创建测试场景：价格上涨50%
        const strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 10,
            lowerBound: -20,
            upperBound: 20,
            feeRate: 0
        });
        
        const priceData = [
            { close: 2000, timestamp: 1000 },
            { close: 2100, timestamp: 2000 },
            { close: 2200, timestamp: 3000 },
            { close: 2300, timestamp: 4000 },
            { close: 2400, timestamp: 5000 },
            { close: 2500, timestamp: 6000 }
        ];
        
        strategy.initialize(priceData);
        const result = strategy.execute(priceData);
        
        // 验证利润计算的数学关系
        const validation = strategy.validateGridTradingMath(result.profitBreakdown.gridTradingProfit);
        this.assert('利润计算-数学关系验证', validation.isValid, true);
        
        // 验证总资产守恒
        const finalTotalValue = strategy.calculateTotalValue(2500);
        const initialValue = strategy.config.initialCapital;
        const totalProfit = result.profitBreakdown.totalProfit;
        const expectedFinalValue = initialValue + totalProfit;
        
        this.assertApproximately('利润计算-资产守恒', finalTotalValue, expectedFinalValue, 1);
        
        // 验证利润分解
        const gridProfit = result.profitBreakdown.gridTradingProfit;
        const holdingProfit = result.profitBreakdown.holdingProfit;
        const calculatedTotal = gridProfit + holdingProfit;
        
        this.assertApproximately('利润计算-利润分解', calculatedTotal, totalProfit, 0.01);
        
        console.log(`📊 网格交易利润: $${gridProfit.toFixed(2)}`);
        console.log(`📊 持仓浮盈浮亏: $${holdingProfit.toFixed(2)}`);
        console.log(`📊 总利润: $${totalProfit.toFixed(2)}`);
        console.log('✅ 利润计算测试完成\n');
    }

    /**
     * 测试边界情况
     */
    async testEdgeCases() {
        console.log('⚠️ 测试6: 边界情况验证');
        console.log('-'.repeat(30));
        
        // 测试1: 极端价格上涨（超出网格上边界）
        let strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 10,
            lowerBound: -10,
            upperBound: 10
        });
        
        const extremeUpData = [
            { close: 2000, timestamp: 1000 },
            { close: 2500, timestamp: 2000 }, // 超出+10%边界
        ];
        
        strategy.initialize(extremeUpData);
        const upResult = strategy.execute(extremeUpData);
        
        // 验证极端上涨时的持仓
        let totalETH = 0;
        strategy.positions.forEach(p => totalETH += p.ethAmount || 0);
        
        this.assert('边界情况-极端上涨ETH持仓接近0', totalETH < 10, true);
        
        // 测试2: 极端价格下跌（超出网格下边界）
        strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 10,
            lowerBound: -10,
            upperBound: 10
        });
        
        const extremeDownData = [
            { close: 2000, timestamp: 1000 },
            { close: 1500, timestamp: 2000 }, // 超出-10%边界
        ];
        
        strategy.initialize(extremeDownData);
        const downResult = strategy.execute(extremeDownData);
        
        // 验证极端下跌时的持仓
        totalETH = 0;
        strategy.positions.forEach(p => totalETH += p.ethAmount || 0);
        
        this.assert('边界情况-极端下跌ETH持仓增加', totalETH > 100, true);
        
        // 测试3: 无交易情况（价格不变）
        strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 10,
            lowerBound: -10,
            upperBound: 10
        });
        
        const noTradeData = [
            { close: 2000, timestamp: 1000 },
            { close: 2000, timestamp: 2000 },
            { close: 2000, timestamp: 3000 }
        ];
        
        strategy.initialize(noTradeData);
        const noTradeResult = strategy.execute(noTradeData);
        
        this.assert('边界情况-无交易时交易次数', noTradeResult.trades.length, 0);
        
        console.log('✅ 边界情况测试完成\n');
    }

    /**
     * 测试数学关系
     */
    async testMathematicalRelationships() {
        console.log('🔢 测试7: 数学关系验证');
        console.log('-'.repeat(30));
        
        const strategy = new GridStrategy({
            initialCapital: 1000000,
            gridCount: 20,
            lowerBound: -15,
            upperBound: 15,
            feeRate: 0.001
        });
        
        const testData = [
            { close: 2000, timestamp: 1000 },
            { close: 2050, timestamp: 2000 },
            { close: 2100, timestamp: 3000 },
            { close: 2080, timestamp: 4000 },
            { close: 2120, timestamp: 5000 },
            { close: 2090, timestamp: 6000 }
        ];
        
        strategy.initialize(testData);
        const result = strategy.execute(testData);
        
        // 数学关系1: 总资产 = USDT余额 + ETH价值
        const finalPrice = 2090;
        const totalValue = strategy.calculateTotalValue(finalPrice);
        let manualTotal = strategy.balance;
        
        strategy.positions.forEach(p => {
            manualTotal += (p.ethAmount || 0) * finalPrice;
            manualTotal += (p.usdtAmount || 0);
        });
        
        this.assertApproximately('数学关系-总资产计算', totalValue, manualTotal, 0.01);
        
        // 数学关系2: 利润守恒检查
        const initialValue = strategy.config.initialCapital;
        const finalTotalValue = totalValue;
        const calculatedProfit = result.profitBreakdown.totalProfit;
        const impliedProfit = finalTotalValue - initialValue;
        
        this.assertApproximately('数学关系-利润守恒', calculatedProfit, impliedProfit, 0.01);
        
        // 数学关系3: 交易利润累计检查
        let manualGridProfit = 0;
        strategy.orders.forEach(order => {
            if (order.type === 'sell') {
                manualGridProfit += order.profit;
            }
        });
        
        this.assertApproximately('数学关系-交易利润累计', 
            result.profitBreakdown.gridTradingProfit, manualGridProfit, 0.01);
        
        console.log('✅ 数学关系测试完成\n');
    }

    /**
     * 测试性能和一致性
     */
    async testPerformanceAndConsistency() {
        console.log('⚡ 测试8: 性能和一致性验证');
        console.log('-'.repeat(30));
        
        // 测试多次运行的一致性
        const results = [];
        const testConfig = {
            initialCapital: 500000,
            gridCount: 15,
            lowerBound: -12,
            upperBound: 12
        };
        
        const testData = this.generateRandomPriceData(2000, 50, 0.02); // 50个价格点，2%波动
        
        for (let i = 0; i < 5; i++) {
            const strategy = new GridStrategy(testConfig);
            strategy.initialize([testData[0]]);
            const result = strategy.execute(testData);
            results.push(result.profitBreakdown.totalProfit);
        }
        
        // 验证多次运行结果一致性
        const firstResult = results[0];
        let isConsistent = true;
        
        results.forEach((result, index) => {
            if (Math.abs(result - firstResult) > 0.01) {
                isConsistent = false;
                console.log(`❌ 运行${index + 1}结果不一致: ${result} vs ${firstResult}`);
            }
        });
        
        this.assert('性能一致性-多次运行结果一致', isConsistent, true);
        
        // 性能测试：大量数据点
        const startTime = Date.now();
        const largeStrategy = new GridStrategy(testConfig);
        const largeData = this.generateRandomPriceData(2000, 500, 0.01); // 500个数据点
        
        largeStrategy.initialize([largeData[0]]);
        largeStrategy.execute(largeData);
        
        const executionTime = Date.now() - startTime;
        console.log(`📊 500数据点执行时间: ${executionTime}ms`);
        this.assert('性能测试-执行时间合理', executionTime < 5000, true); // 5秒内完成
        
        console.log('✅ 性能和一致性测试完成\n');
    }

    /**
     * 生成随机价格数据
     */
    generateRandomPriceData(startPrice, count, volatility) {
        const data = [];
        let price = startPrice;
        
        for (let i = 0; i < count; i++) {
            const change = (Math.random() - 0.5) * 2 * volatility;
            price = price * (1 + change);
            data.push({
                close: price,
                timestamp: 1000 + i * 1000
            });
        }
        
        return data;
    }

    /**
     * 断言工具
     */
    assert(testName, actual, expected) {
        this.totalTests++;
        
        if (actual === expected) {
            this.passedTests++;
            console.log(`✅ ${testName}: PASS`);
            this.testResults.push({ name: testName, status: 'PASS', actual, expected });
        } else {
            this.failedTests++;
            console.log(`❌ ${testName}: FAIL (期望: ${expected}, 实际: ${actual})`);
            this.testResults.push({ name: testName, status: 'FAIL', actual, expected });
        }
    }

    /**
     * 近似断言工具
     */
    assertApproximately(testName, actual, expected, tolerance) {
        this.totalTests++;
        
        const diff = Math.abs(actual - expected);
        if (diff <= tolerance) {
            this.passedTests++;
            console.log(`✅ ${testName}: PASS (差异: ${diff.toFixed(4)})`);
            this.testResults.push({ name: testName, status: 'PASS', actual, expected, diff });
        } else {
            this.failedTests++;
            console.log(`❌ ${testName}: FAIL (期望: ${expected}, 实际: ${actual}, 差异: ${diff})`);
            this.testResults.push({ name: testName, status: 'FAIL', actual, expected, diff });
        }
    }

    /**
     * 生成测试报告
     */
    generateTestReport() {
        console.log('\n📊 测试报告');
        console.log('='.repeat(60));
        console.log(`总测试数: ${this.totalTests}`);
        console.log(`通过测试: ${this.passedTests} ✅`);
        console.log(`失败测试: ${this.failedTests} ❌`);
        console.log(`成功率: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ 失败测试详情:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => {
                    console.log(`- ${r.name}: 期望 ${r.expected}, 实际 ${r.actual}`);
                });
        }
        
        console.log('\n🎉 测试完成!');
        
        return {
            total: this.totalTests,
            passed: this.passedTests,
            failed: this.failedTests,
            successRate: (this.passedTests / this.totalTests) * 100,
            details: this.testResults
        };
    }
}

// 导出测试套件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridStrategyTestSuite;
} else if (typeof window !== 'undefined') {
    window.GridStrategyTestSuite = GridStrategyTestSuite;
}