const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("VolReg NFT tests", function () {
  let nft;
  let market;
  let owner;
  let bob;
  let jane;
  let marketAddress;
  let nftContractAddress;
  let listingPrice;

  const setPublicPrice = ethers.utils.parseUnits('1.0', 'ether');

  beforeEach(async () => {
    const Market = await ethers.getContractFactory("VolRegNFTMarket");
    market = await Market.deploy();
    await market.deployed();
    marketAddress = market.address;

    const NFT = await ethers.getContractFactory("VolRegNFT");
    nft = await NFT.deploy('VoluntaryRegister', 'VOLREG', 'https://ipfs.io/ipfs/',
      'https://volreg.com/api/contractmetadata', marketAddress);
    await nft.deployed();
    nftContractAddress = nft.address;

    [owner, bob, jane] = await ethers.getSigners();

  });

  describe("NFT token tests", () => {
    it('correctly checks all the supported interfaces', async function () {
      expect(await nft.supportsInterface('0x80ac58cd')).to.equal(true);
      expect(await nft.supportsInterface('0x5b5e139f')).to.equal(true);
    });

    it("retrive basic NFT data", async () => {
      expect(await nft.name()).to.equal('VoluntaryRegister');
      expect(await nft.symbol()).to.equal('VOLREG');
      expect(await nft.balanceOf(bob.address)).to.equal(0);
    });

    it("should get NFT mint price", async () => {
      expect(await nft.getPrice()).to.equal(ethers.utils.parseUnits('1.0', 'ether'));
    });

    it("should change NFT mint price", async () => {
      await nft.setPrice(ethers.utils.parseUnits('1.5', 'ether'));
      expect(await nft.getPrice()).to.equal(ethers.utils.parseUnits('1.5', 'ether'));
    });

    it("only change NFT mint price by admin", async () => {
      await expect(nft.connect(bob).setPrice(ethers.utils.parseUnits('1.5', 'ether')))
        .to.be.revertedWith('ERC721: must have admin role to change nft price.');
    });

    it("only change NFT base URI by admin", async () => {
      await expect(nft.connect(bob).setBaseURI("https://ipfs.io/ipfs/"))
        .to.be.revertedWith('ERC721: must have admin role to change baseUri');
      await expect(nft.connect(bob).setContractBaseURI("https://ipfs.io/ipfs/"))
        .to.be.revertedWith('ERC721: must have admin role to change baseUri');
      await nft.setContractBaseURI("https://volreg.com/api/contractmetadata");
      const uri = await nft.contractURI();
      await expect(uri).to.equal("https://volreg.com/api/contractmetadata");

    });

    it('create new nft', async () => {
      provider = ethers.provider;
      let balance1Owner = await provider.getBalance(owner.address);
      // let balance1Bob = await provider.getBalance(bob.address);
      // console.log(ethers.utils.formatEther(balance1Bob));
      await nft.connect(bob).createToken("eineaz7jikah4tieyaiH", true, { value: setPublicPrice });
      const tokenURI1 = await nft.tokenURI(1);
      expect(tokenURI1).to.equal("https://ipfs.io/ipfs/eineaz7jikah4tieyaiH");
      const nftBalance1 = await nft.balanceOf(bob.address);
      expect(nftBalance1).to.equal(1);
      const totalToken = await nft.totalSupply();
      expect(totalToken).to.equal(1);
      const isPublic = await nft.isPublic(1);
      expect(isPublic).to.equal(true);
      const balance2Owner = await provider.getBalance(owner.address);
      // let balance2Bob = await provider.getBalance(bob.address);
      // console.log(ethers.utils.formatEther(balance2Bob));
      const finalBalance = balance1Owner.add(ethers.utils.parseUnits('1', 18));
      expect(balance2Owner).to.equal(finalBalance);
    });

    it('should change nft publicity by owner', async () => {
      await nft.connect(bob).createToken("nae4yi0eeCh1suaGh9io", true, { value: setPublicPrice });
      let isPublic = await nft.isPublic(1);
      expect(isPublic).to.equal(true);
      await nft.connect(bob).setPublic(1, false, { value: setPublicPrice });
      isPublic = await nft.isPublic(1);
      expect(isPublic).to.equal(false);
    });

    it('should change nft publicity by other user', async () => {
      await nft.connect(bob).createToken("nae4yi0eeCh1suaGh9io", true, { value: setPublicPrice });
      let isPublic = await nft.isPublic(1);
      expect(isPublic).to.equal(true);
      await expect(nft.connect(jane).setPublic(1, false, { value: setPublicPrice }))
        .to.be.revertedWith('Ownable: caller is not the NFT owner');
    });

  });

  describe('Market contract tests', () => {

    it('total supply nft', async () => {
      const totalToken = await nft.totalSupply();
      expect(totalToken).to.equal(0);
    });

    it("check market listing price", async function () {
      listingPrice = await market.getListingPrice();
      expect(listingPrice).to.equal(ethers.utils.parseUnits("2.0", 'ether'));
      listingPrice = listingPrice.toString();
      expect(listingPrice).to.equal('2000000000000000000');
    });

    it('shouldnt mint nft to the market with other owner', async () => {
      const auctionPrice = ethers.utils.parseUnits('1', 'ether');
      await nft.connect(bob).createToken("eineaz7jikah4tieyaiH", true, { value: setPublicPrice });
      // await nft.createToken("eineaz7jikah4tieyaiH");
      await expect(market.createMarketItem(
        nftContractAddress, 1, auctionPrice, { value: listingPrice }))
        .to.be.revertedWith('ERC721: transfer of token that is not own');
    });

    it('should mint nft to the market with specific owner', async () => {
      const auctionPrice = ethers.utils.parseUnits('1', 'ether');
      await nft.connect(bob).createToken("eineaz7jikah4tieyaiH", true, { value: setPublicPrice });
      await market.connect(bob).createMarketItem(
        nftContractAddress, 1, auctionPrice, { value: listingPrice });
      const items = await market.fetchMarketItems();
      expect(items.length).to.equal(1);
    });

    it('should change listing price other than owner', async () => {
      const newListingPrice = ethers.utils.parseUnits('33.33', 'ether');
      const defaultListingPrice = await market.getListingPrice();
      await market.setListingPrice(newListingPrice);
      const actualListingPrice = await market.getListingPrice();
      await expect(actualListingPrice).to.equal(newListingPrice);
      await expect(market.connect(bob).setListingPrice(newListingPrice))
        .to.be.revertedWith('ERC721: must have admin role to change listing price.');
    });

    it("should create and execute market sales", async () => {
      const auctionPrice = ethers.utils.parseUnits('10.123456', 'ether');
      await nft.connect(bob).createToken("Fe5shoo6jah5booquaip", true, { value: setPublicPrice });
      await market.connect(bob).createMarketItem(nftContractAddress, 1, auctionPrice, { value: listingPrice });
      await market.connect(jane).createMarketSale(nftContractAddress, 1, { value: auctionPrice });

      let resultPrice;
      let items = await market.connect(jane).fetchMyNFTs();
      // console.log(items.length);
      // items = await Promise.all(items.map(async i => {
      //   const tokenUri = await nft.connect(jane).tokenURI(i.tokenId)
      //   let item = {
      //     priceRaw: i.price.toString(),
      //     priceETH: ethers.utils.formatEther(i.price),
      //     tokenId: i.tokenId.toString(),
      //     seller: i.seller,
      //     owner: i.owner,
      //     tokenUri
      //   }
      //   return item
      // }));
      // console.log('items: ', items)
      expect(ethers.utils.formatEther(items[0].price)).to.equal('10.123456');

    })

    it("should create and execute market sales", async () => {
      const auctionPrice = ethers.utils.parseUnits('10.123456', 'ether');
      await nft.connect(bob).createToken("Fe5shoo6jah5booquaip", true, { value: setPublicPrice });
      let owner = await nft.connect(bob).ownerOf(1);
      await market.connect(bob).createMarketItem(nftContractAddress, 1, auctionPrice, { value: listingPrice });
      await market.connect(jane).createMarketSale(nftContractAddress, 1, { value: auctionPrice });
      owner = await nft.connect(jane).ownerOf(1);
      // await nft.connect(jane).setApprovalForAll(marketAddress, true); -> override isApprovalForAll methode
      await market.connect(jane).createMarketItem(nftContractAddress, 1, auctionPrice, { value: listingPrice });
      // await nft.connect(jane).transferFrom(jane.address, bob.address, 1);

      let resultPrice;
      let items = await market.connect(jane).fetchMyNFTs();
      // console.log(items.length);
      // items = await Promise.all(items.map(async i => {
      //   const tokenUri = await nft.connect(jane).tokenURI(i.tokenId)
      //   let item = {
      //     priceRaw: i.price.toString(),
      //     priceETH: ethers.utils.formatEther(i.price),
      //     tokenId: i.tokenId.toString(),
      //     seller: i.seller,
      //     owner: i.owner,
      //     tokenUri
      //   }
      //   return item
      // }));
      // console.log('items: ', items)
      // expect(ethers.utils.formatEther(items[0].price)).to.equal('10.123456');

    })

  });

})
