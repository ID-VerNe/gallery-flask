import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 开始自动构建与发版流程...\n');

try {
  // 1. 获取当前版本号
  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  const version = tauriConf.version;
  const productName = tauriConf.productName || 'gallery-culling';
  console.log(`📦 当前打包版本: v${version}`);

  // 2. 检查密钥文件
  const keyPath = path.join(rootDir, 'updater.key');
  if (!fs.existsSync(keyPath)) {
    console.warn('⚠️ 警告: 未找到 updater.key 密钥文件！必须存在私钥才能为更新包签名。');
  }

  // 3. 执行 Tauri 构建 (带签名)
  console.log('🔨 正在执行 Tauri Build 构建应用，这可能需要几分钟...');
  // 通过环境变量传入私钥路径
  execSync('pnpm tauri build', { 
    stdio: 'inherit', 
    cwd: rootDir,
    env: { 
      ...process.env, 
      TAURI_SIGNING_PRIVATE_KEY_PATH: keyPath,
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '' 
    }
  });

  // 4. 寻找更新包和签名文件 (Tauri 会自动打包出 .zip 和 .zip.sig 用于热更新)
  // 优先寻找 NSIS 格式，也可以找 MSI 格式
  const nsisDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  const setupExeName = `${productName}_${version}_x64-setup.exe`;
  const zipName = `${setupExeName}.zip`;
  const sigName = `${zipName}.sig`;

  const sigPath = path.join(nsisDir, sigName);
  
  if (!fs.existsSync(sigPath)) {
    throw new Error(`❌ 签名文件未找到: ${sigPath}\n请确认构建时 Tauri 是否成功读取了私钥并生成了签名。`);
  }

  const signature = fs.readFileSync(sigPath, 'utf8').trim();
  console.log('🔑 成功提取更新包数字签名。');

  // 5. 生成 updater.json
  const updaterObj = {
    version: `v${version}`,
    notes: "🚀 应用有新版本发布啦！",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: `https://github.com/ID-VerNe/gallery-culling/releases/download/v${version}/${zipName}`
      }
    }
  };

  const updaterPath = path.join(rootDir, 'updater.json');
  fs.writeFileSync(updaterPath, JSON.stringify(updaterObj, null, 2));
  console.log(`\n✅ 成功生成 Tauri 更新配置: updater.json\n`);
  
  console.log(`=========================================`);
  console.log(`🎉 打包与签名成功！接下来的发布步骤：`);
  console.log(`1. 在 GitHub 上创建一个 Release，标签为 v${version}`);
  console.log(`2. 将以下两个文件上传到该 Release 的附件中：\n   - ${path.join(nsisDir, setupExeName)} (给新用户安装用)\n   - ${path.join(nsisDir, zipName)} (给老用户后台自动更新用)`);
  console.log(`3. 将本地新生成的 updater.json 执行 git commit 并 push 到 master 分支。`);
  console.log(`老客户端检测到 updater.json 发生变动后，就会自动弹窗提示用户更新了！`);
  console.log(`=========================================`);
  
} catch (err) {
  console.error('\n❌ 脚本执行失败:', err.message);
  process.exit(1);
}
