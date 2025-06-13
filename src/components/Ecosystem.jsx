// components/Ecosystem.jsx
import React, { useState } from "react";
import "./Ecosystem.css";

const projects = {
  Trading: [
    {
      name: "Monorail",
      desc: "Trade anything across Monad. Monorail is the first aggregator to combine onchain orderbooks and AMMs to give you the best trade possible.",
      url: "https://monorail.xyz/",
      logo: "/trading/monorail-logo.png",
    },
    {
      name: "Crystal Exchange",
      desc: "Crystal is a fully on-chain CLOB exchange that brings CEX-grade performance to the EVM without compromising on security or composability.",
      url: "https://crystal.exchange",
      logo: "/trading/crystal-logo.png",
    },
    {
      name: "Ambient Finance",
      desc: "Ambient (formerly CrocSwap) is a decentralized exchange (DEX) protocol that allows for two-sided AMMs combining concentrated and ambient constant-product liquidity on any arbitrary pair of blockchain assets.",
      url: "https://monad.ambient.finance/",
      logo: "/trading/ambient-logo.png",
    }, 
    {
      name: "Bean Exchange",
      desc: "Bean Exchange is a gamified decentralized spot & perpetual exchange natively built on Monad Network.",
      url: "https://bean.exchange/",
      logo: "/trading/bean-logo.png",
    },  
    {
      name: "Madness Finance",
      desc: "The Native DEX on Monad: The Future of Decentralized Trading.",
      url: "https://madness.finance/",
      logo: "/trading/madness-logo.png",
    }, 
    {
      name: "Atlantis",
      desc: "Modular V4 DEX offering cross-chain swaps, DeFAI, a launchpad, farming, staking, fiat on-ramp, & more.",
      url: "https://atlantisdex.xyz/",
      logo: "/trading/atlantis-logo.png",
    },
    {
      name: "iZumi Finance",
      desc: "iZUMi Finance is a multi-chain DeFi protocol providing one-stop DEX-as-a-Service (DaaS) Follow our socials.",
      url: "https://alpha.izumi.finance/trade/swap",
      logo: "/trading/izumi-logo.png",
    },  
    {
      name: "zkSwap",
      desc: "The 1st Swap to Earn AMM DEX & DeFi Hub on ZKsync Era, Monad_xyz, & Sonic.",
      url: "https://www.zkswap.finance/swap",
      logo: "/trading/zkswap-logo.png",
    },
    {
      name: "OctoSwap",
      desc: "OctoSwap offers lightning-fast token swaps and capital-efficient liquidity pools with a user friendly interface.",
      url: "https://octo.exchange/",
      logo: "/trading/octoswap-logo.png",
    },                          
  ],
  Staking: [
    {
      name: "Apriori",
      desc: "aPriori is an MEV infrastructure and liquid staking protocol, designed for the parallel execution era and natively built on Monad.",
      url: "http://testnet-staking.apr.io/",
      logo: "/staking/apriori-logo.png",
    },
    {
      name: "Magma",
      desc: "Magma is a Liquid Staking Protocol building the first Distributed Validator on Monad and developing MEV to reduce latency by up to 4x.",
      url: "https://www.magmastaking.xyz/",
      logo: "/staking/magma-logo.png",
    },
    {
      name: "Kintsu",
      desc: "Creators of sMON - A new paradigm in decentralized Liquid Staking on monad.",
      url: "https://kintsu.xyz/staking",
      logo: "/staking/kintsu-logo.png",
    },  
    {
      name: "Shmonad",
      desc: "shMONAD is an innovative Liquid Staking Token (LST) built on top of MON (Monad)",
      url: "https://shmonad.xyz/",
      logo: "/staking/shmonad-logo.png",
    },      
  ],
  NFT: [
    {
      name: "Magic Eden on Monad",
      desc: "NFT Marketplace.",
      url: "https://magiceden.io/monad-testnet",
      logo: "/nft/me-logo.png",
    },
  ],
  Betting: [
    {
      name: "RareBetSports",
      desc: "RareLink // Daily Fantasy Sports.",
      url: "https://rarelink.rarebetsports.io/",
      logo: "/betting/rarebetsport-logo.png",
    },
    {
      name: "Kizzy",
      desc: "Kizzy is a social media betting app. Bet on how your favorite influencers and celebrities will perform on Twitter and YouTube.",
      url: "https://kizzy.io/",
      logo: "/betting/kizzy-logo.png",
    },
  ],

};

const pianoKeys = [  
  { black: "Trading" },
  { black: null },
  { black: "Staking" },
  { black: null },
  { black: "NFT" },
  { black: null },  
  { black: "Betting" },

];

export default function Ecosystem() {
  const [active, setActive] = useState("Trading");

  return (
    <div className="ecosystem-container">
      <h2 className="eco-title">Ecosystem</h2>
      <div className="eco-main">
        {/* Piano Sidebar */}
        <div className="eco-piano">
          <div className="eco-piano-keys">
            {pianoKeys.map((k, i) => (
              <div className="eco-key-row" key={i}>
                <div className="eco-white-key" />
                {k.black && (
                  <button
                    className={`eco-black-key${active === k.black ? " eco-black-key-active" : ""}`}
                    onClick={() => setActive(k.black)}
                  >
                    {k.black}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Project Cards */}
        <div className="eco-project-list">
          {projects[active] && projects[active].length ? (
            <div className="eco-cards">
              {projects[active].map((proj, i) => (
                <div className="eco-card" key={i}>
                  {proj.logo && (
                    <img
                      src={proj.logo}
                      alt={`${proj.name} logo`}
                      className="eco-card-logo"
                    />
                  )}
                  <div className="eco-card-title">{proj.name}</div>
                  <div className="eco-card-desc">{proj.desc}</div>
                  <div className="eco-card-footer">
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="eco-card-btn"
                    >
                      Visit Here
                    </a>
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="eco-card-icon"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="eco-empty">No projects in this category yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
