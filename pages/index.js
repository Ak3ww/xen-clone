import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseUnits } from 'ethers';

const CONTRACT_ADDRESS = '0x9d0bc975e1cb8895249ba11c03c08c79d158b11d';
const ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function globalRank() view returns (uint256)',
  'function claimRank(uint256 term) external',
  'function claimMintReward() external',
  'function balanceOf(address) view returns (uint256)',
  'function userMints(address) view returns (uint256 term, uint256 maturityTs, uint256 rank)',
  'event RankClaimed(address indexed user, uint256 term, uint256 rank)',
  'event MintClaimed(address indexed user, uint256 reward)',
];

const SECONDS_IN_DAY = 60;

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [globalRank, setGlobalRank] = useState(0);
  const [mintInfo, setMintInfo] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [balance, setBalance] = useState('0');
  const [termInput, setTermInput] = useState('1');
  const [status, setStatus] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) return alert('MetaMask required');
    const browserProvider = new BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    setWalletAddress(address);
    setProvider(browserProvider);
    setSigner(signer);
    const instance = new Contract(CONTRACT_ADDRESS, ABI, signer);
    setContract(instance);
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setMintInfo(null);
    setBalance('0');
  };

  // Fetch on load and on interval
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!contract || !walletAddress) return;
    fetchGlobal();
    fetchUserMint();
    fetchBalance();
  }, [contract, walletAddress]);

  const fetchGlobal = async () => {
    const rank = await contract.globalRank();
    setGlobalRank(rank.toString());
  };

  const fetchUserMint = async () => {
    const mint = await contract.userMints(walletAddress);
    if (mint.term > 0) {
      setMintInfo({
        term: mint.term.toString(),
        maturityTs: Number(mint.maturityTs),
        rank: mint.rank.toString(),
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
    if (!termInput || isNaN(termInput)) return;
    try {
      const tx = await contract.claimRank(Number(termInput));
      await tx.wait();
      setStatus('✅ Rank claimed');
      fetchGlobal();
      fetchUserMint();
    } catch (err) {
      console.error(err);
      setStatus('❌ Error claiming rank');
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
      setStatus('❌ Error claiming reward');
    }
  };

  const timeLeft = () => {
    if (!mintInfo) return '';
    const seconds = Math.floor(mintInfo.maturityTs - now / 1000);
    if (seconds <= 0) return 'Ready!';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `Matures in: ${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const rewardPreview = () => {
    if (!mintInfo) return '';
    const diff = parseInt(globalRank) - parseInt(mintInfo.rank);
    return `Estimated Reward: ${diff} XEN`;
  };

  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center', fontSize: '1.8rem' }}>Mint Free XEN</h1>

      <div style={{ margin: '1rem 0' }}>
        {!walletAddress ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div>
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}{' '}
            <button onClick={disconnectWallet} style={{ marginLeft: '1rem' }}>Disconnect</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <p><strong>Global Rank:</strong> {globalRank}</p>
        <p><strong>Balance:</strong> {balance} XEN</p>
      </div>

      {walletAddress && (
        <div className="mint-card" style={{ marginTop: '2rem' }}>
          {mintInfo ? (
            <>
              <h2>Your Mint</h2>
              <p>Term: {mintInfo.term} days</p>
              <p>Rank: {mintInfo.rank}</p>
              <p>Matures: {new Date(mintInfo.maturityTs * 1000).toLocaleString()}</p>
              <p>{timeLeft()}</p>
              <p>{rewardPreview()}</p>
              <button
                disabled={now / 1000 < mintInfo.maturityTs}
                onClick={handleClaimReward}
              >
                Claim Mint Reward
              </button>
            </>
          ) : (
            <>
              <h2>Claim Minting Rank</h2>
              <input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                type="number"
                min="1"
                style={{ padding: '0.4rem', width: '80%', marginBottom: '1rem' }}
              />
              <button onClick={handleClaimRank}>Claim Rank</button>
            </>
          )}
        </div>
      )}

      {status && <p style={{ marginTop: '1rem', color: 'green' }}>{status}</p>}
    </main>
  );
}
