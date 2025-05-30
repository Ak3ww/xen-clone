// pages/index.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../abi";

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [term, setTerm] = useState(1);
  const [globalRank, setGlobalRank] = useState(0);
  const [userMint, setUserMint] = useState(null);
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    const _provider = new ethers.providers.Web3Provider(window.ethereum);
    await _provider.send("eth_requestAccounts", []);
    const _signer = _provider.getSigner();
    const address = await _signer.getAddress();
    const _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);

    setProvider(_provider);
    setSigner(_signer);
    setWallet(address);
    setContract(_contract);
  };

  const disconnectWallet = () => {
    setWallet("");
    setSigner(null);
    setContract(null);
    setUserMint(null);
  };

  const fetchData = async () => {
    if (!contract || !wallet) return;
    const rank = await contract.globalRank();
    setGlobalRank(rank.toString());

    try {
      const mint = await contract.userMints(wallet);
      if (mint.rank > 0) setUserMint(mint);
      else setUserMint(null);
    } catch {
      setUserMint(null);
    }
  };

  const claimRank = async () => {
    try {
      setStatus("Submitting rank...");
      const tx = await contract.claimRank(term);
      await tx.wait();
      setStatus("Rank claimed!");
      fetchData();
    } catch (err) {
      setStatus("Error claiming rank");
    }
  };

  const claimReward = async () => {
    try {
      setStatus("Claiming reward...");
      const tx = await contract.claimMintReward();
      await tx.wait();
      setStatus("Reward claimed!");
      fetchData();
    } catch (err) {
      setStatus("Error claiming reward");
    }
  };

  useEffect(() => {
    if (wallet) fetchData();
  }, [wallet]);

  return (
    <div style={{ fontFamily: "Arial", padding: "2rem", maxWidth: "500px", margin: "auto" }}>
      <h2>XEN Crypto Clone Dashboard</h2>

      {!wallet ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}</p>
          <button onClick={disconnectWallet}>Disconnect</button>

          <hr />
          <p><strong>Global Rank:</strong> {globalRank}</p>

          <h4>Claim Minting Rank</h4>
          <input
            type="number"
            min="1"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={{ marginRight: "1rem", width: "100px" }}
          />
          <button onClick={claimRank}>Claim Rank</button>

          {userMint && (
            <div style={{ marginTop: "1rem" }}>
              <p><strong>Your Mint:</strong></p>
              <p>Term: {userMint.term.toString()} days</p>
              <p>Rank: {userMint.rank.toString()}</p>
              <p>Matures: {new Date(userMint.maturityTs.toNumber() * 1000).toLocaleString()}</p>
              <button onClick={claimReward}>Claim Mint Reward</button>
            </div>
          )}

          {status && (
            <p style={{ marginTop: "1rem", color: "green" }}>{status}</p>
          )}
        </>
      )}
    </div>
  );
}
