'use strict'

const ethers = require("ethers");
const fs = require('fs');
const Jimp = require('jimp');

const CONTRACT_ABI = [{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"bidAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"bidder","type":"address"}],"name":"BidProposed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"BidWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"BuyPriceSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"priorityTip","type":"uint256"},{"indexed":false,"internalType":"uint256[]","name":"leverIds","type":"uint256[]"},{"indexed":false,"internalType":"int256[]","name":"previousValues","type":"int256[]"},{"indexed":false,"internalType":"int256[]","name":"updatedValues","type":"int256[]"}],"name":"ControlLeverUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"platformAddress","type":"address"}],"name":"PlatformAddressUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"platformFirstPercentage","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"platformSecondPercentage","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"artistSecondPercentage","type":"uint256"}],"name":"RoyaltyAmountUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"salePrice","type":"uint256"},{"indexed":false,"internalType":"address","name":"buyer","type":"address"}],"name":"TokenSale","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"artistSecondSalePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"buyPrices","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"expectedTokenSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"pendingBids","outputs":[{"internalType":"address payable","name":"bidder","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"permissionedControllers","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"platformAddress","outputs":[{"internalType":"address payable","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"platformFirstSalePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"platformSecondSalePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tokenDidHaveFirstSale","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"uniqueTokenCreators","outputs":[{"internalType":"address payable","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"whitelistedCreators","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"creator","type":"address"},{"internalType":"bool","name":"state","type":"bool"}],"name":"updateWhitelist","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address payable","name":"newPlatformAddress","type":"address"}],"name":"updatePlatformAddress","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"_platformFirstSalePercentage","type":"uint256"},{"internalType":"uint256","name":"_platformSecondSalePercentage","type":"uint256"},{"internalType":"uint256","name":"_artistSecondSalePercentage","type":"uint256"}],"name":"updateRoyaltyPercentages","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"controlTokenId","type":"uint256"},{"internalType":"string","name":"controlTokenURI","type":"string"},{"internalType":"int256[]","name":"leverMinValues","type":"int256[]"},{"internalType":"int256[]","name":"leverMaxValues","type":"int256[]"},{"internalType":"int256[]","name":"leverStartValues","type":"int256[]"},{"internalType":"address payable[]","name":"additionalCollaborators","type":"address[]"}],"name":"setupControlToken","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"artworkTokenId","type":"uint256"},{"internalType":"string","name":"artworkTokenURI","type":"string"},{"internalType":"address payable[]","name":"controlTokenArtists","type":"address[]"}],"name":"mintArtwork","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"bid","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"withdrawBid","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"takeBuyPrice","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"acceptBid","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"makeBuyPrice","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"controlTokenId","type":"uint256"}],"name":"getControlToken","outputs":[{"internalType":"int256[]","name":"","type":"int256[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"permissioned","type":"address"}],"name":"grantControlPermission","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"controlTokenId","type":"uint256"},{"internalType":"uint256[]","name":"leverIds","type":"uint256[]"},{"internalType":"int256[]","name":"newValues","type":"int256[]"}],"name":"useControlToken","outputs":[],"payable":true,"stateMutability":"payable","type":"function"}]

class Tokens {
  constructor({contract, blockNum, cache}) {
    this.contract = contract;
    this.blockNum = blockNum;
    this.cache = cache || {};
  }

  async getControlToken(tokenId) {
    if (!this.cache[tokenId]) {
      if (this.blockNum >= 0) {
        this.cache[tokenId] = await this.contract.getControlToken(tokenId, {blockTag : this.blockNum});
      } else {
        this.cache[tokenId] = await this.contract.getControlToken(tokenId);
      }
    }
    return this.cache[tokenId];
  }
};

async function renderLocal(layoutFilePath, tokenFilePath, options) {
  const connector = require('./connectors/read_local_image_buffer');
  const layout = JSON.parse(fs.readFileSync(layoutFilePath)).layout;
  const tokens = new Tokens({cache: JSON.parse(fs.readFileSync(tokenFilePath))});
  return await render(connector, layout, tokens, 0, options);
}

async function renderFromChain(providerUrl, tokenAddress, tokenId, options) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  const contract = new ethers.Contract(tokenAddress, CONTRACT_ABI, provider);
  const tokenURI = await contract.tokenURI(tokenId);
  const connector = require('./connectors/google_cloud_buffer');
  const layout = JSON.parse((await connector.loadFromURI(tokenURI)).toString()).layout;
  const tokens = new Tokens({contract, blockNum: options.blockNum});
  return await render(connector, layout, tokens, tokenId, options);
}

async function render(connector, layout, tokens, tokenId, options) {
  /// set up the appropriate renderer and buffer connector
  const renderer = require(`./${layout.type}/v${layout.version}`);
  /// render the image
  const image = await renderer.render(connector, layout, tokens, tokenId);
  /// stamp the metadata
  if (options.stampDebug) {
    await stampBlockNumber(image, options.blockNum);
  }
  /// save to local file if specified
  if (options.outputFilePath) {
    image.write(options.outputFilePath);
  }
  return image
}

async function stampBlockNumber(image, blockNum) {
  var stampWidth = 350;
  var stampHeight = 50;

  var stampX = image.bitmap.width - stampWidth;
  var stampY = image.bitmap.height - stampHeight;

  await image.scan(stampX, stampY, stampWidth, stampHeight, function (x, y, offset) {
    var color = Jimp.rgbaToInt(255, 255, 255, 255);

    image.setPixelColor(color, x, y)
  });

  // load a font
  var font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

  // print the block number
  image.print(font, stampX + 25, stampY + 9, "Block #" + blockNum);
}

module.exports = {
  renderLocal,
  renderFromChain,
};
