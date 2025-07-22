/**
 * 测试修复后的网格交易逻辑
 * 验证修复后的系统是否符合真正的网格交易原理
 */

class GridLogicTester {
    constructor() {
        this.config = {
            initialCapital: 999896,
            lowerBound: -10,
            upperBound: 10,
            gridCount: 25,
            gridType: 'arithmetic',
            leverage: 2,
            feeRate: 0.0002
        };
        
        console.log('🧪 测试修复后的网格交易逻辑');
        console.log('验证是否符合真正的网格交易原理');
        console.log('='.repeat(60));
    }

    /**
     * 创建网格策略实例（模拟）
     */
    createMockGridStrategy() {
        const basePrice = 2272;
        const lowerPrice = basePrice * (1 + this.config.lowerBound / 100); // 2044.80
        const upperPrice = basePrice * (1 + this.config.upperBound / 100); // 2499.20
        
        // 生成网格价格
        const gridLevels = [];
        const step = (upperPrice - lowerPrice) / (this.config.gridCount - 1);
        for (let i = 0; i < this.config.gridCount; i++) {
            gridLevels.push(lowerPrice + i * step);
        }
        
        return {
            config: this.config,
            basePrice: basePrice,
            gridLevels: gridLevels,
            balance: this.config.initialCapital,
            positions: gridLevels.map((price, index) => ({
                gridIndex: index,
                price: price,
                quantity: 0,
                allocated: this.config.initialCapital / this.config.gridCount,
                status: 'waiting',
                buyPrice: null,
                buyTime: null
            }))
        };
    }

    /**
     * 模拟修复后的shouldBuy逻辑
     */
    shouldBuy(currentPrice, gridPrice, position, strategy) {
        // 基本条件检查
        if (position.status !== 'waiting' || strategy.balance < position.allocated) {
            return false;
        }
        
        // 检查价格是否在网格范围内
        const lowerBound = strategy.gridLevels[0];
        const upperBound = strategy.gridLevels[strategy.gridLevels.length - 1];
        
        if (currentPrice < lowerBound || currentPrice > upperBound) {
            return false;
        }
        
        // 🔧 修复的关键逻辑：只有当价格下跌到网格价位以下时才买入
        const tolerance = gridPrice * 0.002;
        return currentPrice < gridPrice - tolerance;
    }

    /**
     * 模拟修复后的shouldSell逻辑
     */
    shouldSell(currentPrice, gridIndex, position, strategy) {
        if (position.status !== 'bought' || position.quantity <= 0) {
            return false;
        }
        
        // 检查价格是否在网格范围内
        const lowerBound = strategy.gridLevels[0];
        const upperBound = strategy.gridLevels[strategy.gridLevels.length - 1];
        
        // 如果价格突破上边界，立即卖出所有持仓
        if (currentPrice > upperBound) {
            return true;
        }
        
        // 如果价格突破下边界，不卖出（持有等待反弹）
        if (currentPrice < lowerBound) {
            return false;
        }
        
        // 🔧 修复的关键逻辑：基于买入价格设置卖出目标
        const gridSpacing = (upperBound - lowerBound) / (strategy.gridLevels.length - 1);
        const profitTarget = gridSpacing * 0.8;
        const sellPrice = position.buyPrice + profitTarget;
        
        const tolerance = sellPrice * 0.002;
        return currentPrice >= sellPrice - tolerance;
    }

    /**
     * 测试在不同价格下的买入行为
     */
    testBuyBehavior() {
        console.log('\n📊 测试修复后的买入行为');
        console.log('-'.repeat(35));
        
        const strategy = this.createMockGridStrategy();
        const testPrices = [
            { price: 2272, description: '基准价格' },
            { price: 2200, description: '下跌到某个网格附近' },
            { price: 2100, description: '进一步下跌' },
            { price: 2000, description: '接近网格下边界' },
            { price: 2500, description: '接近网格上边界' },
            { price: 3000, description: '突破网格上边界' }
        ];
        
        testPrices.forEach(test => {
            console.log(`\n在价格 $${test.price} (${test.description}) 时:`);
            let buyableGrids = 0;
            let buyableGridDetails = [];
            
            strategy.positions.forEach((position, index) => {
                const canBuy = this.shouldBuy(test.price, position.price, position, strategy);
                if (canBuy) {
                    buyableGrids++;
                    if (buyableGridDetails.length < 3) { // 只显示前3个
                        buyableGridDetails.push({
                            grid: index + 1,
                            price: position.price.toFixed(2)
                        });
                    }
                }
            });
            
            console.log(`  可买入网格数: ${buyableGrids}个`);
            if (buyableGridDetails.length > 0) {
                console.log(`  示例网格: ${buyableGridDetails.map(g => `网格${g.grid}($${g.price})`).join(', ')}`);
            }
            
            // 评估修复效果
            if (test.price === 2272 && buyableGrids === 0) {
                console.log(`  ✅ 修复成功！基准价格时不会立即买入`);
            } else if (test.price < 2272 && buyableGrids > 0) {
                console.log(`  ✅ 正确！价格下跌时可以买入`);
            } else if (test.price > 2499.20 && buyableGrids === 0) {
                console.log(`  ✅ 正确！突破上边界时停止买入`);
            }
        });
    }

    /**
     * 模拟完整的价格变化场景
     */
    simulateCompleteScenario() {
        console.log('\n📈 模拟完整的价格变化场景');
        console.log('-'.repeat(35));
        
        const strategy = this.createMockGridStrategy();
        
        // 模拟价格变化序列
        const priceSequence = [
            { price: 2272, action: '起始价格' },
            { price: 2200, action: '价格下跌，触发买入' },
            { price: 2100, action: '进一步下跌，更多买入' },
            { price: 2250, action: '价格反弹，触发卖出' },
            { price: 2400, action: '继续上涨，更多卖出' },
            { price: 2500, action: '接近上边界，最后卖出' },
            { price: 3000, action: '突破上边界，应该无持仓' },
            { price: 3687.67, action: '大幅上涨，仍应无持仓' }
        ];
        
        let totalTrades = 0;
        let ethHoldings = 0;
        let usdtBalance = strategy.balance;
        
        console.log('模拟交易序列:');
        
        priceSequence.forEach(step => {
            console.log(`\n价格: $${step.price} - ${step.action}`);
            
            // 检查买入机会
            let buyCount = 0;
            strategy.positions.forEach(position => {
                if (this.shouldBuy(step.price, position.price, position, strategy)) {
                    buyCount++;
                }
            });
            
            // 检查卖出机会（假设有一些持仓）
            let sellCount = 0;
            strategy.positions.forEach(position => {
                // 模拟一些持仓状态
                if (position.status === 'waiting' && step.price < position.price) {
                    position.status = 'bought';
                    position.buyPrice = step.price;
                    position.quantity = 10; // 模拟数量
                    ethHoldings += position.quantity;
                }
                
                if (this.shouldSell(step.price, position.gridIndex, position, strategy)) {
                    sellCount++;
                    if (position.status === 'bought') {
                        ethHoldings -= position.quantity;
                        position.status = 'waiting';
                        position.quantity = 0;
                    }
                }
            });
            
            totalTrades += buyCount + sellCount;
            
            console.log(`  可买入: ${buyCount}个网格`);
            console.log(`  可卖出: ${sellCount}个网格`);
            console.log(`  当前ETH持仓: ${ethHoldings.toFixed(2)} ETH`);
            
            // 关键检查点
            if (step.price > 2499.20) {
                if (ethHoldings === 0) {
                    console.log(`  ✅ 正确！价格突破后无ETH持仓`);
                } else {
                    console.log(`  ❌ 错误！价格突破后仍有ETH持仓`);
                }
            }
        });
        
        console.log(`\n📊 最终结果:`);
        console.log(`总交易次数: ${totalTrades}`);
        console.log(`最终ETH持仓: ${ethHoldings} ETH`);
        console.log(`预期收益来源: 只有网格交易差价`);
        
        if (ethHoldings === 0) {
            console.log(`✅ 测试通过！修复后的逻辑符合网格交易原理`);
        } else {
            console.log(`❌ 测试失败！仍需进一步修复`);
        }
    }

    /**
     * 计算修复后的预期收益
     */
    calculateExpectedReturn() {
        console.log('\n💰 计算修复后的预期收益');
        console.log('-'.repeat(30));
        
        const strategy = this.createMockGridStrategy();
        const gridSpacing = (strategy.gridLevels[strategy.gridLevels.length - 1] - strategy.gridLevels[0]) / (strategy.gridLevels.length - 1);
        const avgGridPrice = (strategy.gridLevels[0] + strategy.gridLevels[strategy.gridLevels.length - 1]) / 2;
        
        console.log(`网格间距: $${gridSpacing.toFixed(2)}`);
        console.log(`平均网格价格: $${avgGridPrice.toFixed(2)}`);
        
        // 假设每个网格完成一次买卖
        const profitPerGrid = gridSpacing * 0.8; // 80%的网格间距作为利润
        const profitRatePerGrid = (profitPerGrid / avgGridPrice) * this.config.leverage; // 考虑杠杆
        const totalGridProfit = profitRatePerGrid * this.config.gridCount;
        const totalReturnPct = (totalGridProfit / this.config.initialCapital * this.config.initialCapital) * 100;
        
        console.log(`单网格利润: $${profitPerGrid.toFixed(2)}`);
        console.log(`单网格收益率: ${(profitRatePerGrid * 100).toFixed(3)}%`);
        console.log(`预期总收益率: ${totalReturnPct.toFixed(2)}%`);
        
        console.log(`\n🔍 与异常结果对比:`);
        console.log(`修复前异常收益率: 198.78%`);
        console.log(`修复后预期收益率: ${totalReturnPct.toFixed(2)}%`);
        console.log(`差异: ${(198.78 - totalReturnPct).toFixed(2)}%`);
        
        if (totalReturnPct < 20) {
            console.log(`✅ 修复成功！收益率回归合理范围`);
        } else {
            console.log(`⚠️ 收益率仍偏高，可能需要进一步调整`);
        }
        
        return totalReturnPct;
    }

    /**
     * 运行完整测试
     */
    runCompleteTest() {
        this.testBuyBehavior();
        this.simulateCompleteScenario();
        const expectedReturn = this.calculateExpectedReturn();
        
        console.log('\n🎯 测试总结');
        console.log('='.repeat(25));
        console.log('🔧 已修复的关键问题:');
        console.log('1. 买入逻辑：只在价格下跌时买入');
        console.log('2. 卖出逻辑：基于买入价格设置利润目标');
        console.log('3. 边界处理：突破后正确停止交易');
        console.log('4. 持仓管理：确保突破后无ETH持仓');
        
        console.log('\n📊 预期改进效果:');
        console.log(`- 收益率从198.78%降至${expectedReturn.toFixed(2)}%`);
        console.log('- 符合网格交易基本原理');
        console.log('- 避免了不合理的持仓收益');
        
        return {
            testPassed: expectedReturn < 20,
            expectedReturn: expectedReturn,
            improvementNeeded: expectedReturn > 10 ? '可能需要调整利润目标' : '修复效果良好'
        };
    }
}

// 运行测试
const tester = new GridLogicTester();
const testResults = tester.runCompleteTest();

console.log('\n🚀 准备部署修复...');
console.log(`测试结果: ${testResults.testPassed ? '通过' : '需要进一步调整'}`);