# !/bin/bash

# Git提交和推送自动化脚本
# 使用方法: ./git_push.sh "提交信息"

# 检查参数
if [ $# -eq 0 ]; then
  echo "请提供提交信息作为参数"
  echo "使用方法: ./git_push.sh \"提交信息\""
  exit 1
fi

# 设置变量
BRANCH="master"  # 可以根据需要修改为 main 或其他分支名
COMMIT_MSG="$1"

# 添加所有修改的文件
echo "正在添加所有修改的文件..."
git add .
if [ $? -ne 0 ]; then
  echo "添加文件失败"
  exit 1
fi

# 提交更改
echo "正在提交更改..."
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
  echo "提交失败"
  exit 1
fi

# 推送到远程仓库
echo "正在推送到远程仓库..."
git push origin $BRANCH
if [ $? -ne 0 ]; then
  echo "推送失败"
  echo "请检查:"
  echo "1. 远程仓库是否正确设置"
  echo "2. 是否有足够的权限"
  echo "3. 分支名是否正确"
  exit 1
fi

echo "✓ 代码成功推送到远程仓库！"