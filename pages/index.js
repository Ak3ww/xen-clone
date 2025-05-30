import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import abi from '../abi';

const CONTRACT_ADDRESS = '0x9d0bc975e1cb8895249ba11c03c08c79d158b11d';
const SECONDS_IN_DAY = 60;

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [globalRank, setGlobalRank] = useState('');
  const [userMint, setUserMint] = useState(null);
  const [balance, setBalance] = useState('0');
  const [rewardEstimate, setRewardEstimate] = useState('');
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return;
    }

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    const signer = web3Provider.getSigner();
    const address = await signer.getAddress();
    const xen = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    const chainId = await web3Provider.send("eth_chainId", []);
    if (chainId !== '0x38') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }]
        });
      } catch {
        alert("Please switch to BNB Chain");
      }
    }

    setProvider(web3Provider);
    setSigner(signer);
    setWalletAddress(address);
    setContract(xen);
    fetchData(xen, address);
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setUserMint(null);
    setGlobalRank('');
    setRewardEstimate('');
    setBalance('0');
  };

  const fetchData = async (xen, address) => {
    const rank = await xen.globalRank();
    setGlobalRank(rank.toString());

    const bal = await xen.balanceOf(address);
    setBalance(ethers.utils.formatEther(bal));

    const mint = await xen.userMints(address);
    if (mint.rank > 0) {
      const maturityTs = mint.maturityTs.toNumber();
      const rankDiff = rank.sub(mint.rank).toString();
      setRewardEstimate(rankDiff);
      setUserMint({
        term: mint.term.toString(),
        maturityTs,
        rank: mint.rank.toString()
      });
    } else {
      setUserMint(null);
    }
  };

  const claimRank = async () => {
    if (userMint) return alert("You already have a mint in progress");
    try {
      setLoading(true);
      const tx = await contract.claimRank(1);
      await tx.wait();
      alert("✅ Rank Claimed");
      fetchData(contract, walletAddress);
    } catch (e) {
      alert("❌ Failed to claim");
    }
    setLoading(false);
  };

  const claimReward = async () => {
    const now = Math.floor(Date.now() / 1000);
    if (!userMint || now < userMint.maturityTs) {
      alert("⏳ Not matured yet");
      return;
    }
    try {
      setLoading(true);
      const tx = await contract.claimMintReward();
      await tx.wait();
      alert("✅ Reward Claimed");
      fetchData(contract, walletAddress);
    } catch (e) {
      alert("❌ Claim failed");
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
        setCountdown("✅ Ready");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userMint]);

  return (
    <div className="container">
      <header>
        <div className="left">XEN Crypto Clone</div>
        <div className="right">
          {walletAddress ? (
            <>
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <button onClick={disconnectWallet}>Disconnect</button>
            </>
          ) : (
            <button onClick={connectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>

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
              <button disabled={countdown !== '✅ Ready' || loading} onClick={claimReward}>
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
    </div>
  );
}
