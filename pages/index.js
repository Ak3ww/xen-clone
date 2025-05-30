import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';

const CONTRACT_ADDRESS = '0x9d0bc975e1cb8895249ba11c03c08c79d158b11d';
const ABI = [
  'function globalRank() view returns (uint256)',
  'function claimRank(uint256 term) external',
  'function claimMintReward() external',
  'function userMints(address) view returns (uint256 term, uint256 maturityTs, uint256 rank)',
  'function balanceOf(address) view returns (uint256)',
];

const SECONDS_IN_DAY = 60;

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [globalRank, setGlobalRank] = useState(0);
  const [mintInfo, setMintInfo] = useState(null);
  const [balance, setBalance] = useState('0');
  const [termInput, setTermInput] = useState('1');
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(Date.now());

  // 🟡 Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask not installed!');
        return;
      }
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
      setProvider(browserProvider);
      setSigner(signer);
      setContract(new Contract(CONTRACT_ADDRESS, ABI, signer));
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setMintInfo(null);
    setBalance('0');
    setGlobalRank(0);
  };

  // 🕒 Clock updater
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔁 Refresh on connection
  useEffect(() => {
    if (!contract || !walletAddress) return;
    fetchGlobalRank();
    fetchUserMint();
    fetchBalance();
  }, [contract, walletAddress]);

  const fetchGlobalRank = async () => {
    const rank = await contract.globalRank();
    setGlobalRank(Number(rank));
  };

  const fetchUserMint = async () => {
    const mint = await contract.userMints(walletAddress);
    if (mint.rank > 0) {
      setMintInfo({
        term: Number(mint.term),
        maturityTs: Number(mint.maturityTs),
        rank: Number(mint.rank),
      });
    } else {
      setMintInfo(null);
    }
  };

  const fetchBalance = async () => {
    const bal = await contract.balanceOf(walletAddress);
    setBalance(formatEther(bal));
  };

  const handleClaimRank = async () => {
    try {
      const tx = await contract.claimRank(Number(termInput));
      await tx.wait();
      setStatus('✅ Rank claimed');
      fetchGlobalRank();
      fetchUserMint();
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to claim rank');
    }
  };

  const handleClaimReward = async () => {
    try {
      const tx = await contract.claimMintReward();
      await tx.wait();
      setStatus('✅ Reward claimed');
      fetchUserMint();
      fetchBalance();
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to claim reward');
    }
  };

  const timeLeft = () => {
    if (!mintInfo) return '';
    const secondsLeft = mintInfo.maturityTs - Math.floor(now / 1000);
    if (secondsLeft <= 0) return 'Ready to claim!';
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `Matures in: ${mins}m ${secs}s`;
  };

  const estimatedReward = () => {
    if (!mintInfo) return '';
    const diff = globalRank - mintInfo.rank;
    return `Estimated Reward: ${diff} XEN`;
  };

  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>XEN Crypto Clone Dashboard</h1>

      <div style={{ marginBottom: '1rem' }}>
        {!walletAddress ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div>
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}{' '}
            <button onClick={disconnectWallet} style={{ marginLeft: 10 }}>Disconnect</button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Global Rank:</strong> {globalRank}
        <br />
        <strong>Balance:</strong> {balance} XEN
      </div>

      {walletAddress && (
        <div style={{ border: '1px solid #ccc', padding: 16 }}>
          {mintInfo ? (
            <>
              <h3>Your Active Mint</h3>
              <p>Rank: {mintInfo.rank}</p>
              <p>Term: {mintInfo.term} days</p>
              <p>Matures: {new Date(mintInfo.maturityTs * 1000).toLocaleString()}</p>
              <p>{timeLeft()}</p>
              <p>{estimatedReward()}</p>
              <button
                onClick={handleClaimReward}
                disabled={now / 1000 < mintInfo.maturityTs}
              >
                Claim Mint Reward
              </button>
            </>
          ) : (
            <>
              <h3>Claim New Mint</h3>
              <input
                type="number"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                style={{ padding: '0.5rem', marginRight: '1rem' }}
              />
              <button onClick={handleClaimRank}>Claim Rank</button>
            </>
          )}
        </div>
      )}

      {status && (
        <p style={{ color: status.startsWith('✅') ? 'green' : 'red', marginTop: '1rem' }}>
          {status}
        </p>
      )}
    </main>
  );
}
