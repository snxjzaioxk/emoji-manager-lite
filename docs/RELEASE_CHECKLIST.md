# 发布检查清单

## 版本发布前检查 (Pre-Release Checklist)

### 代码准备
- [ ] 所有功能已完成并合并到主分支
- [ ] 代码已通过 Code Review
- [ ] 所有 TODO 和 FIXME 已处理
- [ ] 移除所有调试代码和 console.log
- [ ] 更新依赖包到最新稳定版本
- [ ] 解决所有安全漏洞警告

### 测试验证
- [ ] **单元测试**: 覆盖率 > 80%
- [ ] **集成测试**: 核心流程通过
- [ ] **E2E测试**: 主要用户场景通过
- [ ] **性能测试**: 达到性能基准
- [ ] **兼容性测试**:
  - [ ] Windows 10 x64
  - [ ] Windows 11 x64
  - [ ] macOS 11+ (Intel)
  - [ ] macOS 11+ (Apple Silicon)
  - [ ] Ubuntu 20.04+
- [ ] **回归测试**: 所有旧功能正常
- [ ] **压力测试**: 极限场景稳定

### Bug修复
- [ ] 所有 P0 (致命) Bug 已修复
- [ ] 所有 P1 (严重) Bug 已修复
- [ ] P2 (一般) Bug 评估并决定是否修复
- [ ] 已知问题记录在 KNOWN_ISSUES.md

### 文档更新
- [ ] **README.md**: 最新功能和使用说明
- [ ] **CHANGELOG.md**: 完整的更新日志
- [ ] **USER_GUIDE.md**: 用户手册更新
- [ ] **API文档**: 如有API变更需更新
- [ ] **LICENSE**: 许可证文件正确
- [ ] **贡献指南**: CONTRIBUTING.md 更新
- [ ] **安装说明**: 各平台安装指南
- [ ] **迁移指南**: 从旧版本升级说明
- [ ] **已知问题**: KNOWN_ISSUES.md

### 版本信息
- [ ] 更新 package.json 版本号
- [ ] 更新 electron-builder.yml 版本
- [ ] 创建 Git 版本标签
- [ ] 版本号遵循语义化版本规范
- [ ] 版本号与文档一致

### 构建准备
- [ ] 清理 node_modules 重新安装
- [ ] 清理 dist 和 build 目录
- [ ] 验证构建脚本正常运行
- [ ] 检查构建产物大小合理
- [ ] 验证安装包可以正常安装
- [ ] 验证安装包可以正常卸载
- [ ] 检查不同平台的构建产物

### 资源文件
- [ ] **图标**: 各尺寸图标齐全
  - [ ] Windows: icon.ico (256x256)
  - [ ] macOS: icon.icns (512x512)
  - [ ] Linux: PNG icons (多尺寸)
- [ ] **启动画面**: splash.png (可选)
- [ ] **安装程序图标**: 安装/卸载图标
- [ ] **应用截图**: 最新界面截图
- [ ] **宣传素材**: Banner, Logo 等

### 发布说明
- [ ] 编写发布公告
- [ ] 准备更新亮点
- [ ] 截图和演示视频
- [ ] 常见问题FAQ
- [ ] 升级提示和注意事项

### Beta测试
- [ ] 发布 Beta 版本
- [ ] 收集至少 10 位用户反馈
- [ ] 处理 Beta 测试发现的问题
- [ ] 确认没有阻塞性问题

### 安全检查
- [ ] 代码安全扫描
- [ ] 依赖包漏洞扫描
- [ ] 敏感信息检查（密钥、密码等）
- [ ] HTTPS/SSL 配置正确
- [ ] 数据加密实现正确
- [ ] 输入验证和转义

### 性能优化
- [ ] 启动时间 < 3s
- [ ] 内存占用合理
- [ ] CPU使用率正常
- [ ] 渲染流畅 (60fps)
- [ ] 资源文件已压缩
- [ ] 代码已混淆/压缩

---

## 发布流程 (Release Process)

### 1. 准备阶段
```bash
# 确保在主分支
git checkout main
git pull origin main

# 创建发布分支
git checkout -b release/v3.4.0

# 更新版本号
npm version 3.4.0

# 运行测试
npm run test
npm run test:e2e

# 构建检查
npm run build
```

### 2. 构建阶段
```bash
# 清理旧构建
npm run clean

# 构建所有平台
npm run build:win
npm run build:mac
npm run build:linux

# 或者一次性构建
npm run build:all
```

### 3. 验证阶段
- [ ] 在 Windows 上安装测试
- [ ] 在 macOS 上安装测试
- [ ] 在 Linux 上安装测试
- [ ] 验证所有核心功能
- [ ] 验证升级流程（从旧版本升级）

### 4. 发布到GitHub
```bash
# 提交更改
git add .
git commit -m "chore: prepare release v3.4.0"

# 合并到主分支
git checkout main
git merge release/v3.4.0

# 创建标签
git tag -a v3.4.0 -m "Release v3.4.0"

# 推送到远程
git push origin main
git push origin v3.4.0
```

### 5. GitHub Release
- [ ] 登录 GitHub
- [ ] 进入 Releases 页面
- [ ] 点击 "Draft a new release"
- [ ] 选择标签 v3.4.0
- [ ] 填写发布标题和说明
- [ ] 上传构建产物：
  - [ ] Windows NSIS 安装包
  - [ ] Windows Portable 版本
  - [ ] macOS DMG
  - [ ] Linux AppImage
  - [ ] Linux DEB
  - [ ] Linux RPM
- [ ] 勾选 "This is a pre-release" (如果是预发布)
- [ ] 点击 "Publish release"

### 6. 发布公告
- [ ] 在官网发布更新公告
- [ ] 在社交媒体发布（Twitter, Facebook等）
- [ ] 在论坛/社区发布
- [ ] 发送邮件通知（订阅用户）
- [ ] 更新下载页面链接

### 7. 监控阶段
- [ ] 监控下载量
- [ ] 监控错误报告
- [ ] 关注用户反馈
- [ ] 准备热修复计划（如需要）

---

## 热修复流程 (Hotfix Process)

如果发现严重Bug需要紧急修复：

```bash
# 从主分支创建热修复分支
git checkout main
git checkout -b hotfix/v3.4.1

# 修复Bug并测试
# ... 修复代码 ...
npm run test

# 更新版本号
npm version patch  # 3.4.0 -> 3.4.1

# 构建
npm run build:all

# 提交并合并
git commit -m "fix: critical bug description"
git checkout main
git merge hotfix/v3.4.1
git tag -a v3.4.1 -m "Hotfix v3.4.1"
git push origin main v3.4.1

# 发布到GitHub
# 在GitHub创建新的Release
```

---

## 发布后检查 (Post-Release)

### 立即检查
- [ ] 验证下载链接可用
- [ ] 验证安装包可以下载
- [ ] 验证安装包可以正常安装
- [ ] 检查网站更新成功
- [ ] 监控错误报告系统

### 24小时内
- [ ] 查看用户反馈
- [ ] 监控崩溃报告
- [ ] 统计下载量
- [ ] 检查性能指标
- [ ] 回应用户问题

### 一周内
- [ ] 收集用户评价
- [ ] 分析使用数据
- [ ] 整理反馈清单
- [ ] 规划下一版本
- [ ] 更新路线图

### 持续维护
- [ ] 定期监控错误
- [ ] 及时回应Issue
- [ ] 收集功能建议
- [ ] 准备下一版本
- [ ] 维护文档更新

---

## 回滚计划 (Rollback Plan)

如果发现严重问题需要回滚：

1. **立即行动**
   - [ ] 在GitHub标记为有问题的版本
   - [ ] 在下载页面添加警告
   - [ ] 发布公告说明情况

2. **紧急修复**
   - [ ] 评估问题严重程度
   - [ ] 决定是否需要热修复
   - [ ] 或者建议用户回退到旧版本

3. **沟通**
   - [ ] 向用户道歉
   - [ ] 说明问题和解决方案
   - [ ] 提供降级指南
   - [ ] 预告修复时间

---

## 版本发布时间表

### Alpha (内测版)
- 功能开发完成 70%
- 仅内部测试
- 可能有较多Bug
- 不公开发布

### Beta (公测版)
- 功能开发完成 90%
- 邀请用户测试
- 主要功能稳定
- GitHub Releases 标记为 Pre-release

### RC (候选版本)
- 功能开发完成 100%
- 所有已知Bug已修复
- 最终测试阶段
- 准备正式发布

### Stable (稳定版)
- 经过充分测试
- 无已知严重Bug
- 正式对外发布
- 推荐所有用户使用

---

## 联系方式

**发布负责人**: [姓名]
**技术支持**: support@example.com
**紧急联系**: [电话]