/**
 * 强制调试测试 - 验证修复是否真正生效
 * 在网页中直接运行这段代码来测试
 */

console.log('🔍 强制调试测试开始');

// 测试修复后的shouldBuy逻辑
function testShouldBuyLogic() {
    console.log('\n📊 测试shouldBuy逻辑');
    console.log('-'.repeat(30));
    
    // 模拟网格策略配置
    const mockConfig = {
        leverage: 2,
        feeRate: 0.0002
    };
    
    // 模拟网格价格水平
    const gridLevels = [2050.93, 2070, 2090, 2110, 2130, 2150, 2170, 2190, 2210, 2230, 2250, 2270, 2290, 2310, 2330, 2350, 2370, 2390, 2410, 2430, 2450, 2470, 2490, 2506.69];
    
    // 模拟持仓
    const mockPosition = {
        status: 'waiting',
        allocated: 40000
    };
    
    // 模拟网格策略对象
    const mockStrategy = {
        config: mockConfig,
        gridLevels: gridLevels,
        balance: 1000000
    };
    
    // 测试修复后的shouldBuy函数
    function shouldBuyFixed(currentPrice, gridPrice, position, strategy) {
        const lowerBound = strategy.gridLevels[0];
        const upperBound = strategy.gridLevels[strategy.gridLevels.length - 1];
        
        if (position.status !== 'waiting' || strategy.balance < position.allocated) {
            return false;
        }
        
        if (currentPrice < lowerBound || currentPrice > upperBound) {
            if (currentPrice > upperBound) {
                console.log(`🚨 shouldBuy: 价格$${currentPrice.toFixed(2)}超出上边界$${upperBound.toFixed(2)}，拒绝买入`);
            }
            return false;
        }
        
        const tolerance = gridPrice * 0.002;
        const shouldBuyResult = currentPrice < gridPrice - tolerance;
        
        if (shouldBuyResult) {
            console.log(`✅ shouldBuy: 价格$${currentPrice.toFixed(2)} < 网格$${gridPrice.toFixed(2)}, 可以买入`);
        }
        
        return shouldBuyResult;
    }
    
    // 测试不同价格
    const testPrices = [
        { price: 2278.81, desc: '基准价格' },
        { price: 2600, desc: '超出上边界' },
        { price: 3693.75, desc: '最终价格(远超边界)' }
    ];
    
    testPrices.forEach(test => {
        console.log(`\n测试价格: $${test.price} (${test.desc})`);
        
        let buyCount = 0;
        gridLevels.forEach((gridPrice, index) => {
            const canBuy = shouldBuyFixed(test.price, gridPrice, mockPosition, mockStrategy);
            if (canBuy) buyCount++;
        });
        
        console.log(`结果: ${buyCount}个网格可以买入`);
        
        if (test.price > 2506.69 && buyCount > 0) {
            console.log('🚨 错误！价格超出边界但仍可买入');
        } else if (test.price > 2506.69 && buyCount === 0) {
            console.log('✅ 正确！价格超出边界时拒绝买入');
        }
    });
}

// 测试是否存在代码缓存问题
function checkCodeVersion() {
    console.log('\n🔍 检查代码版本');
    console.log('-'.repeat(20));
    
    // 检查GridStrategy是否存在
    if (typeof GridStrategy !== 'undefined') {
        console.log('✅ GridStrategy类已加载');
        
        // 检查shouldBuy方法是否包含调试代码
        const shouldBuyCode = GridStrategy.prototype.shouldBuy.toString();
        
        if (shouldBuyCode.includes('添加调试日志') || shouldBuyCode.includes('🐛')) {
            console.log('✅ 发现调试代码，修复已加载');
        } else {
            console.log('❌ 未发现调试代码，可能使用旧版本');
            console.log('当前shouldBuy代码片段:');
            console.log(shouldBuyCode.substring(0, 200) + '...');
        }
    } else {
        console.log('❌ GridStrategy类未找到');
    }
}

// 运行测试
testShouldBuyLogic();
checkCodeVersion();

console.log('\n🎯 调试测试完成');
console.log('如果没有看到预期的调试日志，说明浏览器使用了缓存的旧代码');
console.log('请尝试：');
console.log('1. 硬刷新页面 (Ctrl+Shift+R 或 Cmd+Shift+R)');
console.log('2. 清除浏览器缓存');
console.log('3. 或者在Network选项卡中勾选"Disable cache"');