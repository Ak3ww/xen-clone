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

  const [globalRank, setGlobalRank] = useState(null);
  const [userMint, setUserMint] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [termInput, setTermInput] = useState(1);
  const [rewardEstimate, setRewardEstimate] = useState('');
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    const signer = web3Provider.getSigner();
    const address = await signer.getAddress();
    const xen = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    setProvider(web3Provider);
    setSigner(signer);
    setWalletAddress(address);
    setContract(xen);

    fetchData(xen, address);
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setSigner(null);
    setProvider(null);
    setContract(null);
    setGlobalRank(null);
    setUserMint(null);
    setCountdown('');
    setRewardEstimate('');
  };

  const fetchData = async (xen, address) => {
    const rank = await xen.globalRank();
    setGlobalRank(rank.toString());

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

  useEffect(() => {
    if (!userMint) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = userMint.maturityTs - now;
      if (diff > 0) {
        const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const secs = Math.floor(diff % 60).toString().padStart(2, '0');
        setCountdown(`${hrs}:${mins}:${secs}`);
      } else {
        setCountdown("✅ Matured");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userMint]);

  const claimRank = async () => {
    if (!contract || !termInput) return;
    setLoading(true);
    try {
      const tx = await contract.claimRank(termInput);
      await tx.wait();
      alert("Rank Claimed!");
      fetchData(contract, walletAddress);
    } catch (e) {
      alert("Claim failed.");
    }
    setLoading(false);
  };

  const claimReward = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.claimMintReward();
      await tx.wait();
      alert("Reward Claimed!");
      fetchData(contract, walletAddress);
    } catch (e) {
      alert("Claim failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>XEN Crypto Clone Dashboard</h1>

      {!walletAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          <button onClick={disconnectWallet}>Disconnect</button>

          <h3>Global Rank: {globalRank ?? 'Loading...'}</h3>

          {userMint ? (
            <div style={{ marginTop: 20, border: '1px solid gray', padding: 10 }}>
              <h4>Active Mint</h4>
              <p>Term: {userMint.term} days</p>
              <p>Your Rank: {userMint.rank}</p>
              <p>Matures: {new Date(userMint.maturityTs * 1000).toLocaleString()}</p>
              <p>Countdown: {countdown}</p>
              <p>Reward Estimate: {rewardEstimate} XEN</p>

              {countdown !== "✅ Matured" ? (
                <button disabled>Not Matured Yet</button>
              ) : (
                <button onClick={claimReward} disabled={loading}>
                  {loading ? 'Claiming...' : 'Claim Mint Reward'}
                </button>
              )}
            </div>
          ) : (
            <>
              <h4>Claim Minting Rank</h4>
              <input
                type="number"
                min="1"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
              />
              <button onClick={claimRank} disabled={loading}>
                {loading ? 'Claiming...' : 'Claim Rank'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
