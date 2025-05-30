import { useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import styles from '../style/global.module.css';
import abi from '../abi';

const CONTRACT_ADDRESS = "0x9d0bc975e1cb8895249ba11c03c08c79d158b11d"; // your deployed XEN contract

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [wallet, setWallet] = useState('');
  const [contract, setContract] = useState(null);
  const [globalRank, setGlobalRank] = useState(0);
  const [userMint, setUserMint] = useState(null);
  const [nowTs, setNowTs] = useState(Math.floor(Date.now() / 1000));
  const [xenBalance, setXenBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

    const browserProvider = new BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();

    setProvider(browserProvider);
    setSigner(signer);
    setWallet(address);
    const xen = new Contract(CONTRACT_ADDRESS, abi, signer);
    setContract(xen);
  };

  const disconnectWallet = () => {
    setWallet('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setUserMint(null);
    setXenBalance(0);
  };

  const fetchData = async () => {
    if (!contract || !wallet) return;
    const [rank, mint, balance] = await Promise.all([
      contract.globalRank(),
      contract.userMints(wallet),
      contract.balanceOf(wallet),
    ]);

    setGlobalRank(rank.toString());
    setUserMint(mint.rank.toString() !== '0' ? mint : null);
    setXenBalance(Number(balance) / 1e18);
  };

  const claimRank = async () => {
    setLoading(true);
    try {
      const tx = await contract.claimRank(1); // 1 day term
      await tx.wait();
      await fetchData();
    } catch (e) {
      console.error("Claim rank error", e);
    }
    setLoading(false);
  };

  const claimReward = async () => {
    setLoading(true);
    try {
      const tx = await contract.claimMintReward();
      await tx.wait();
      await fetchData();
    } catch (e) {
      console.error("Claim reward error", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (wallet && contract) fetchData();
  }, [wallet, contract]);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = userMint ? userMint.maturityTs - nowTs : 0;
  const isMature = countdown <= 0;
  const rewardPreview = userMint ? (globalRank - userMint.rank) : 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>XEN Crypto Clone Dashboard</h1>

      {!wallet ? (
        <button className={styles.connectButton} onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <div className={styles.wallet}>
            Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            <button className={styles.disconnectButton} onClick={disconnectWallet}>Disconnect</button>
          </div>

          <div className={styles.infoBox}>
            <p><strong>Global Rank:</strong> {globalRank}</p>
            <p><strong>Balance:</strong> {xenBalance} XEN</p>
          </div>

          {!userMint && (
            <div className={styles.card}>
              <h3>Claim Minting Rank</h3>
              <p>Term: 1 days</p>
              <button className={styles.button} onClick={claimRank} disabled={loading}>
                {loading ? 'Claiming...' : 'Claim Rank'}
              </button>
            </div>
          )}

          {userMint && (
            <div className={styles.card}>
              <h3>Your Mint:</h3>
              <p>Term: {userMint.term.toString()} days</p>
              <p>Rank: {userMint.rank.toString()}</p>
              <p>Matures: {new Date(userMint.maturityTs * 1000).toLocaleString()}</p>
              <p>Matures in: {isMature ? 'Ready!' : `${Math.floor(countdown / 60)}m ${countdown % 60}s`}</p>
              <p>Estimated Reward: {rewardPreview} XEN</p>
              <button
                className={styles.button}
                onClick={claimReward}
                disabled={!isMature || loading}
              >
                {loading ? 'Claiming...' : isMature ? 'Claim Reward' : 'Not Matured Yet'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
