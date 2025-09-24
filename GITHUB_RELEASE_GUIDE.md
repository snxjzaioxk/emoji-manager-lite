# GitHub Release 发布指南

## 自动包含源代码

GitHub Release 会自动包含两个源代码文件：
- `Source code (zip)` - ZIP 格式的源代码
- `Source code (tar.gz)` - tar.gz 格式的源代码

这些是基于你的 git tag 自动生成的，不需要手动上传。

## 创建 v2.0.0 Release 的步骤

### 方法 1: 通过 GitHub 网页界面

1. 访问: https://github.com/snxjzaioxk/emoji-manager-lite/releases/new

2. 填写信息：
   - **Choose a tag**: 选择 `v2.0.0`
   - **Release title**: `Emoji Manager Lite v2.0.0`
   - **Description**: 复制 `RELEASE_NOTES_v2.0.0.md` 的内容

3. 上传文件（从 `release` 文件夹）：
   - `Emoji-Manager-Lite-Setup-2.0.0.exe` (106MB)
   - `Emoji-Manager-Lite-Portable-2.0.0.exe` (88MB)

4. 设置选项：
   - ✅ Set as the latest release
   - ❌ Set as a pre-release（不要勾选）

5. 点击 **Publish release**

### 方法 2: 使用 GitHub CLI（需要先安装）

```bash
# 安装 GitHub CLI (Windows)
winget install GitHub.cli

# 或者通过 Scoop
scoop install gh

# 登录
gh auth login

# 创建 Release
gh release create v2.0.0 \
  --title "Emoji Manager Lite v2.0.0" \
  --notes-file RELEASE_NOTES_v2.0.0.md \
  ./release/Emoji-Manager-Lite-Setup-2.0.0.exe \
  ./release/Emoji-Manager-Lite-Portable-2.0.0.exe
```

### 方法 3: 使用 curl 和 GitHub API

```bash
# 需要 GitHub Personal Access Token
# 在 https://github.com/settings/tokens 创建

# 设置 token
export GITHUB_TOKEN="your_token_here"

# 创建 release
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/snxjzaioxk/emoji-manager-lite/releases \
  -d '{
    "tag_name": "v2.0.0",
    "name": "Emoji Manager Lite v2.0.0",
    "body": "在这里粘贴 RELEASE_NOTES_v2.0.0.md 的内容",
    "draft": false,
    "prerelease": false
  }'

# 然后上传文件（需要获取 release ID）
```

## 为什么 Release 会包含源代码？

- GitHub 自动为每个 Release 添加源代码压缩包
- 这基于你创建的 git tag 时的代码快照
- 用户可以选择下载编译好的程序或源代码
- 这是 GitHub 的标准做法，有助于开源透明

## 验证 Release

创建后，访问: https://github.com/snxjzaioxk/emoji-manager-lite/releases

确认包含：
- ✅ Source code (zip) - 自动生成
- ✅ Source code (tar.gz) - 自动生成
- ✅ Emoji-Manager-Lite-Setup-2.0.0.exe - 手动上传
- ✅ Emoji-Manager-Lite-Portable-2.0.0.exe - 手动上传

## 注意事项

- Release 的源代码是基于 tag 的，确保 tag 已推送到远程
- 二进制文件需要手动上传或通过 CI/CD 自动上传
- Release notes 支持 Markdown 格式