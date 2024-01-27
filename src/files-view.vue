<script>
export default {
	inject: ['filesCore'],
}
</script>

<template>
	<div
		@click="filesCore.fileInteract()"
		class="files-view"
		:style="`--file-path: url('/api/files/${filesCore.activeFile.path}')`"
	>
		<div class="viewer"/>
	</div>
</template>

<style lang="scss">
.files-view {
	width: 100%;
	height: 100%;

	& .viewer {
		background-image: var(--file-path);
		background-repeat: no-repeat;
		background-position: center center;
		background-size: contain;

		width: 100%;
		height: 100%;
	}
}
</style>
