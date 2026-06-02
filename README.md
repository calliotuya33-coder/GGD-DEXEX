# GGD-DEXEX

โปรเจกต์นี้เป็นตัวอย่าง Web3 bot สำหรับ Flash Loan DEX arbitrage ที่เก็บกำไรไว้ใน bot wallet แล้วโอนออกไปยัง wallet ภายนอกผ่านหน้าเว็บโดยอัตโนมัติ.

## โครงสร้าง

- `bot.js` - entry point ของ arbitrage bot
- `contracts/ArbitrageFlashLoan.sol` - smart contract template สำหรับ Aave flash loan
- `pages/index.js` - dashboard เว็บสำหรับเชื่อมต่อ wallet และถอนกำไร
- `pages/api/withdraw.js` - API ส่งกำไรจาก bot wallet ไปยัง wallet ที่เชื่อมต่อ
- `pages/api/bot-status.js` - API ดูสถานะ bot wallet
- `.github/workflows/vercel-deploy.yml` - GitHub Actions สำหรับ build และ deploy
- `vercel.json` - การตั้งค่า Vercel

## การติดตั้ง

1. ติดตั้ง dependencies:
   ```bash
   npm install
   ```
2. สร้างไฟล์ `.env` ตามตัวอย่าง:
   ```bash
   cp .env.example .env
   ```
3. แก้ค่าตัวแปรใน `.env` ตามรายละเอียดด้านล่าง

## ตัวอย่าง `.env` ที่ต้องเตรียม

- `RPC_URL` - RPC node ของ Ethereum mainnet หรือ testnet
- `ALCHEMY_API_KEY` - API key ของ Alchemy (ถ้าใช้)
- `INFURA_PROJECT_ID` - project ID ของ Infura (ถ้าใช้)
- `NEXT_PUBLIC_RPC_URL` - RPC URL สำหรับ WalletConnect ในหน้าเว็บ
- `BOT_PRIVATE_KEY` - private key ของ bot wallet ที่รับกำไร
- `PRIVATE_KEY` - private key เดียวกับ bot wallet หรือสำหรับ bot execution
- `FLASHBOTS_SIGNING_KEY` - private key สำหรับ Flashbots relay
- `ARBITRAGE_CONTRACT` - ที่อยู่ smart contract ที่ deploy ไว้
- `TOKEN_ADDRESS` - ที่อยู่ ERC20 token ที่ต้องการโอน หากใช้ token แทน ETH

## การใช้งาน

- รัน bot:
  ```bash
  npm run start-bot
  ```
- เปิดเว็บ dashboard แล้วเชื่อมต่อ wallet
- กดปุ่ม `Withdraw profit to connected wallet` เพื่อให้ bot wallet ส่งกำไรไปยัง wallet ที่เชื่อมต่อ

### Local dry-run สำเร็จรูป

- เปิด Hardhat local fork:
  ```bash
  npm run hardhat:node
  ```
- รัน dry-run ด้วย local fork:
  ```bash
  npm run dry-run:local
  ```

คำสั่งนี้จะใช้ `RPC_URL=http://127.0.0.1:8545` เพื่อรันการสแกน arbitrage แบบไม่ส่งธุรกรรมจริงบน node local fork.

## Wallet ที่รองรับ

- MetaMask
- Coinbase Wallet
- Exodus
- Trust Wallet (ผ่าน WalletConnect)
- wallets อื่น ๆ ที่รองรับ WalletConnect

## คำอธิบายการทำงาน

- bot.js ใช้ bot wallet ในการสแกนโอกาส arbitrage และส่ง private bundle ผ่าน Flashbots
- กำไรจากการ swap จะเข้าบัญชี bot wallet
- หน้าเว็บสามารถเชื่อมต่อ wallet ภายนอกและเรียก API `/api/withdraw` เพื่อถอนกำไรไปยัง address นั้น

## หมายเหตุ

ระบบนี้เป็นโครงสร้างตัวอย่าง โดยยังต้องมี:
- RPC provider ที่ใช้งานได้
- private keys ที่ถูกต้อง
- Flashbots relay credentials
- smart contract ที่ deploy แล้ว

> คำเตือน: ห้ามเก็บ private key ใน repository สาธารณะ และควรใช้งานในสภาพแวดล้อมที่ปลอดภัยเสมอ

## หมายเหตุเพิ่มเติมเกี่ยวกับคีย์

- ผมได้สร้างไฟล์ `.env` ในโปรเจกต์นี้และใส่ค่า Alchemy RPC URL และ Etherscan API Key ตามที่คุณให้มา (`RPC_URL`, `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`).
- ไฟล์ `.env` เป็นไฟล์ที่มีข้อมูลลับและไม่ควรถูก commit ไปยัง repository สาธารณะ หากต้องการ deploy ให้ตั้งค่า environment variables ใน Vercel dashboard แทนการฝากคีย์ไว้ใน repo.

หากต้องการ ผมสามารถลบไฟล์ `.env` นี้ออกและแนะนำขั้นตอนการตั้งค่า secrets บน Vercel ให้เป็นขั้นตอนถัดไป.

## วิธีตั้งค่า Secrets และ Environment Variables

ต่อไปนี้เป็นคำสั่งตัวอย่างที่ช่วยให้คุณตั้งค่า secrets ทั้งบน GitHub (สำหรับ workflow) และบน Vercel (สำหรับ runtime env). คำสั่งเหล่านี้เป็นตัวอย่าง — อย่าใส่ค่าจริงใน public repo.

1) ตั้งค่า GitHub repository secrets (ต้องติดตั้ง `gh` และ login):

```bash
# ตั้งชื่อ repo ตัวอย่าง: owner/repo
export GITHUB_REPOSITORY=yourOrgOrUser/GGD-DEXEX
# ตั้งค่า secrets ด้วย gh CLI
gh secret set VERCEL_TOKEN --body "<YOUR_VERCEL_TOKEN>"
gh secret set VERCEL_ORG_ID --body "<YOUR_VERCEL_ORG_ID>"
gh secret set VERCEL_PROJECT_ID --body "<YOUR_VERCEL_PROJECT_ID>"
```

2) ตั้งค่า environment variables บน Vercel (ต้องติดตั้ง `vercel` และ login):

```bash
vercel login
# เพิ่มค่าแบบ interactive (ตัวอย่างสำหรับ production)
vercel env add RPC_URL production
vercel env add BOT_PRIVATE_KEY production
vercel env add FLASHBOTS_SIGNING_KEY production
vercel env add ARBITRAGE_CONTRACT production
vercel env add TOKEN_ADDRESS production
vercel env add ETHERSCAN_API_KEY production
```

3) คำสั่งช่วยตั้งค่าแบบตัวอย่าง (ไม่มีการส่งค่าใดๆ โดยอัตโนมัติ):

```bash
bash scripts/set-secrets.sh
```

4) เมื่อตั้งค่าเรียบร้อย ให้ push โค้ดไปยังสาขา `main` เพื่อให้ GitHub Actions ทำงานและ deploy ไปยัง Vercel

```bash
git add .
git commit -m "Prepare for Vercel deployment: add env examples"
git push origin main
```

---

คำเตือนความปลอดภัย: ใช้ secrets manager หรือ environment variables ของแพลตฟอร์ม (Vercel, GitHub Actions) แทนการเก็บ `.env` ใน repo. หากต้องการ ผมช่วยลบ `.env` ออกจาก repository ให้และอธิบายวิธีเก็บคีย์อย่างปลอดภัยบน Vercel ได้
