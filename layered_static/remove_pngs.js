/*
 * Connector for retrieving a file buffer from google cloud storage.
 * Define GOOGLE_STORAGE_BUCKET and GOOGLE_STORAGE_PATH in your environment settings.
 */
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

const GOOGLE_STORAGE_BUCKET = process.env.GOOGLE_STORAGE_BUCKET;
const GOOGLE_STORAGE_PATH = process.env.GOOGLE_STORAGE_PATH;


const options = {
  prefix: "ipfs/Qm",
};
var bucket = storage.bucket("async-art-renderer.appspot.com");

bucket.getFiles(options, function(err, files) {
	for (var i = 0; i < files.length; i++) {
		var name = files[i].metadata.name;

		var suffix = ".jpg";

		if (name.endsWith(suffix)) {
			console.log(name);
			var newName = name.slice(0, name.length - suffix.length);
			console.log(newName)
			files[i].move(newName);			
		}		
	}
});