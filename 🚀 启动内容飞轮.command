#!/bin/bash

echo "🚀 内容飞轮启动器"
echo "=================="
echo ""

# 获取项目目录
PROJECT_DIR="/Users/hobby/Desktop/最近做的小工具/20260224-内容飞轮-gemini/20260302-V4"
cd "$PROJECT_DIR"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 首次启动，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        read -n 1 -s -r -p "按任意键退出..."
        exit 1
    fi
fi

# 检查端口 5173
PID=$(lsof -ti:5173 2>/dev/null)
if [ ! -z "$PID" ]; then
    echo "🛑 检测到已有服务在运行，正在重启..."
    kill -9 $PID 2>/dev/null
    sleep 1
fi

echo "🎯 正在启动内容飞轮..."
echo ""

# 启动服务器并打开浏览器
# 使用 & 让服务器在后台运行，但保持终端窗口打开
npm run dev &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务启动..."
sleep 3

# 打开浏览器
open "http://localhost:5173"

echo ""
echo "✅ 启动成功！"
echo "   本地地址: http://localhost:5173"
echo ""
echo "💡 提示:"
echo "   • 不要关闭此窗口，否则服务会停止"
echo "   • 按 Ctrl+C 可以停止服务"
echo ""

# 等待服务器进程结束
wait $SERVER_PID
