<script>
import FilesTreeSegment from './files-tree-segment.vue';

/**
* File tree display area
*/
export default {
	inject: ['filesCore'],
	components: {
		FilesTreeSegment,
	},
	methods: {
		/**
		* Move around the tree by a relative method
		* This really just suplements the `fileCore.pathChange()` master method but this component knows more about the dir state than that component does
		*
		* @see filesCore.pathChange()
		* @param {String} method Direction to move. ENUM: 'prev', 'next', 'in'
		*/
		treeRelativeMove(method) {
			switch (method) {
				case 'prev':
				case 'next':
				case 'in':
					throw new Error(`FIXME: filesTree.treeRelativeMethod "${method}" - not yet supported`);
				default:
					throw new Error(`Unknown filesTree.treeRelativeMethod "${method}"`);
			}
		},
	},
}
</script>

<template>
	<div class="dir-tree">
		<div
			class="dir dir-type-d"
			:style="{
				'--dir-thumb-path': `url('/api/files/-root/thumb')`,
			}"
		>
			<div
				@click="filesCore.pathChange('root')"
				class="dir-clickable"
				:class="[
					filesCore.path == '/' ? 'dir-state-primary'
					: filesCore.paths.has('/') ? 'dir-state-selected'
					: 'dir-state-normal',
				]"
			>
				<div class="dir-img"/>
				<div class="dir-name" v-text="'/'"/>
			</div>
			<div class="dir-children">
				<files-tree-segment path="/"/>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.dir-tree {
	display: flex;
	flex-direction: column;

	& .dir {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		overflow: hidden;
		width: 100%;
		cursor: pointer;
		border-radius: 3px;

		& .dir-img {
			width: 24px;
			height: 24px;
			margin-left: 5px;
			margin-right: 5px;
			background-image: var(--dir-thumb-path);
			background-repeat: no-repeat;
			background-position: center center;
			background-size: contain;
		}

		& .dir-name {
			text-overflow: ellipsis;
			text-align: left;
			text-wrap: nowrap;
		}

		& .dir-children {
			display: flex;
			flex-wrap: wrap;
			width: 100%;
			padding-left: 20px;
		}

		/* State {{{ */
		& .dir-clickable {
			width: 100%;
			display: flex;

			background: var(--dir-bg);
			border-color: var(--dir-border);
			color: var(--dir-text);

			&:hover {
				background: var(--dir-bg-hover);
				border-color: var(--dir-border-hover);
				color: var(--dir-text-hover);
			}

			&.dir-state-primary {
				background: var(--dir-bg-primary);
				border-color: var(--dir-border-primary);
				color: var(--dir-text-primary);
			}
		}
		/* }}} */
	}
}
</style>
