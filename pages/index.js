import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther, parseUnits } from 'ethers';
import abi from '../abi';

const CONTRACT_ADDRESS = '0x9d0bc975e1cb8895249ba11c03c08c79d158b11d';
const SECONDS_IN_DAY = 60;

export default function XENDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [globalRank, setGlobalRank] = useState('');
  const [balance, setBalance] = useState('0');
  const [userMint, setUserMint] = useState(null);
  const [rewardEstimate, setRewardEstimate] = useState('');
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      const xen = new Contract(CONTRACT_ADDRESS, abi, signer);

      setWalletAddress(address);
      setProvider(browserProvider);
      setSigner(signer);
      setContract(xen);
      fetchData(xen, address);
    } catch (err) {
      console.error('Connection failed:', err);
      alert('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setSigner(null);
    setProvider(null);
    setContract(null);
    setUserMint(null);
    setCountdown('');
    setGlobalRank('');
    setBalance('0');
    setRewardEstimate('');
  };

  const fetchData = async (xen, address) => {
    const rank = await xen.globalRank();
    setGlobalRank(rank.toString());

    const bal = await xen.balanceOf(address);
    setBalance(formatEther(bal));

    const mint = await xen.userMints(address);
    if (mint.rank > 0) {
      const maturityTs = mint.maturityTs.toNumber();
      const rankDiff = rank - mint.rank;
      setUserMint({
        term: mint.term.toString(),
        maturityTs,
        rank: mint.rank.toString()
      });
      setRewardEstimate(rankDiff.toString());
    } else {
      setUserMint(null);
      setRewardEstimate('');
    }
  };

  const claimRank = async () => {
    if (userMint) return alert('You already have a mint in progress');
    try {
      setLoading(true);
      const tx = await contract.claimRank(1);
      await tx.wait();
      alert('✅ Rank Claimed');
      fetchData(contract, walletAddress);
    } catch (e) {
      alert('❌ Claim failed');
    }
    setLoading(false);
  };

  const claimReward = async () => {
    if (!userMint) return;
    const now = Math.floor(Date.now() / 1000);
    if (now < userMint.maturityTs) {
      alert('⏳ Not matured yet');
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.claimMintReward();
      await tx.wait();
      alert('✅ Reward Claimed');
      fetchData(contract, walletAddress);
    } catch (e) {
      alert('❌ Reward claim failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userMint) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = userMint.maturityTs - now;
      if (diff > 0) {
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setCountdown(`${mins}:${secs}`);
      } else {
        setCountdown('✅ Ready');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userMint]);

  return (
    <div className="container">
      <header>
        <div className="left">XEN Clone</div>
        <div className="right">
          {!walletAddress ? (
            <button onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <>
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <button onClick={disconnectWallet}>Disconnect</button>
            </>
          )}
        </div>
      </header>

      {walletAddress && (
        <main>
          <div className="mint-card">
            <h2>Mint Free XEN</h2>
            <p><strong>Global Rank:</strong> {globalRank}</p>
            <p><strong>Balance:</strong> {balance} XEN</p>

            {userMint ? (
              <>
                <p><strong>Term:</strong> {userMint.term} days</p>
                <p><strong>Your Rank:</strong> {userMint.rank}</p>
                <p><strong>Reward:</strong> {rewardEstimate} XEN</p>
                <p><strong>Countdown:</strong> {countdown}</p>
                <button onClick={claimReward} disabled={countdown !== '✅ Ready' || loading}>
                  {loading ? 'Processing...' : 'Claim Reward'}
                </button>
              </>
            ) : (
              <button onClick={claimRank} disabled={loading}>
                {loading ? 'Processing...' : 'Claim Rank'}
              </button>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
