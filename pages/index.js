import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { XEN_ABI } from "../abi";

const CONTRACT_ADDRESS = "0x9d0bc975e1cb8895249ba11c03c08c79d158b11d";

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [rank, setRank] = useState("0");
  const [term, setTerm] = useState(1);
  const [maturity, setMaturity] = useState(null);
  const [nowTime, setNowTime] = useState(Date.now() / 1000);

  // Live timestamp update for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now() / 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connect Wallet + Load Data
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const acc = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, XEN_ABI, s);

      setProvider(p);
      setSigner(s);
      setContract(c);
      setAccount(acc);

      const bal = await c.balanceOf(acc);
      setBalance(ethers.formatEther(bal));

      const r = await c.globalRank();
      setRank(Number(r));

      const m = await c.userMints(acc);
      if (m.rank > 0) {
        setMaturity(Number(m.maturityTs));
      } else {
        setMaturity(null);
      }

    } catch (err) {
      console.error(err);
      alert("Wallet connection failed.");
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setBalance("0");
    setRank("0");
    setTerm(1);
    setMaturity(null);
  };

  const claimRank = async () => {
    if (!contract) return;
    try {
      const tx = await contract.claimRank(term);
      await tx.wait();
      alert("Rank claimed!");
      connectWallet(); // reload state
    } catch (err) {
      console.error(err);
      alert("Claim failed");
    }
  };

  const claimMint = async () => {
    if (!contract) return;
    try {
      const tx = await contract.claimMintReward();
      await tx.wait();
      alert("Mint reward claimed!");
      connectWallet(); // reload state
    } catch (err) {
      console.error(err);
      alert("Claim failed");
    }
  };

  const timeLeft = maturity ? Math.max(0, maturity - nowTime) : 0;

  return (
    <div className="container">
      <h1>XEN Crypto Dashboard</h1>

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p><strong>Wallet:</strong> {account.slice(0, 6)}...{account.slice(-4)}</p>
          <p><strong>Balance:</strong> {balance} XEN</p>
          <p><strong>Global Rank:</strong> {rank}</p>

          <p><strong>Mint:</strong> {maturity ? (
            timeLeft > 0
              ? `⏳ ${Math.floor(timeLeft)}s remaining`
              : "✅ Ready to claim!"
          ) : "Not minting"}</p>

          <label>
            Mint Term (days):
            <input
              type="number"
              min="1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>

          <div style={{ marginTop: "1rem" }}>
            <button onClick={claimRank}>Claim Rank</button>
            <button onClick={claimMint}>Claim Mint Reward</button>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
}
