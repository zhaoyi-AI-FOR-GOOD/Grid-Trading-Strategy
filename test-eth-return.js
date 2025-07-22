// 简单测试ETH收益率计算
const startPrice = 2272.00;
const endPrice = 2280.50;
const ethReturn = (endPrice - startPrice) / startPrice;

console.log('起始价格:', startPrice);
console.log('结束价格:', endPrice);
console.log('ETH收益率:', ethReturn);
console.log('ETH收益率(%):', (ethReturn * 100).toFixed(2) + '%');