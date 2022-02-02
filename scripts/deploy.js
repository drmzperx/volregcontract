const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const VolRegNFTMarket = await hre.ethers.getContractFactory("VolRegNFTMarket");
  const volRegNFTMarket = await VolRegNFTMarket.deploy();
  await volRegNFTMarket.deployed();
  console.log("VolReg NFT Market deployed to:", volRegNFTMarket.address);

  const NFT = await hre.ethers.getContractFactory("VolRegNFT");
  const nft = await NFT.deploy('VoluntaryRegister', 'VOLREG', 'https://ipfs.io/ipfs/',
    'https://volreg.vercel.com/api/contractmetadata', volRegNFTMarket.address);
  await nft.deployed();
  console.log("VolReg NFT token deployed to:", nft.address);

  let config = `
  export const nftmarketaddress = "${volRegNFTMarket.address}"
  export const nftaddress = "${nft.address}"
  `
  let data = JSON.stringify(config)
  fs.writeFileSync('config.js', JSON.parse(data))
}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

runMain();

