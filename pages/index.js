import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [status, setStatus] = useState('Disconnected');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [message, setMessage] = useState('');
  const [botStatus, setBotStatus] = useState(null);

  useEffect(() => {
    fetch('/api/bot-status')
      .then((res) => res.json())
      .then((data) => setBotStatus(data))
      .catch(() => setBotStatus(null));
  }, []);

  const connectInjected = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setMessage('ไม่มี wallet แบบ injected เช่น MetaMask หรือ Coinbase Extension ในเบราว์เซอร์นี้');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setConnectedAddress(accounts[0]);
      setWalletType('Injected Wallet');
      setStatus('Connected');
      setMessage('เชื่อมต่อ wallet สำเร็จ');
    } catch (error) {
      setMessage(error.message || 'การเชื่อมต่อ wallet ล้มเหลว');
    }
  };

  const connectWalletConnect = async () => {
    if (typeof window === 'undefined') {
      setMessage('ไม่สามารถเชื่อมต่อ WalletConnect บน server side ได้');
      return;
    }

    try {
      const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
      const provider = new WalletConnectProvider({
        rpc: {
          1: process.env.NEXT_PUBLIC_RPC_URL || 'https://cloudflare-eth.com',
        },
        qrcode: true,
      });

      await provider.enable();
      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();

      setConnectedAddress(address);
      setWalletType('WalletConnect');
      setStatus('Connected');
      setMessage('เชื่อมต่อ wallet ผ่าน WalletConnect สำเร็จ');
    } catch (error) {
      setMessage(error.message || 'การเชื่อมต่อ WalletConnect ล้มเหลว');
    }
  };

  const withdrawProfit = async () => {
    if (!connectedAddress) {
      setMessage('กรุณาเชื่อมต่อ wallet ก่อน');
      return;
    }

    try {
      setMessage('กำลังร้องขอการโอนจาก bot wallet...');
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: connectedAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Withdraw failed');
        return;
      }
      setMessage(`ส่งคำขอเรียบร้อย: ${data.txHash}`);
    } catch (error) {
      setMessage(error.message || 'การโอนล้มเหลว');
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '3rem', fontFamily: 'system-ui, sans-serif', background: '#050a16', color: '#f8fafc' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem' }}>Web3 Flash Loan Arbitrage Bot</h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.75rem', color: '#cbd5e1' }}>
          ระบบนี้ใช้ bot wallet ในการรับกำไรจาก flash loan / DEX arbitrage และสามารถเชื่อมต่อ wallet ภายนอกเพื่อนำกำไรออกไปโดยอัตโนมัติ.
        </p>

        <section style={{ background: '#0f172a', borderRadius: 24, padding: '1.75rem', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.4)' }}>
          <h2 style={{ marginBottom: '1rem', color: '#7dd3fc' }}>Bot Wallet Status</h2>
          {botStatus ? (
            <div style={{ color: '#e2e8f0', lineHeight: 1.8 }}>
              <p>Bot wallet: <strong>{botStatus.address}</strong></p>
              <p>ETH balance: <strong>{botStatus.ethBalance}</strong></p>
              {botStatus.tokenAddress && (
                <p>Token balance: <strong>{botStatus.tokenBalance}</strong> at {botStatus.tokenAddress}</p>
              )}
            </div>
          ) : (
            <p style={{ color: '#fca5a5' }}>ไม่สามารถอ่านสถานะ bot wallet ได้ กรุณาตั้งค่า environment ให้ถูกต้อง</p>
          )}
        </section>

        <section style={{ marginTop: '2rem', background: '#0b1220', borderRadius: 24, padding: '1.75rem', color: '#e2e8f0' }}>
          <h2 style={{ marginBottom: '1rem', color: '#7dd3fc' }}>เชื่อมต่อ Wallet</h2>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
            <button onClick={connectInjected} style={{ padding: '1rem', borderRadius: 14, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Connect Injected Wallet (MetaMask / Coinbase / Exodus)</button>
            <button onClick={connectWalletConnect} style={{ padding: '1rem', borderRadius: 14, border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer' }}>Connect WalletConnect (Trust Wallet, Mobile Wallets)</button>
          </div>
          {connectedAddress && (
            <div style={{ marginTop: '1.5rem', color: '#e2e8f0', background: '#091224', padding: '1rem', borderRadius: 16 }}>
              <p>Connected wallet: <strong>{connectedAddress}</strong></p>
              <p>Wallet type: <strong>{walletType}</strong></p>
            </div>
          )}
          <button onClick={withdrawProfit} style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: 14, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' }}>Withdraw profit to connected wallet</button>
          {message && <p style={{ marginTop: '1rem', color: '#f8fafc' }}>{message}</p>}
        </section>

        <section style={{ marginTop: '2rem', background: '#111827', borderRadius: 24, padding: '1.75rem', color: '#d1d5db' }}>
          <h2 style={{ marginBottom: '1rem', color: '#7dd3fc' }}>คำแนะนำ</h2>
          <ul style={{ lineHeight: 1.8 }}>
            <li>Bot wallet จะเก็บกำไรจากการ swap / arbitrage</li>
            <li>เมื่อเชื่อมต่อ external wallet แล้ว ระบบจะส่ง ETH หรือ ERC20 token ให้ address นั้น</li>
            <li>สำหรับ Trust Wallet และ mobile wallet ให้ใช้ WalletConnect</li>
            <li>สำหรับ MetaMask, Coinbase Wallet, Exodus ให้ใช้ปุ่ม injected connection</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
