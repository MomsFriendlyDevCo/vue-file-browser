<script>
/**
* Core file browser frontend Vue component
*/

import {sortBy} from 'lodash-es';
import FilesDisplay from './files-display.vue';
import FilesKeymap from './files-keymap.vue';
import FilesTree from './files-tree.vue';
import FilesView from './files-view.vue';

export default {
	components: {
		FilesDisplay,
		FilesKeymap,
		FilesTree,
		FilesView,
	},
	provide() { return {
		filesCore: this,
	}},
	data() { return {
		/**
		* @define File
		* @description A File entity returned by the endpoint
		*
		* @property {String} path Unique full path (relative to root) for the file
		* @property {String} name The display name of the file, usually the basename
		* @property {String} type Attributes of the file. Can be made up of one or more: ('F'=file || 'D'=dir), 'L'=Link
		* @property {Number} size The size, in bytes, of the file
		* @property {String<Date>} ctime The ISO date of the creation time of the file
		* @property {String<Date>} mtime The ISO date of the last modification time of the file
		* @property {String} thumbPath Thumbnail path for the file - or static asset thumbnail
		*
		* @property {String} state State of the file (frontend-only). ENUM: false, 'selected', 'primary'
		*/


		/**
		* Primary path to display, relative to root
		* @type {String}
		*/
		path: '/',


		/**
		* Active image when in view mode
		* @type {Null|File}
		*/
		activeFile: null,


		/**
		* Currently active view mode
		* ENUM: 'browse', 'view'
		* @type {String}
		*/
		viewMode: 'browse',


		/**
		* Actual display path(s) to display
		* @type {Set<String>}
		*/
		paths: new Set(['/']),


		/**
		* Eventual file list loaded into the view
		* @type {Array<File>}
		*/
		files: [],


		/**
		* Filters applied to the files output
		* @type {Object}
		* @property {Boolean} stars Only show files with a matching star
		*/
		filters: {
			stars: false,
		},


		/**
		* File sort method
		* @type {String}
		*/
		sortMethod: 'name',


		/**
		* Whether to always sort directory entries first
		* @type {Boolean}
		*/
		sortDirsFirst: true,
	}},
	computed: {
		displayFiles() {
			return this.files
				.filter(file => !this.filters.stars || file.type.star)
		},
	},
	props: {
		endpoints: {
			type: Object,
			default: ()=> ({
				list: '/api/files',
			}),
		},
	},
	methods: {

		/**
		* Debug functionality
		* @param {msg...} Messages to display
		*/
		debug(...msg) {
			console.log('[files]', ...msg);
		},


		/**
		* Refresh all resources
		* @returns {Promise}
		*/
		refresh() {
			return this.$http.request({
				url: this.endpoints.list,
				params: {
					paths: Array.from(this.paths),
				},
			})
				.then(({data}) => {
					if (!Array.isArray(data)) throw new Error('Expected an array of files from list endpoint');
					this.files = data.map(file => ({
						...file,
						state: false,
					}));
					this.fileSort();

					this.fileSelect('firstIfNone');
				})
		},


		/**
		* Called when the user interacts with a path
		* @param {String} method How to interpret the request. ENUM: 'set', 'append', 'root', 'up' / 'out'
		* @param {String} path The path operand
		*
		* @returns {Promise}
		*/
		pathChange(method, path) {
			this.debug('pathChange(', method, ',', path, ')');

			switch (method) {
				case 'set':
					this.path = path;
					this.paths = new Set([path]);
					break;
				case 'append':
					this.paths.add(path);
					break;
				case 'root':
					this.path = '/';
					this.paths = new Set([this.path]);
					break;
				case 'out':
				case 'up':
					var pathBits = this.path.split('/');
					if (pathBits.length < 1) break; // Already at top
					this.path = pathBits.slice(0, -1).join('/');
					this.paths = new Set([this.path]);
					break;
				case 'prev':
				case 'next':
				case 'in':
					// Direct queries where we need to know more about the file tree downwards to the filesTree component which knows more about state than we do
					this.$refs.filesTree.treeRelativeMove(method);
					break;
				default:
					throw new Error(`Unknown pathChange method "${method}"`);
			}

			this.debug('Paths changed', {
				path: this.path,
				paths: Array.from(this.paths),
			});

			return this.refresh();
		},


		/**
		* Determine selected files by various criteria
		*
		* @param {Object} [options] Additional options to mutate behaviour
		* @param {Boolean} [options.one=false] Return only the first matching item
		* @param {Boolean} [options.primary=true] Query primary files
		* @param {Boolean} [options.secondary=true] Query secondary-selected files
		* @param {*} [options.fallback=false] Value to return if no files match
		* @param {Boolean} [options.wantIndex=false] Return file indexes rather than the objects
		*
		* @returns {Array<File>|Array<Number>|*} Either an array of files (if `!wantIndex`), an array of matching indexes (if `!!wantIndex`) or the `fallback` value
		*/
		getSelected(options) {
			let settings = {
				one: false,
				primary: true,
				secondary: true,
				fallback: false,
				wantIndex: false,
				...options,
			};

			// Query function to query a file by the settings criteria
			let fQuery = file => {
				return (
					(file.state == 'primary' && settings.primary)
					|| (file.state == 'selected' && settings.secondary)
				);
			};

			let candidates;
			if (settings.one) {
				candidates = this.files[settings.wantIndex ? 'findIndex' : 'find'](fQuery);
				return (
					settings.wantIndex && candidates == -1 ? settings.fallback
					: candidates ?? settings.fallback
				);
			} else {
				candidates = settings.wantIndex
					? this.files.map((file, index) => ({index, ...file}))
					: this.files;

				candidates = candidates.filter(fQuery);

				if (settings.wantIndex) candidates = candidates.map(f => f.index);

				return candidates.length > 0
					? candidates
					: settings.fallback;
			}
		},


		/**
		* Move the file selection based on an input
		*
		* @param {String} [method='first'] ENUM: 'first' / 'firstIfNone', 'last', 'next', 'prev', 'all', 'none'
		*/
		fileSelect(method = 'first') {
			this.debug('fileSelect(', method, ')');

			let primarySelectedIndex;
			switch (method) {
				case 'first':
					this.files.forEach(f => f.state = false);
					if (this.files.length > 0) this.files.at(0).state = 'primary';
					break;
				case 'firstIfNone':
					if (this.files.some(f => f.state !== false)) return;
					return this.fileSelect('first');
				case 'last':
					this.files.forEach(f => f.state = false);
					if (this.files.length > 0) this.files.at(-1).state = 'primary';
					break;
				case 'all':
					this.files.forEach(f => f.state = 'selected');
					if (this.files.length) this.files.at(-1).state = 'primary';
					break;
				case 'none':
					this.files.forEach(f => f.state = false);
					break;
				case 'next':
					primarySelectedIndex = this.getSelected({one: true, wantIndex: true});
					if (primarySelectedIndex === false && this.files.length > 0) primarySelectedIndex = 0; // Nothing selected, assume first
					if (primarySelectedIndex >= this.files.length - 1) return; // Already at last file

					this.files[primarySelectedIndex].state = false;
					this.files[primarySelectedIndex + 1].state = 'primary';
					break;
				case 'prev':
					primarySelectedIndex = this.getSelected({one: true, wantIndex: true});
					if (primarySelectedIndex === false && this.files.length > 0) primarySelectedIndex = this.files.length - 1; // Nothing selected, assume last
					if (primarySelectedIndex === false || primarySelectedIndex == 0) return; // Already at first file

					this.files[primarySelectedIndex].state = false;
					this.files[primarySelectedIndex - 1].state = 'primary';
					break;
				default:
					throw new Error(`Unknown fileSelect method "${method}"`);
			}

			// If in file view mode update the active file
			if (this.viewMode == 'view') {
				let activeFile = this.getSelected({one: true})
				if (activeFile) {
					this.activeFile = activeFile;
				} else {
					this.viewMode = 'browse';
					this.path = null;
				}
			}
		},


		/**
		* Change file sort order
		*
		* @param {String} [method=sortMethod] The method to sort files. ENUM: 'name', 'size', 'ctime', 'mtime', 'random'
		*
		* @param {Object} [options] Additional options to mutate behaviour
		* @param {Boolean} [options.preserveSelected=true] Preserve the selected item as first in the list if the method is 'random'
		*/
		fileSort(method, options) {
			let settings = {
				preserveSelected: true,
				...options,
			};

			this.debug('fileSort(', method, ',', settings, ')');

			this.files = sortBy(this.files, file => [
				this.sortDirsFirst && file.type.dir ? 'A' : 'Z',
				['name', 'size', 'ctime', 'mtime'].includes(this.sortMethod) ? file[this.sortMethod]
				: this.sortMethod == 'random' ?
						settings.preserveSelected && file.state !== false
							? -1
							: Math.random() * 1000000
				: file.name
			]);

			// Remember the sort method
			this.sortMethod = method;
		},


		/**
		* Interact with the currently selected file(s)
		*
		* @param {File} [file] File to interact with, if omitted the current selected file is used
		*/
		fileInteract(file) {
			let interactFile = file || this.getSelected({one: true});
			this.debug('interact(', interactFile, ')');

			if (this.viewMode == 'browse' && !interactFile) {
				return; // Nothing to interact with
			} else if (interactFile.type.dir) {
				this.pathChange('set', interactFile.path);
			} else {
				if (this.viewMode == 'browse') { // Transition browse -> View
					this.files.forEach(f => f.state = f.path == interactFile.path ? 'primary' : false);
					this.activeFile = interactFile;
					this.viewMode = 'view';
				} else { // Transition view -> browse
					this.viewMode = 'browse';
				}
			}
		},


		/**
		* Open a file context menu for the given array of files
		*
		* @param {Array<File>} [files] Files to operate on, if omited all selected files are used
		* @param {Object} [options] Additional options to mutate behaviour
		* @param {Event} [options.event] DOM event to attach behaviour to
		*/
		fileContextMenu(files, options) {
			if (!files) files = this.getSelected();
			if (!files) return; // No files selected - skip

			if (!options.event) throw new Event('FIXME: Calling fillContextMenu() with no options.event is not yet supported');

			this.debug('fileContextMenu(', files, ',', options, ')');

			return this.$menu.open({
				el: options.event.target,
				items: [
					{text: 'Open', iconFIXME: 'fas fa-file', handler: ()=> this.fileInteract()},
					'-',
					{text: 'Refresh', iconFIXME: 'fas fa-sync', handler: ()=> this.refresh()},
				],
			});
		},
	},
	mounted() {
		// Restore path state from query if we have one
		if (this.$route.query.p) {
			let paths = this.$route.query.p.split('|');
			this.path = paths[0];
			this.paths = new Set(paths);
			this.debug('Restoring paths', {
				path: this.path,
				paths: this.paths,
			});
		}

		return this.refresh();
	},
	watch: {
		'paths'() {
			console.log('STATE CHANGE', this.paths);
			this.$router.push({
				query: {
					p: [
						this.path,
						...Array.from((new Set(this.paths)).delete(this.path)),
					].filter(Boolean).join('|'),
				},
			});
		},
	},
}
</script>

<template>
	<div class="files">
		<files-keymap/>
		<div class="panes">
			<div v-show="viewMode == 'browse'" class="pane-tree">
				<files-tree ref="filesTree"/>
			</div>
			<div v-show="viewMode == 'browse'" class="pane-files">
				<files-display :files="displayFiles"/>
			</div>
			<div v-if="viewMode == 'view'" class="pane-view">
				<files-view/>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.files {
	display: flex;
	height: 100%;
	user-select: none;

	/* Browser config {{{ */
	--file-width: 200px;
	--file-height: 200px;
	/* }}} */

	/* Pane arrangement {{{ */
	--panes-margin-bottom: 80px;
	/* }}} */

	/* Color config {{{ */
	/* File browse area {{{ */
	--file-bg: var(--bs-white);
	--file-bg-hover: var(--bs-secondary);
	--file-bg-primary: var(--bs-primary);
	--file-bg-selected: var(--bs-info);

	--file-border: var(--bs-primary);
	--file-border-hover: var(--bs-secondary);
	--file-border-primary: var(--bs-primary);
	--file-border-selected: var(--bs-info);

	--file-text: var(--bs-black);
	--file-text-hover: var(--bs-white);
	--file-text-primary: var(--bs-white);
	--file-text-selected: var(--bs-white);
	/* }}} */

	/* Directory tree {{{ */
	--dir-bg: transparent;
	--dir-bg-hover: var(--bs-secondary);
	--dir-bg-primary: var(--bs-primary);

	--dir-border: var(--bs-primary);
	--dir-border-hover: var(--bs-secondary);
	--dir-border-primary: var(--bs-primary);

	--dir-text: var(--bs-black);
	--dir-text-hover: var(--bs-white);
	--dir-text-primary: var(--bs-white);
	/* }}} */
	/* }}} */

	/* Panes {{{ */
	& .panes {
		display: flex;
		width: 100%;
		height: calc(100vh - var(--panes-margin-bottom));

		& .pane-tree, & .pane-files {
			height: 100%;
			border: 1px solid #000;
			overflow-y: auto;
			max-height: 100%;
		}

		& .pane-tree {
			flex-grow: 0;
			min-width: 200px;
			width: 200px;
		}

		& .pane-files {
			flex-grow: 1;
		}

		& .pane-view {
			position: fixed;
			left: 0px;
			right: 0px;
			top: 0px;
			bottom: 0px;

			background: #000;
			color: #FFF;
		}
	}
	/* }}} */
}
</style>
