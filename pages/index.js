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

  useEffect(() => {
    const interval = setInterval(() => setNowTime(Date.now() / 1000), 1000);
    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    const p = new ethers.BrowserProvider(window.ethereum);
    const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
    const s = await p.getSigner();
    const c = new ethers.Contract(CONTRACT_ADDRESS, XEN_ABI, s);

    setProvider(p);
    setSigner(s);
    setContract(c);
    setAccount(accs[0]);

    const bal = await c.balanceOf(accs[0]);
    setBalance(ethers.formatEther(bal));

    const r = await c.globalRank();
    setRank(Number(r));

    const m = await c.userMints(accs[0]);
    if (m.rank > 0) setMaturity(Number(m.maturityTs));
  };

  const disconnect = () => {
    setAccount(null);
    setContract(null);
    setSigner(null);
    setProvider(null);
  };

  const handleClaimRank = async () => {
    if (!contract) return;
    const tx = await contract.claimRank(term);
    await tx.wait();
    alert("Rank claimed");
  };

  const handleClaimMintReward = async () => {
    if (!contract) return;
    const tx = await contract.claimMintReward();
    await tx.wait();
    alert("Mint reward claimed");
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
          <p><strong>Mint Status:</strong> {maturity ? (
            timeLeft > 0 ? `${Math.floor(timeLeft)}s remaining` : "Ready to claim!"
          ) : "Not minting"}</p>

          <label>
            Mint Term (days): <input
              type="number"
              min="1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>

          <button onClick={handleClaimRank}>Claim Rank</button>
          <button onClick={handleClaimMintReward}>Claim Mint Reward</button>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}
    </div>
  );
}

