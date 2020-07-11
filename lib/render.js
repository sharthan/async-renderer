'use strict'

const ethers = require("ethers");
const fs = require('fs');
const Jimp = require('jimp');

const CONTRACT_ABI = [{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"controlTokenId","type":"uint256"}],"name":"getControlToken","outputs":[{"internalType":"int256[]","name":"","type":"int256[]"}],"payable":false,"stateMutability":"view","type":"function"}]

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
