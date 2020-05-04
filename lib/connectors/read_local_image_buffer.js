/*
 * Connector for retrieving a file buffer from a local file path.
 */

const fs = require('fs')
const util = require('util');
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)

const URI_PREFIX = process.env.LOCAL_FILE_DIR;

async function loadFromURI(uri) {
	if (util.isNullOrUndefined(URI_PREFIX) == false) {
		uri = URI_PREFIX + uri;
	}

	return await readFileAsync(uri)
}

exports.loadFromURI = loadFromURI