import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import abi from '../abi'; // make sure abi.js exports the XENCrypto ABI

const CONTRACT_ADDRESS = '0x9d0bc975e1cb8895249ba11c03c08c79d158b11d';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [globalRank, setGlobalRank] = useState(null);
  const [userMint, setUserMint] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [rewardEstimate, setRewardEstimate] = useState(null);
  const [balance, setBalance] = useState('0');

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    const signer = web3Provider.getSigner();
    const address = await signer.getAddress();

    // Chain check (BSC = 0x38)
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

    const xen = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    setProvider(web3Provider);
    setSigner(signer);
    setWalletAddress(address);
    setContract(xen);

    fetchContractData(xen, address);
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setGlobalRank(null);
    setUserMint(null);
    setCountdown('');
    setBalance('0');
  };

  const fetchContractData = async (xen, address) => {
    const rank = await xen.globalRank();
    const mint = await xen.userMints(address);
    const bal = await xen.balanceOf(address);
    setGlobalRank(rank.toString());
    setUserMint(mint);
    setBalance(ethers.utils.formatEther(bal));

    // If user is minting, update reward estimate
    if (mint.rank > 0) {
      const est = (rank.sub(mint.rank)).toString();
      setRewardEstimate(est);
    }
  };

  const claimRank = async () => {
    if (userMint.rank > 0) {
      alert("You already have a mint in progress.");
      return;
    }
    try {
      const tx = await contract.claimRank(1);
      await tx.wait();
      alert("Rank claimed!");
      fetchContractData(contract, walletAddress);
    } catch (err) {
      console.error(err);
      alert("Error claiming rank.");
    }
  };

  const claimReward = async () => {
    if (userMint.rank === 0) return alert("No mint exists");
    const now = Math.floor(Date.now() / 1000);
    if (now < userMint.maturityTs) return alert("Not matured yet");

    try {
      const tx = await contract.claimMintReward();
      await tx.wait();
      alert("Reward claimed!");
      fetchContractData(contract, walletAddress);
    } catch (err) {
      console.error(err);
      alert("Error claiming reward.");
    }
  };

  useEffect(() => {
    let timer;
    if (userMint?.maturityTs > 0) {
      timer = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const diff = userMint.maturityTs - now;
        if (diff > 0) {
          const hrs = Math.floor(diff / 3600);
          const mins = Math.floor((diff % 3600) / 60);
          const secs = diff % 60;
          setCountdown(`${hrs.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        } else {
          setCountdown("Matured");
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [userMint]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>XEN Crypto Clone Dashboard</h1>

      {!walletAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}{' '}
            <button onClick={disconnectWallet}>Disconnect</button>
          </p>

          <p>Global Rank: {globalRank}</p>
          <p>Your Balance: {balance} XEN</p>

          {userMint.rank > 0 ? (
            <>
              <h3>Your Mint:</h3>
              <p>Term: {userMint.term} days</p>
              <p>Rank: {userMint.rank.toString()}</p>
              <p>
                Matures: {new Date(userMint.maturityTs * 1000).toLocaleString()}
              </p>
              <p>Matures in: {countdown}</p>
              <p>
                Estimated Reward: {rewardEstimate} XEN
              </p>
              <button onClick={claimReward}>Claim Mint Reward</button>
            </>
          ) : (
            <button onClick={claimRank}>Claim Rank</button>
          )}
        </>
      )}
    </div>
  );
}
