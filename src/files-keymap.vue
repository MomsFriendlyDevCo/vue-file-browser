<script>
/**
* Keyboard mapping component
*
* @property {Object} keyMap Map of keys to functions. Each object key is in the format `[shift+][ctrl+][alt+]<key>`
*/

export default {
	inject: ['filesCore'],
	props: {
		keyMap: {
			type: Object,
			default: ()=> ({
				'enter'() { this.filesCore.fileInteract() },
				'f'() { this.filesCore.fileInteract() },
				'space'() { this.filesCore.fileInteract() },

				'a'() { this.filesCore.fileSelect('prev') },
				'left'() { this.filesCore.fileSelect('prev') },
				's'() { this.filesCore.fileSelect('next') },
				'right'() { this.filesCore.fileSelect('next') },
				'z'() { this.filesCore.fileSelect('first') },
				'x'() { this.filesCore.fileSelect('last') },

				'ctrl+a'() { this.filesCore.fileSelect('all') },
				'ctrl+z'() { this.filesCore.fileSelect('none') },

				'alt+h'() { this.filesCore.pathChange('root') },
				'alt+a'() { this.filesCore.pathChange('prev') },
				'alt+s'() { this.filesCore.pathChange('next') },
				'alt+z'() { this.filesCore.pathChange('in') },
				'alt+x'() { this.filesCore.pathChange('out') },
				'alt+arrowup'() { this.filesCore.pathChange('prev') },
				'alt+arrowdown'() { this.filesCore.pathChange('next') },
				'alt+arrowleft'() { this.filesCore.pathChange('out') },
				'alt+arrowright'() { this.filesCore.pathChange('out') },

				't'() { this.filesCore.fileSort('random') },
				'shift+t'() { this.filesCore.fileSort('name') },
			}),
		},
	},
	methods: {
		eventKeypress(e) {
			let key = [
				e.shiftKey && 'shift',
				e.ctrlKey && 'ctrl',
				e.altKey && 'alt',
				e.key,
			].filter(Boolean).join('+').toLowerCase();

			// Uncomment the following line for debugging data
			// this.filesCore.debug('Key', key);

			if (this.keyMap[key]) { // We have a mapping
				e.preventDefault();
				e.stopPropagation();
				return this.keyMap[key].call(this);
			}
		},
	},
	mounted() {
		document.body.addEventListener('keyup', this.eventKeypress);
	},
	beforeUnmount() {
		document.body.removeEventListener('keyup', this.eventKeypress);
	},
}
</script>

<template>
	<div/>
</template>
