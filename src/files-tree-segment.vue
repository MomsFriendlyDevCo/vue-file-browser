<script>
/**
* A single (possibly recursive) segment of a directory tree
*
* @property {String} path The path to display
*/
export default {
	inject: ['filesCore'],
	data() { return {
		/**
		* Diretory entries within this path
		* @type {Array<File>}
		*/
		dirs: [],
	}},
	props: {
		path: {type: String, required: true},
	},
	methods: {
		/**
		* Fetch the tree srructure for the current path
		*/
		refresh() {
			return this.$http.request({
				url: this.filesCore.endpoints.list,
				params: {
					paths: [this.path],
					dirs: 1,
				},
			})
				.then(({data}) => {
					if (!Array.isArray(data)) throw new Error('Expected an array of files from list endpoint');
					this.dirs = data.map(dir => ({
						...dir,
						state: false,
					}));
				})
		},
	},
	mounted() {
		return this.refresh();
	},
	watch: {
		'filesCore.paths': {
			immediate: true,
			handler() {
				this.dirs = this.dirs.map(dir => ({
					...dir,
					state:
						this.filesCore.path == dir.path ? 'primary'
						: this.filesCore.paths.has(dir.path) ? 'selected'
						: false,
				}));
			},
		},
	},
}
</script>

<template>
	<div
		v-for="dir in dirs"
		:key="dir.path"
		class="dir"
		:class="[
			Object.entries(dir.type)
				.filter(([key, val]) => val)
				.map(([key]) => `dir-type-${key}`),
		]"
		:style="{
			'--dir-thumb-path': `url(${dir.thumbPath})`,
		}"
	>
		<div
			@click="filesCore.pathChange('set', dir.path)"
			@contextmenu.prevent="filesCore.fileContextMenu(dir, {event: $event})"
			class="dir-clickable"
			:class="[
				`dir-state-${dir.state || 'normal'}`,
			]"
		>
			<div class="dir-img"/>
			<div class="dir-name" v-text="dir.name"/>
		</div>
	</div>
</template>
