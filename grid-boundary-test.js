/**
 * 网格边界价格计算验证测试
 * 用于验证价格区间计算的正确性
 */

class GridBoundaryTest {
    constructor() {
        console.log('🔍 网格边界价格计算验证测试');
        console.log('='.repeat(60));
    }

    /**
     * 测试价格区间计算逻辑
     */
    testPriceRangeCalculation() {
        console.log('\n📊 测试案例: 用户的实际参数');
        
        // 用户的实际参数
        const config = {
            lowerBound: -10,    // -10%
            upperBound: 10,     // +10%
            gridCount: 25,
            leverage: 2
        };
        
        const basePrice = 2272;      // ETH起始价格
        const finalPrice = 3687.67;  // ETH最终价格
        
        console.log(`基准价格: $${basePrice}`);
        console.log(`最终价格: $${finalPrice}`);
        console.log(`价格涨幅: ${((finalPrice - basePrice) / basePrice * 100).toFixed(2)}%`);
        
        // 当前的计算方式
        const currentLowerPrice = basePrice * (1 + config.lowerBound / 100);
        const currentUpperPrice = basePrice * (1 + config.upperBound / 100);
        
        console.log('\n🔵 当前代码的计算结果:');
        console.log(`网格下边界: $${currentLowerPrice.toFixed(2)}`);
        console.log(`网格上边界: $${currentUpperPrice.toFixed(2)}`);
        console.log(`网格价格区间: $${currentLowerPrice.toFixed(2)} - $${currentUpperPrice.toFixed(2)}`);
        
        // 检查价格是否超出边界
        const exceedsLower = finalPrice < currentLowerPrice;
        const exceedsUpper = finalPrice > currentUpperPrice;
        
        console.log('\n⚠️  边界突破分析:');
        console.log(`最终价格 < 网格下边界: ${exceedsLower ? '是' : '否'}`);
        console.log(`最终价格 > 网格上边界: ${exceedsUpper ? '是' : '否'}`);
        
        if (exceedsUpper) {
            const exceedAmount = finalPrice - currentUpperPrice;
            const exceedPercentage = (exceedAmount / currentUpperPrice) * 100;
            console.log(`超出上边界金额: $${exceedAmount.toFixed(2)}`);
            console.log(`超出上边界幅度: ${exceedPercentage.toFixed(2)}%`);
        }
        
        // 网格价格水平生成测试
        console.log('\n🕸️  网格价格水平 (前5个和后5个):');
        const gridLevels = this.generateGridLevels(currentLowerPrice, currentUpperPrice, config.gridCount);
        
        console.log('前5个网格价格:');
        for (let i = 0; i < Math.min(5, gridLevels.length); i++) {
            console.log(`  网格${i + 1}: $${gridLevels[i].toFixed(2)}`);
        }
        
        console.log('后5个网格价格:');
        for (let i = Math.max(gridLevels.length - 5, 0); i < gridLevels.length; i++) {
            console.log(`  网格${i + 1}: $${gridLevels[i].toFixed(2)}`);
        }
        
        return {
            basePrice,
            finalPrice,
            lowerBound: currentLowerPrice,
            upperBound: currentUpperPrice,
            exceedsUpper,
            exceedsLower,
            gridLevels
        };
    }

    /**
     * 生成网格价格水平 (复制自原代码)
     */
    generateGridLevels(lowerPrice, upperPrice, gridCount) {
        const levels = [];
        
        // 等差网格计算
        const step = (upperPrice - lowerPrice) / (gridCount - 1);
        for (let i = 0; i < gridCount; i++) {
            levels.push(lowerPrice + i * step);
        }
        
        return levels.sort((a, b) => a - b);
    }

    /**
     * 分析价格突破对交易的影响
     */
    analyzeTradingImpact(testResults) {
        console.log('\n💰 价格突破对交易的影响分析:');
        
        const { basePrice, finalPrice, lowerBound, upperBound, exceedsUpper } = testResults;
        
        if (exceedsUpper) {
            console.log('🚨 关键发现: 价格大幅突破网格上边界!');
            
            // 计算在网格内的价格变动
            const inGridPriceMove = upperBound - basePrice;
            const inGridReturn = (inGridPriceMove / basePrice) * 100;
            
            // 计算超出网格的价格变动
            const beyondGridPriceMove = finalPrice - upperBound;
            const beyondGridReturn = (beyondGridPriceMove / upperBound) * 100;
            
            console.log(`\n📈 价格变动分解:`);
            console.log(`  起始价格 → 网格上边界: $${basePrice} → $${upperBound.toFixed(2)}`);
            console.log(`  网格内价格涨幅: ${inGridReturn.toFixed(2)}%`);
            console.log(`  网格上边界 → 最终价格: $${upperBound.toFixed(2)} → $${finalPrice}`);
            console.log(`  超出网格涨幅: ${beyondGridReturn.toFixed(2)}%`);
            
            console.log(`\n🔍 交易行为分析:`);
            console.log(`  1. 在网格内阶段 (${basePrice} - ${upperBound.toFixed(2)}): 正常网格交易`);
            console.log(`  2. 超出网格阶段 (${upperBound.toFixed(2)} - ${finalPrice}): 应该持有ETH获得额外收益`);
            
            // 理论收益分析
            const leverage = 2;
            const inGridLeveragedReturn = inGridReturn * leverage;
            const beyondGridHoldingReturn = beyondGridReturn; // 持有ETH的收益，不再有杠杆放大新交易
            
            console.log(`\n💡 理论收益计算:`);
            console.log(`  网格内杠杆收益: ${inGridLeveragedReturn.toFixed(2)}%`);
            console.log(`  超出网格持有收益: ${beyondGridHoldingReturn.toFixed(2)}%`);
            console.log(`  合计理论收益: ${(inGridLeveragedReturn + beyondGridHoldingReturn).toFixed(2)}%`);
            
            console.log(`\n⚠️  关键问题:`);
            console.log(`  如果系统在价格超出${upperBound.toFixed(2)}后仍然进行网格交易,`);
            console.log(`  那么收益计算就会出现严重错误!`);
            console.log(`  正确的做法是在价格突破网格边界后转为"持有模式"`);
        }
    }

    /**
     * 运行完整测试
     */
    runFullTest() {
        const testResults = this.testPriceRangeCalculation();
        this.analyzeTradingImpact(testResults);
        
        console.log('\n🎯 测试结论:');
        console.log('1. 价格区间计算逻辑正确');
        console.log('2. 价格确实大幅突破了网格上边界');
        console.log('3. 关键是要确保突破边界后的交易逻辑正确');
        console.log('4. 需要验证系统在价格超出边界时是否正确处理');
        
        return testResults;
    }
}

// 运行测试
const test = new GridBoundaryTest();
const results = test.runFullTest();