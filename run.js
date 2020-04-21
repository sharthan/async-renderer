const renderer = require("./render.js")
var ethers = require("ethers");

// enforce that a file and token address was provided
if (process.argv.length < 4) {
	console.log("Please use format 'node render.js [tokenAddress] [tokenID]'")
	return
}

// get the token address from the 4th argument
var tokenAddress = process.argv[2];
console.log("Using tokenAddress = " + tokenAddress);

var tokenId = process.argv[3]
console.log("Using tokenId = " + tokenId);

var blockNum = -1;
if (process.argv.length > 4) {
	blockNum = process.argv[4]	
	console.log("Using block = " + blockNum)
}

var outputPath = null;
if (process.argv.length > 5) {
	outputPath = process.argv[5]
	console.log("Using output path = " + outputPath)
}

var tokenURI = null;
if (process.argv.length > 6) {
	tokenURI = process.argv[6];
	console.log("Using tokenURI = " + tokenURI)
}

function parseBool(val) { return val === true || val === "true" }

async function main() {
	// ie "https://rinkeby.infura.io/v3/xxx"
	const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);

	var options = {
		blockNum : blockNum,
		stampDebug : parseBool(process.env.STAMP_DEBUG),
		tokenURI : tokenURI
	}
	
	var finalImageData = await renderer.process(provider, tokenAddress, tokenId, options);

	if (finalImageData.image === null) {
		console.log(finalImageData.error);
	} else {
		// determine the render path
		if (outputPath == null) {
			outputPath = "renders/token-" + tokenId + "_block-" + finalImageData.blockNum + ".jpg";
		}
		// output to console
		console.log("Writing to " + outputPath + "...");
		// write the final artwork
		finalImageData.image.write(outputPath);
		// output to console
		console.log("Wrote to " + outputPath + ".");
	}
}

main();