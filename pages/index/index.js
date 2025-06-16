// pages/index/index.js
Page({
  data: {
    points: [],
    sortedPoints: [],
    currentX: null,
    currentY: null,
    regressionEquation: '',
    rSquared: 0,
    canvasWidth: 300,
    canvasHeight: 500,
    
    // 坐标系范围
    xMin: 0,
    xMax: 20,   // 横坐标范围 0-20cm
    yMin: 0,
    yMax: 170,  // 纵坐标范围 0-170cm
    padding: 50  // 增加内边距
  },
// 计算排序后的点
computeSortedPoints() {
  const points = this.data.points.slice(); // 创建副本
  
  // 按X坐标升序排序
  const sortedPoints = points.sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
  
  // 添加原始索引信息，用于删除操作
  const pointsWithIndex = sortedPoints.map((point, index) => ({
    ...point,
    originalIndex: index
  }));
  
  this.setData({
    sortedPoints: pointsWithIndex
  });
},
  onReady() {
    this.initializeCanvas();
    this.drawCompleteScene();
  },

  initializeCanvas() {
    const systemInfo = wx.getSystemInfoSync();
    const width = systemInfo.windowWidth * 0.9;
    
    // 确保有足够的内边距，使坐标系完整显示
    const canvasWidth = width;
    const canvasHeight = Math.min(width * 0.8, 500); // 高度基于宽度计算
    
    this.setData({
      canvasWidth,
      canvasHeight
    }, () => {
      this.drawCompleteScene();
    });
  },

  // 绘制完整场景
  drawCompleteScene() {
    const ctx = wx.createCanvasContext('coordinateCanvas', this);
    const width = this.data.canvasWidth;
    const height = this.data.canvasHeight;
    const padding = this.data.padding;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制坐标系背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制坐标系
    this.drawCoordinateSystem(ctx, width, height, padding);
    
    // 如果有数据点，绘制点和连线
    if (this.data.points.length > 0) {
      this.drawDataPoints(ctx, width, height, padding);
      this.drawConnectingLines(ctx, width, height, padding);
    }
    
    // 绘制回归线
    if (this.data.regressionEquation) {
      this.drawRegressionLine(ctx, width, height, padding);
    }
    
    ctx.draw();
  },

  // 绘制坐标系（修复显示问题）
  drawCoordinateSystem(ctx, width, height, padding) {
    const { xMin, xMax, yMin, yMax } = this.data;
    
    // 计算可用绘图区域（减去内边距）
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;
    
    // 原点位置
    const originX = padding;
    const originY = height - padding;
    
    // 绘制坐标轴
    ctx.beginPath();
    ctx.setStrokeStyle('#2c3e50');
    ctx.setLineWidth(2);
    
    // X轴
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + plotWidth, originY);
    
    // Y轴
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, originY - plotHeight);
    
    // 绘制箭头
    // X轴箭头
    ctx.moveTo(originX + plotWidth, originY);
    ctx.lineTo(originX + plotWidth - 12, originY - 5);
    ctx.lineTo(originX + plotWidth - 12, originY + 5);
    
    // Y轴箭头
    ctx.moveTo(originX, originY - plotHeight);
    ctx.lineTo(originX - 5, originY - plotHeight + 12);
    ctx.lineTo(originX + 5, originY - plotHeight + 12);
    
    ctx.stroke();
    
    // 计算比例
    const xScale = plotWidth / (xMax - xMin);
    const yScale = plotHeight / (yMax - yMin);
    
    // X轴刻度 (每2cm一个刻度)
    ctx.setFontSize(14);
    ctx.setFillStyle('#4a5568');
    ctx.setTextAlign('center');
    
    for (let i = 0; i <= 20; i += 2) {
      const xPos = originX + i * xScale;
      
      // 刻度线
      ctx.beginPath();
      ctx.moveTo(xPos, originY);
      ctx.lineTo(xPos, originY + 8);
      ctx.stroke();
      
      // 刻度值
      ctx.fillText(`${i}cm`, xPos, originY + 25);
    }
    
    // Y轴刻度 (每20cm一个刻度)
    ctx.setTextAlign('right');
    for (let i = 0; i <= 170; i += 20) {
      const yPos = originY - i * yScale;
      
      // 刻度线
      ctx.beginPath();
      ctx.moveTo(originX - 8, yPos);
      ctx.lineTo(originX, yPos);
      ctx.stroke();
      
      // 刻度值
      ctx.fillText(`${i}cm`, originX - 10, yPos + 5);
    }
    
    // 原点标记
    ctx.fillText('O', originX - 10, originY + 20);
    
    // 坐标轴标签
    ctx.setFontSize(16);
    ctx.setTextAlign('center');
    ctx.fillText('X轴 (cm)', originX + plotWidth / 2, originY + 50);
    
    ctx.setFontSize(16);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y轴 (cm)', -originY + plotHeight / 2, originX - 25);
    ctx.rotate(Math.PI / 2);
    
    // 绘制网格
    ctx.setStrokeStyle('#e2e8f0');
    ctx.setLineWidth(0.5);
    
    // X轴网格 (每2cm)
    for (let i = 0; i <= 20; i += 2) {
      const xPos = originX + i * xScale;
      
      ctx.beginPath();
      ctx.moveTo(xPos, originY);
      ctx.lineTo(xPos, originY - plotHeight);
      ctx.stroke();
    }
    
    // Y轴网格 (每20cm)
    for (let i = 0; i <= 170; i += 20) {
      const yPos = originY - i * yScale;
      
      ctx.beginPath();
      ctx.moveTo(originX, yPos);
      ctx.lineTo(originX + plotWidth, yPos);
      ctx.stroke();
    }
  },

  // 坐标转换函数
  convertToCanvasCoords(xVal, yVal, width, height, padding) {
    const { xMin, xMax, yMin, yMax } = this.data;
    
    // 计算绘图区域
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;
    
    // 原点位置
    const originX = padding;
    const originY = height - padding;
    
    // 计算比例
    const xScale = plotWidth / (xMax - xMin);
    const yScale = plotHeight / (yMax - yMin);
    
    // 转换为画布坐标
    const xPos = originX + (xVal - xMin) * xScale;
    const yPos = originY - (yVal - yMin) * yScale;
    
    return { x: xPos, y: yPos };
  },

  // 绘制数据点
  drawDataPoints(ctx, width, height, padding) {
    const points = this.data.points;
    
    ctx.setFillStyle('#e74c3c');
    
    points.forEach(point => {
      const screenPos = this.convertToCanvasCoords(point.x, point.y, width, height, padding);
      
      // 绘制点
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  // 绘制点之间的连线（按X坐标顺序连接）
  drawConnectingLines(ctx, width, height, padding) {
    // 获取按X排序的点
    const sortedPoints = this.data.sortedPoints;
    
    if (sortedPoints.length < 2) return;
    
    ctx.beginPath();
    ctx.setStrokeStyle('#3498db');
    ctx.setLineWidth(2);
    
    // 按排序后的顺序连接点
    for (let i = 0; i < sortedPoints.length; i++) {
      const screenPos = this.convertToCanvasCoords(sortedPoints[i].x, sortedPoints[i].y, width, height, padding);
      
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    }
    
    ctx.stroke();
  },

  // 绘制回归线（按X坐标顺序）
  drawRegressionLine(ctx, width, height, padding) {
    // 获取按X排序的点
    const sortedPoints = this.data.sortedPoints;
    
    if (sortedPoints.length < 2) return;
    
    // 解析方程
    const equation = this.data.regressionEquation;
    const parts = equation.split(' ');
    const slope = parseFloat(parts[2]);
    const intercept = parseFloat(parts[4]);
    
    // 获取最小和最大X坐标
    const minX = sortedPoints[0].x;
    const maxX = sortedPoints[sortedPoints.length - 1].x;
    
    // 计算回归线的起点和终点
    const startX = minX;
    const endX = maxX;
    const startY = slope * startX + intercept;
    const endY = slope * endX + intercept;
    
    // 转换为画布坐标
    const startScreen = this.convertToCanvasCoords(startX, startY, width, height, padding);
    const endScreen = this.convertToCanvasCoords(endX, endY, width, height, padding);
    
    // 绘制回归线
    ctx.beginPath();
    ctx.setStrokeStyle('#27ae60');
    ctx.setLineWidth(2);
    ctx.setLineDash([5, 3]);
    ctx.moveTo(startScreen.x, startScreen.y);
    ctx.lineTo(endScreen.x, endScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  // 输入处理
  bindXInput(e) {
    const value = parseFloat(e.detail.value);
    if (!isNaN(value)) {
      this.setData({ 
        currentX: Math.max(0, Math.min(20, value))
      });
    } else {
      this.setData({ currentX: null });
    }
  },

  bindYInput(e) {
    const value = parseFloat(e.detail.value);
    if (!isNaN(value)) {
      this.setData({ 
        currentY: Math.max(0, Math.min(170, value))
      });
    } else {
      this.setData({ currentY: null });
    }
  },

  // 添加点
  addPoint() {
    const { currentX, currentY } = this.data;
    
    if (currentX === null || currentY === null) {
      wx.showToast({ title: '请输入有效的坐标值', icon: 'none' });
      return;
    }
    
    // 添加新点
    const newPoints = [...this.data.points, { x: currentX, y: currentY }];
    
    this.setData({
      points: newPoints,
      currentX: null,
      currentY: null,
      regressionEquation: '',
      rSquared: 0
    }, () => {
      this.computeSortedPoints(); // 重新计算排序点
      this.drawCompleteScene();
    });
  },

  // 删除点
  removePoint(e) {
    const index = e.currentTarget.dataset.index;
    const points = this.data.points;
    
    const newPoints = [...points];
    newPoints.splice(index, 1);
    
    this.setData({
      points: newPoints,
      regressionEquation: newPoints.length > 1 ? this.data.regressionEquation : '',
      rSquared: newPoints.length > 1 ? this.data.rSquared : 0
    }, () => {
      this.computeSortedPoints(); // 重新计算排序点
      this.drawCompleteScene();
    });

  },

  // 清空所有
  clearAll() {
    this.setData({
      points: [],
      regressionEquation: '',
      rSquared: 0
    }, () => this.drawCompleteScene());
  },

  // 计算线性回归
  calculateRegression() {
    const points = this.data.points;
    
    if (points.length < 2) {
      wx.showToast({ title: '需要至少两个点才能计算回归', icon: 'none' });
      return;
    }
    
    const regression = this.linearRegression(points);
    
    this.setData({
      regressionEquation: `y = ${regression.slope.toFixed(4)}x + ${regression.intercept.toFixed(4)}`,
      rSquared: regression.rSquared
    }, () => this.drawCompleteScene());
  },

  // 线性回归计算函数
  linearRegression(points) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = points.length;
    
    points.forEach(point => {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
    });
    
    // 计算斜率和截距
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 计算R平方值
    let ssTotal = 0;
    let ssResidual = 0;
    const meanY = sumY / n;
    
    points.forEach(point => {
      const predictedY = slope * point.x + intercept;
      ssTotal += Math.pow(point.y - meanY, 2);
      ssResidual += Math.pow(point.y - predictedY, 2);
    });
    
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return {
      slope,
      intercept,
      rSquared
    };
  }
});