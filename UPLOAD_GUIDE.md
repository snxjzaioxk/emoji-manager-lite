# 📤 GitHub Release 上传和使用完整指南

## 🎯 上传前准备

### 1. 确认文件完整性
在 `release` 文件夹中应包含以下文件：
```
📁 release/
├── 📄 Emoji-Manager-Lite-Setup-2.3.0.exe       (102MB) - 安装版
├── 📄 Emoji-Manager-Lite-Portable-2.3.0.exe    (85MB)  - 便携版
├── 📄 Emoji-Manager-Lite-Setup-2.3.0.exe.blockmap (103KB) - 校验文件
├── 📄 latest.yml                               (365B)  - 更新配置
└── 📄 README.md                                (913B)  - 说明文档
```

### 2. 验证版本号
- ✅ package.json: `2.3.0`
- ✅ 文件名包含: `2.3.0`
- ✅ latest.yml 版本: `2.3.0`

## 🚀 上传方法

### 方法 1: GitHub 网页界面 (推荐)

#### 步骤 1: 访问发布页面
```
https://github.com/snxjzaioxk/emoji-manager-lite/releases/new
```

#### 步骤 2: 填写发布信息
- **Choose a tag**: `v2.3.0` (如果不存在会自动创建)
- **Release title**: `Emoji Manager Lite v2.3.0`
- **Description**: 复制 `RELEASE_NOTES_v2.3.0.md` 的全部内容

#### 步骤 3: 上传文件
拖拽或点击上传以下文件：
1. `Emoji-Manager-Lite-Setup-2.3.0.exe`
2. `Emoji-Manager-Lite-Portable-2.3.0.exe`
3. `Emoji-Manager-Lite-Setup-2.3.0.exe.blockmap`
4. `latest.yml`

#### 步骤 4: 发布
- 选择 **Set as the latest release**
- 点击 **Publish release**

### 方法 2: GitHub CLI 命令行

```bash
# 安装 GitHub CLI (如果未安装)
# Windows: winget install --id GitHub.cli

# 登录 GitHub
gh auth login

# 创建发布
gh release create v2.3.0 \
  --title "Emoji Manager Lite v2.3.0" \
  --notes-file RELEASE_NOTES_v2.3.0.md \
  ./release/Emoji-Manager-Lite-Setup-2.3.0.exe \
  ./release/Emoji-Manager-Lite-Portable-2.3.0.exe \
  ./release/Emoji-Manager-Lite-Setup-2.3.0.exe.blockmap \
  ./release/latest.yml
```

## 👥 用户如何使用

### 📥 下载方式

#### 1. 从 GitHub Releases 下载
```
https://github.com/snxjzaioxk/emoji-manager-lite/releases/latest
```

#### 2. 选择合适的版本
- **新用户 / 一般用户**: 下载 `Emoji-Manager-Lite-Setup-2.3.0.exe`
- **需要便携使用**: 下载 `Emoji-Manager-Lite-Portable-2.3.0.exe`

### 💻 安装和使用

#### 安装版使用方法:
1. 下载 `Emoji-Manager-Lite-Setup-2.3.0.exe`
2. 双击运行安装程序
3. 按向导完成安装
4. 从开始菜单或桌面快捷方式启动

#### 便携版使用方法:
1. 下载 `Emoji-Manager-Lite-Portable-2.3.0.exe`
2. 将文件放到合适的文件夹
3. 双击直接运行（无需安装）
4. 建议创建桌面快捷方式

### 🔄 更新说明

#### 安装版更新:
- **自动更新**: 未来版本可能支持自动检查更新
- **手动更新**: 下载新版本安装包，直接安装即可覆盖

#### 便携版更新:
- **手动更新**: 下载新版本便携版，替换旧文件
- **数据迁移**: 注意备份配置和数据文件

## ⚠️ 注意事项

### 上传注意事项:
1. **必须上传技术文件**: `blockmap` 和 `latest.yml` 对自动更新很重要
2. **版本号一致**: 确保所有地方的版本号都是 v2.3.0
3. **文件完整**: 上传前验证文件大小和完整性

### 用户使用注意:
1. **系统要求**: Windows 10/11 64位
2. **安全提示**: 首次运行可能有 Windows Defender 提示
3. **存储空间**: 建议至少 500MB 可用空间

## 📊 发布后检查清单

- [ ] Release 页面显示正确的版本号
- [ ] 所有文件都已成功上传
- [ ] 下载链接可正常访问
- [ ] 安装版可正常安装和运行
- [ ] 便携版可直接运行
- [ ] 发布说明内容准确

## 🔗 相关链接

- **项目主页**: https://github.com/snxjzaioxk/emoji-manager-lite
- **发布页面**: https://github.com/snxjzaioxk/emoji-manager-lite/releases
- **问题反馈**: https://github.com/snxjzaioxk/emoji-manager-lite/issues