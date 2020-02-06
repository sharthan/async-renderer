const renderer = require("./render.js")
var ethers = require("ethers");

// enforce that a file and token address was provided
if (process.argv.length < 4) {
	console.log("Please use format 'node render.js [tokenAddress] [tokenID]'")
	return
}

// get the token address from the 4th argument
var tokenAddress = process.argv[2];
var tokenId = process.argv[3]
console.log("Using tokenId = " + tokenId);

var blockNum = -1;
if (process.argv.length > 4) {
	blockNum = process.argv[4]	
}
console.log("Using block = " + blockNum)

async function main() {
	// ie "https://rinkeby.infura.io/v3/xxx"
	const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);

	var finalImageData = await renderer.process(provider, tokenAddress, tokenId, blockNum, process.env.STAMP_DEBUG);

	// determine the render path
	var path = "renders/token-" + tokenId + "_block-" + finalImageData.blockNum + ".png";
	// output to console
	console.log("Writing to " + path + "...");
	// write the final artwork
	finalImageData.image.write(path);
	// output to console
	console.log("Wrote to " + path + ".");
}

main();