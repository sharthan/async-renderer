'use strict'

const ethers = require("ethers");
const fs = require('fs');
const Jimp = require('jimp');
const util = require('util');

const CONTRACT_ABI = [{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"controlTokenMapping","outputs":[{"internalType":"uint256","name":"numControlLevers","type":"uint256"},{"internalType":"int256","name":"numRemainingUpdates","type":"int256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"bool","name":"isSetup","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"controlTokenId","type":"uint256"}],"name":"getControlToken","outputs":[{"internalType":"int256[]","name":"","type":"int256[]"}],"payable":false,"stateMutability":"view","type":"function"}]

class Tokens {
  constructor({contract, fallbackContract, blockNum, cache}) {
    this.contract = contract;
    this.fallbackContract = fallbackContract;
    this.blockNum = blockNum;
    this.cache = cache || {};
  }

  async getControlToken(tokenId) {
    if (!this.cache[tokenId]) {
      let controlToken;

      // check if control token exists in primary contract
      let controlTokenMapping = await this.contract.controlTokenMapping(tokenId);

      if (controlTokenMapping.exists) {
        if (this.blockNum >= 0) {
          controlToken = await this.contract.getControlToken(tokenId, {blockTag : this.blockNum}).catch((err) => {});
        } else {
          controlToken = await this.contract.getControlToken(tokenId).catch((err) => {});
        }
      } else {
        // else if doesn't exist then token wasn't upgraded, use fallback instead
        console.log("Using fallback contract for " + tokenId);
        if (this.blockNum >= 0) {
          controlToken = await this.fallbackContract.getControlToken(tokenId, {blockTag : this.blockNum});
        } else {
          controlToken = await this.fallbackContract.getControlToken(tokenId);
        }
      }

      this.cache[tokenId] = controlToken;
    }
    return this.cache[tokenId];
  }
};

async function renderLocal(providerUrl, layoutFilePath, tokenFilePath, options) {
  const connector = require('./connectors/read_local_image_buffer');
  const layout = JSON.parse(fs.readFileSync(layoutFilePath)).layout;
  const tokens = new Tokens({cache: JSON.parse(fs.readFileSync(tokenFilePath))});

  // grab current block number 
  if (util.isUndefined(options.blockNum)) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    options.blockNum = await provider.getBlockNumber();
  }  
  return await render(connector, layout, tokens, 0, options);
}

async function renderFromChain(providerUrl, tokenAddress, fallbackTokenAddress, tokenId, options) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const network = await provider.getNetwork();
  
  const contract = new ethers.Contract(tokenAddress, CONTRACT_ABI, provider);
  const fallbackContract = new ethers.Contract(fallbackTokenAddress, CONTRACT_ABI, provider);

  // try loading the token URI from the primary contract
  let tokenURI = await contract.tokenURI(tokenId).catch((err) => {});
  // if undefined then token wasn't upgraded, use fallback instead
  if (util.isUndefined(tokenURI)) {
    tokenURI = await fallbackContract.tokenURI(tokenId);
  }

  const connector = require('./connectors/google_cloud_buffer');
  const layout = JSON.parse((await connector.loadFromURI(tokenURI)).toString()).layout;
  const tokens = new Tokens({contract, fallbackContract, blockNum: options.blockNum});
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
