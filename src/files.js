/**
* Core file browser backend
*/

import fs, {constants as fsConstants} from 'node:fs/promises';
import fsPath from 'node:path';
import {globby} from 'globby';
import micromatch from 'micromatch';
import {dirName} from '@momsfriendlydevco/es6';

const __dirname = dirName();

// Utility functions - constrainPath() {{{
/**
* Return a relative path from an absolute path, constrained to the given root path
* If the result is not present within the root path this function will throw
*
* @param {String} root Allowed root path to resolve to
* @param {String} path Relative path to constrain
*
* @returns {String} The relative path within the root path after checking
*/
const constrainPath = function(root, path) {
	let absPath = fsPath.join(fsPath.resolve(root), path);
	if (!absPath.startsWith(root)) throw new Error('Invalid path');
	return absPath.substr(root.length + 1);
}
// }}}

/**
* Inject an Express compatible backend
*
* @param {Object} options Options to mutate beahviour
* @param {Boolean} [options.devMode=true] Whether to conduct extra tests when booting, defaults to `NODE_ENV!='production'`
* @param {ExpressApp} options.app Express App compatble object to decorate
* @param {String} options.rootPath Absolute root path to load files from
* @param {String} options.thumbs Absolute path to load thumbnails from (or generate new thumbnails if enabled)
* @param {String|Array<String>} [options.glob] Glob of files to show, defaults to all image files
* @param {String} [options.meta='.gander.json'] Additional file to store file meta data, must be included in the `options.glob` expression
*/
export default function (options) {
	let settings = {
		devMode: process.env.NODE_ENV != 'production',
		app: null,
		rootPath: null,
		thumbsPath: null,
		glob: ['**/*.{gif,jpg,jpeg,png,webp}', '**/.gander.json'],
		meta: '.gander.json',
		pathPrefix: '/api/files',
		pathThumb: file => `/api/files/${file}/thumb`,
		pathThumbDir: file => '/api/files/-dir/thumb',
		...options,
	};

	// Perform extrac sanity checks when in dev mode
	if (settings.devMode) {
		if (!settings.app) throw new Error('FileBrowser(options) requires an Express "app" setting');
		if (!settings.rootPath || !settings.thumbsPath) throw new Error('FileBrowser(options) requires both a "rootPath" + "thumbsRoot"');
		if (!fsPath.isAbsolute(settings.rootPath) || !fsPath.isAbsolute(settings.thumbsPath))  throw new Error('FileBrowser(options) both "rootPath" + "thumbsPath" must be absolute paths');
	}


	/**
	* @define File
	* @description A File entity returned by the endpoint
	*
	* @property {String} path Unique full path (relative to root) for the file
	* @property {String} name The display name of the file, usually the basename
	* @property {Object} type Attributes of the file
	* @property {Boolean} type.dir Whether the file is a directory
	* @property {Boolean} type.link Whether the file is a symbolic link
	* @property {Boolean} type.star Whether the file has the star embled (determined from meta data)
	* @property {Number} size The size, in bytes, of the file
	* @property {String<Date>} ctime The ISO date of the creation time of the file
	* @property {String<Date>} mtime The ISO date of the last modification time of the file
	* @property {String} thumbPath Thumbnail path for the file - or static asset thumbnail
	*/

	// List - GET /api/files?paths[]=... {{{
	/**
	* List all files against an endpoint
	*
	* @param {Array<String>} req.query.paths Paths to scan, files ending in '@' are deep scanned
	* @param {Boolean} req.query.dir Only return directories
	*
	* @returns {Array<Files>} A collapsed array of found files
	*/
	settings.app.get(settings.pathPrefix, (req, res) => {
		if (!req.query.paths) throw new Error('No query "paths" specified');

		return Promise.resolve()
			.then(()=> {
				let pathsTop = req.query.paths
					.filter(p => p == '/' || !p.endsWith('/'))
					.map(p => fsPath.join(settings.rootPath, p == '/' ? '.' : p), settings.glob);

				let pathsDeep = req.query.paths
					.filter(p => p != '/' && p.endsWith('/'))
					.map(p => fsPath.join(settings.rootPath, p == '/' ? '.' : p), settings.glob);

				let globbyOptions = {
					cwd: settings.rootPath,
					dot: true, // Needed to include meta files
					followSymbolicLinks: true,
					stats: true,
					unique: true,
					...(req.query.dirs
						? {
							onlyDirectories: true,
						}
						: {
							onlyFiles: false,
						}
					),
				};

				return Promise.all([
					pathsTop.length > 0
						? globby(pathsTop, {...globbyOptions, deep: 0})
						: [],
					pathsDeep.length > 0
						? globby(pathsDeep, {...globbyOptions, deep: Infinity})
						: [],
				])
				.then((...files) => files.flat(2))
			})
			.then(files => files.reduce((buckets, file) => {
				// Extract meta paths as a lookup object per dir
				if (settings.meta !== false && fsPath.basename(file.name) == settings.meta) {
					buckets.metaFilesByDir[fsPath.dirname(file.path)] = file;
				} else { // Dump regular files into a files array
					let filePathRelative = fsPath.relative(settings.rootPath, file.path);
					let isDir = file.stats.isDirectory();
					buckets.filesByPath[file.path] = {
						path: filePathRelative,
						name: file.name,
						type: {
							dir: isDir,
							link: file.stats.isSymbolicLink(),
						},
						size: file.stats.size,
						mtime: file.stats.mtime,
						ctime: file.stats.ctime,
						thumbPath: isDir
							? settings.pathThumbDir(filePathRelative)
							: settings.pathThumb(filePathRelative),
					};
				}
				return buckets;
			}, {
				filesByPath: {},
				metaFilesByDir: {},
			}))
			.then(({filesByPath, metaFilesByDir}) =>
				Promise.all(Object.entries(metaFilesByDir)
					.map(([dirPath, metaFile]) => fs.readFile(fsPath.join(metaFile.path))
						.then(content => JSON.parse(content))
						.then(metaContent => Object.entries(metaContent)
							.forEach(([basename, meta]) => {
								let path = fsPath.join(dirPath, basename);
								if (!filesByPath[path]) return console.log(`Ignoring non-existant path "${path}" for meta inject`);

								// Process meta data {{{
								if (meta.emblems.some(i => i == 'star')) filesByPath[path].type.star = true;
								// }}}
							})
						)
						.catch(e => {
							console.warn(`Unable to parse meta information file "${metaFile.path}" - ${e.toString()}`);
						})
					)
				)
				.then(()=> Object.values(filesByPath)) // Collapse files back into an array
			)
			.then(files => res.send(files))
			.catch(res.sendError)
	});
	// }}}

	// Serve meta thumbnails - GET /api/files/-:meta/thumb {{{
	settings.app.get(`${settings.pathPrefix}/-:meta/thumb`, (req, res) => {
		res.sendFile(`${req.params.meta}.png`, {
			root: fsPath.join(__dirname, 'assets'),
		});
	});
	// }}}

	// Serve thumbnail - GET /api/files/:path/thumb {{{
	settings.app.get(new RegExp(`^${settings.pathPrefix}(.+)\/thumb$`), (req, res) => {
		req.params = {path: req.params[0]}; // Unpack RegExp into a regular object
		let thumbRelativePath = constrainPath(settings.thumbsPath, req.params.path);

		return Promise.resolve()
			// Sanity checks {{{
			.then(()=> {
				if (!micromatch.isMatch(thumbRelativePath, settings.glob)) throw new Error('File path is not in the allowed file list');
			})
			// }}}
			.then(()=> fs.access(fsPath.join(settings.thumbsPath, thumbRelativePath), fsConstants.R_OK)
				.then(()=> true)
				.catch(() => false)
			)
			.then(thumbExists => {
				if (thumbExists) {
					res.sendFile(thumbRelativePath, {
						root: settings.thumbsPath,
					});
				} else {
					throw new Error(`400: Thumbnail gen for "${thumbRelativePath}" not yet supported`);
				}
			})
			.catch(res.sendError)
	});
	// }}}

	// Serve file - GET /api/files/:path {{{
	settings.app.get(new RegExp(`^${settings.pathPrefix}\/(.+)$`), (req, res) => {
		req.params = {path: req.params[0]}; // Unpack RegExp into a regular object
		let fileRelativePath = constrainPath(settings.rootPath, req.params.path);

		return Promise.resolve()
			// Sanity checks {{{
			.then(()=> {
				if (!micromatch.isMatch(fileRelativePath, settings.glob)) throw new Error('File path is not a valid servable file');
			})
			// }}}
			.then(()=> res.sendFile(fileRelativePath, {
				root: settings.rootPath,
			}))
			.catch(res.sendError)
	});
	// }}}

}
