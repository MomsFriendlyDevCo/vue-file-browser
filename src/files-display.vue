<script>
/**
* File thumbnail display area
*
* @param {Array<File>} files Files to display
*/
export default {
	inject: ['filesCore'],
	props: {
		files: {
			type: Array,
			required: true,
			validator: v => Array.isArray(v) && v.every(i => typeof i == 'object' && i.path),
		},
	},
}
</script>

<template>
	<div class="files-display">
		<div
			v-for="file in files"
			:key="file.path"
			@click="filesCore.fileInteract(file)"
			@contextmenu.prevent="filesCore.fileContextMenu(null, {event: $event})"
			class="file"
			:class="[
				Object.entries(file.type)
					.filter(([key, val]) => val)
					.map(([key]) => `file-type-${key}`),
				`file-state-${file.state || 'normal'}`,
			]"
			:style="`--file-thumb-path: url('${file.thumbPath}')`"
		>
			<div class="file-img"/>
			<div class="file-info">
				<div class="file-name" v-text="file.name"/>
				<div class="file-emblems">
					<i v-if="file.type.star" class="fas fa-star text-warning"/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.files-display {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	padding: 10px;

	.file {
		display: flex;
		flex-direction: column;
		width: var(--file-width);

		overflow: hidden;
		border-radius: 10px;
		cursor: pointer;
		border: 1px solid var(--file-border);

		& .file-img {
			width: var(--file-width);
			height: var(--file-height);
			background-image: var(--file-thumb-path);
			background-repeat: no-repeat;
			background-position: center center;
			background-size: contain;
		}

		& .file-info {
			width: 100%;
			display: flex;

			& .file-name {
				flex-grow: 1;
				text-overflow: ellipsis;
				text-align: center;

			}

			& .file-emblems {
				flex-shrink: 1;
				text-overflow: ellipsis;
				text-align: center;

			}
		}

		/* State {{{ */
		background: var(--file-bg);
		border-color: var(--file-border);
		color: var(--file-text);

		&.file-state-primary {
			background: var(--file-bg-primary);
			border-color: var(--file-border-primary);
			color: var(--file-text-primary);
		}

		&.file-state-selected {
			background: var(--file-bg-selected);
			border-color: var(--file-border-selected);
			color: var(--file-text-selected);
		}

		&:hover {
			background: var(--file-bg-hover);
			border-color: var(--file-border-hover);
			color: var(--file-text-hover);
		}
		/* }}} */

	}
}
</style>
